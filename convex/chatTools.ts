// convex/chatTools.ts
/**
 * Chat service layer — the only entry point chat providers (Telegram, WhatsApp)
 * should use to interact with Saldo data.
 *
 * Do NOT call generic UI mutations from the bot directly.
 * Put every chat-triggered finance action through these functions instead.
 *
 * Risk classification (Story 1):
 *   LOW  (read-only):  get_accounts, get_categories, get_balance, list_transactions
 *   MEDIUM (write):    create_transaction, update_transaction
 *   HIGH (destructive): delete_transaction — requires confirmation flow
 *
 * Deletion goes through requestDeleteTransaction → user confirms → executePendingConfirmation.
 */
import { mutation, query } from "./_generated/server";
import { DatabaseReader } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { matchDescription } from "./rulesEngine";

// ─── Constants ────────────────────────────────────────

const CONFIRMATION_TTL_MS = 5 * 60 * 1000;   // 5 minutes
const DEDUP_WINDOW_MS = 60 * 1000;            // 60-second idempotency window
const MAX_DESCRIPTION_LENGTH = 255;

// ─── Standard Response Shape (Story 12) ──────────────────

function ok<T>(
    code: string,
    message: string,
    data: T
): { success: true; code: string; message: string; data: T } {
    return { success: true, code, message, data };
}

function fail(
    code: string,
    message: string
): { success: false; code: string; message: string } {
    return { success: false, code, message };
}

// ─── Ownership Validators (Story 13) ─────────────────────

/**
 * Find an active Telegram connection by telegramUserId and return the
 * linked Saldo userId. Returns null if not found or inactive.
 * Chat actions derive user identity from this — never from raw client input.
 */
async function resolveUserFromTelegram(
    db: DatabaseReader,
    telegramUserId: string
): Promise<Id<"users"> | null> {
    const connections = await db
        .query("telegram_connections")
        .withIndex("by_telegram_user", (q) => q.eq("telegramUserId", telegramUserId))
        .collect();
    return connections.find((c) => c.isActive)?.userId ?? null;
}

/** Returns true only if the account exists and belongs to the given user. */
async function accountBelongsToUser(
    db: DatabaseReader,
    accountId: Id<"accounts">,
    userId: Id<"users">
): Promise<boolean> {
    const account = await db.get(accountId);
    return account !== null && account.userId === userId;
}

/** Returns true only if the category exists and belongs to the given user. */
async function categoryBelongsToUser(
    db: DatabaseReader,
    categoryId: Id<"categories">,
    userId: Id<"users">
): Promise<boolean> {
    const category = await db.get(categoryId);
    return category !== null && category.userId === userId;
}

/** Returns true only if the transaction exists and belongs to the given user. */
async function transactionBelongsToUser(
    db: DatabaseReader,
    transactionId: Id<"transactions">,
    userId: Id<"users">
): Promise<boolean> {
    const tx = await db.get(transactionId);
    return tx !== null && tx.userId === userId;
}

// ─── Story 4: getAccountsForUser ─────────────────────────

export const getAccountsForUser = query({
    args: { telegramUserId: v.string() },
    handler: async (ctx, { telegramUserId }) => {
        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return ok("ACCOUNTS_FETCHED", `Found ${accounts.length} account(s)`, accounts.map((a) => ({
            id: a._id,
            name: a.name,
            bank: a.bank,
            type: a.type,
            balance: a.balance ?? null,
        })));
    },
});

// ─── Story 5: getCategoriesForUser ───────────────────────

export const getCategoriesForUser = query({
    args: { telegramUserId: v.string() },
    handler: async (ctx, { telegramUserId }) => {
        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return ok("CATEGORIES_FETCHED", `Found ${categories.length} category(ies)`, categories.map((c) => ({
            id: c._id,
            name: c.name,
            groupId: c.groupId ?? null,
            transactionType: c.transactionType ?? null,
        })));
    },
});

// ─── Story 6: getBalance ─────────────────────────────────

/**
 * Balance rule:
 *   - Source of truth is accounts.balance (set manually or via CSV import).
 *   - Accounts without a balance field are listed but excluded from the total.
 *   - hasPartialData is true when at least one account has no stored balance.
 *   - Computing balance from transaction history is deferred to a future story.
 */
export const getBalance = query({
    args: { telegramUserId: v.string() },
    handler: async (ctx, { telegramUserId }) => {
        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const accountBalances = accounts.map((a) => ({
            id: a._id,
            name: a.name,
            bank: a.bank,
            balance: a.balance ?? null,
        }));

        const known = accountBalances.filter((a) => a.balance !== null);
        const totalKnownBalance = known.reduce((sum, a) => sum + (a.balance as number), 0);

        return ok("BALANCE_FETCHED", "Balance retrieved", {
            accounts: accountBalances,
            totalKnownBalance,
            hasPartialData: known.length < accountBalances.length,
        });
    },
});

// ─── Story 9: listTransactionsForChat ────────────────────

export const listTransactionsForChat = query({
    args: {
        telegramUserId: v.string(),
        limit: v.number(),                              // required — caller must be explicit
        accountId: v.optional(v.id("accounts")),
        categoryId: v.optional(v.id("categories")),
        startDate: v.optional(v.number()),              // unix timestamp ms
        endDate: v.optional(v.number()),                // unix timestamp ms
    },
    handler: async (ctx, args) => {
        const { telegramUserId, limit, accountId, categoryId, startDate, endDate } = args;

        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        if (accountId) {
            const owned = await accountBelongsToUser(ctx.db, accountId, userId);
            if (!owned) return fail("ACCOUNT_NOT_FOUND", "Account not found or does not belong to this user");
        }

        let q = ctx.db
            .query("transactions")
            .withIndex("by_date")
            .order("desc")
            .filter((row) => row.eq(row.field("userId"), userId));

        if (accountId) {
            q = q.filter((row) => row.eq(row.field("accountId"), accountId));
        }
        if (categoryId) {
            q = q.filter((row) => row.eq(row.field("categoryId"), categoryId));
        }
        if (startDate !== undefined) {
            q = q.filter((row) => row.gte(row.field("date"), startDate));
        }
        if (endDate !== undefined) {
            q = q.filter((row) => row.lte(row.field("date"), endDate));
        }

        const cap = Math.min(limit, 50);
        const results = await q.take(cap);

        return ok("TRANSACTIONS_FETCHED", `Found ${results.length} transaction(s)`, results.map((t) => ({
            id: t._id,
            date: t.date,
            amount: t.amount,
            description: t.description,
            accountId: t.accountId,
            categoryId: t.categoryId ?? null,
            transactionType: t.transactionType ?? null,
        })));
    },
});

// ─── Story 7 + 8: createTransactionFromChat ──────────────

/**
 * Account selection strategy:
 *   - accountId provided → validate ownership, use it
 *   - not provided + 0 accounts → fail NO_ACCOUNTS
 *   - not provided + 1 account → use it automatically
 *   - not provided + N accounts → check smart default (lastAccountId), else fail ACCOUNT_REQUIRED
 *
 * Also:
 *   - Auto-categorizes via rules engine if no categoryId given (Story 6)
 *   - Saves account as smart default for next time (Story 5)
 *   - Updates chat_context for correction flow (Story 13)
 *   - Returns weekly category spending for proactive insights (Story 7)
 */
export const createTransactionFromChat = mutation({
    args: {
        telegramUserId: v.string(),
        telegramChatId: v.optional(v.string()),
        accountId: v.optional(v.id("accounts")),
        amount: v.number(),
        date: v.number(),                               // unix timestamp ms
        description: v.string(),
        transactionType: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        sourceTelegramMessageId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const {
            telegramUserId,
            telegramChatId,
            amount,
            date,
            description,
            transactionType,
            sourceTelegramMessageId,
        } = args;
        let { categoryId } = args;

        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        // ── Validate description (Story 5) ────────────────
        if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
            return fail("INVALID_DESCRIPTION", `Description too long (max ${MAX_DESCRIPTION_LENGTH} characters).`);
        }

        // ── Resolve account ────────────────────────────────
        let resolvedAccountId: Id<"accounts">;

        if (args.accountId) {
            const owned = await accountBelongsToUser(ctx.db, args.accountId, userId);
            if (!owned) return fail("ACCOUNT_NOT_FOUND", "Account not found or does not belong to this user");
            resolvedAccountId = args.accountId;
        } else {
            const accounts = await ctx.db
                .query("accounts")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();

            if (accounts.length === 0) {
                return fail("NO_ACCOUNTS", "No accounts found. Add an account in the Saldo app first.");
            }

            if (accounts.length === 1) {
                resolvedAccountId = accounts[0]._id;
            } else {
                // Story 5: try smart default (last used account)
                const prefs = await ctx.db
                    .query("user_preferences")
                    .withIndex("by_user", (q) => q.eq("userId", userId))
                    .first();

                const preferred = prefs?.lastAccountId
                    ? accounts.find((a) => a._id === prefs.lastAccountId)
                    : null;

                if (preferred) {
                    resolvedAccountId = preferred._id;
                } else {
                    const names = accounts.map((a) => a.name).join(", ");
                    return fail("ACCOUNT_REQUIRED", `You have multiple accounts (${names}). Say which one, e.g. "to Checking".`);
                }
            }
        }

        // ── Validate category ownership ────────────────────
        if (categoryId) {
            const owned = await categoryBelongsToUser(ctx.db, categoryId, userId);
            if (!owned) return fail("CATEGORY_NOT_FOUND", "Category not found or does not belong to this user");
        }

        // ── Story 6: Auto-categorize via rules engine ──────
        if (!categoryId) {
            const rules = await ctx.db
                .query("category_rules")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();
            categoryId = matchDescription(description, rules) ?? undefined;
        }

        // ── Idempotency guard (Story 3, Epic 7) ───────────
        const since = Date.now() - DEDUP_WINDOW_MS;
        const duplicate = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.and(
                    q.gte(q.field("createdAt"), since),
                    q.eq(q.field("amount"), amount),
                    q.eq(q.field("description"), description.trim())
                )
            )
            .first();

        if (duplicate) {
            return fail(
                "DUPLICATE_TRANSACTION",
                "This looks like a duplicate — the same transaction was already logged. Check /recent to confirm."
            );
        }

        // ── Insert transaction ─────────────────────────────
        const transactionId = await ctx.db.insert("transactions", {
            userId,
            accountId: resolvedAccountId,
            amount,
            date,
            description: description.trim(),
            transactionType,
            categoryId,
            isAutoCategorized: !!categoryId,
            createdAt: Date.now(),
        });

        // ── Story 5: Save last account as smart default ────
        const existingPrefs = await ctx.db
            .query("user_preferences")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();
        if (existingPrefs) {
            await ctx.db.patch(existingPrefs._id, { lastAccountId: resolvedAccountId, updatedAt: Date.now() });
        } else {
            await ctx.db.insert("user_preferences", { userId, lastAccountId: resolvedAccountId, updatedAt: Date.now() });
        }

        // ── Story 13/14: Update chat context for corrections ──
        if (telegramChatId) {
            const existing = await ctx.db
                .query("chat_context")
                .withIndex("by_chat", (q) => q.eq("telegramChatId", telegramChatId))
                .first();
            const ctxData = {
                userId,
                lastTransactionId: transactionId,
                lastTransactionAmount: amount,
                lastTransactionDescription: description.trim(),
                updatedAt: Date.now(),
            };
            if (existing) {
                await ctx.db.patch(existing._id, ctxData);
            } else {
                await ctx.db.insert("chat_context", { telegramChatId, ...ctxData });
            }
        }

        // ── Story 7: Compute weekly category spend for insights ──
        let weeklyInsight: { categoryName: string; weeklyTotal: number; count: number } | null = null;
        if (categoryId && amount < 0) {
            const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const weeklyTxs = await ctx.db
                .query("transactions")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) =>
                    q.and(
                        q.gte(q.field("date"), weekStart),
                        q.eq(q.field("categoryId"), categoryId!),
                        q.lt(q.field("amount"), 0)
                    )
                )
                .collect();

            if (weeklyTxs.length >= 3) {
                const weeklyTotal = weeklyTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
                const cat = await ctx.db.get(categoryId);
                if (cat) {
                    weeklyInsight = { categoryName: cat.name, weeklyTotal, count: weeklyTxs.length };
                }
            }
        }

        // ── Audit trail ────────────────────────────────────
        await ctx.db.insert("actions", {
            userId,
            channel: "telegram",
            actionType: "create_transaction",
            status: "completed",
            inputJson: { telegramUserId, amount, date, description, transactionType, categoryId, sourceTelegramMessageId },
            resultJson: { transactionId },
            createdAt: Date.now(),
            completedAt: Date.now(),
        });

        return ok("TRANSACTION_CREATED", "Transaction created successfully", {
            transactionId,
            resolvedAccountId,
            categoryId: categoryId ?? null,
            weeklyInsight,
        });
    },
});

// ─── Story 10: updateTransactionFromChat ─────────────────

/**
 * Chat-scoped editable fields: description, categoryId, transactionType.
 * Amount and date edits are deferred to reduce risk of unintended changes.
 */
export const updateTransactionFromChat = mutation({
    args: {
        telegramUserId: v.string(),
        transactionId: v.id("transactions"),
        updates: v.object({
            description: v.optional(v.string()),
            categoryId: v.optional(v.id("categories")),
            transactionType: v.optional(v.string()),
        }),
        sourceTelegramMessageId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { telegramUserId, transactionId, updates, sourceTelegramMessageId } = args;

        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const txOwned = await transactionBelongsToUser(ctx.db, transactionId, userId);
        if (!txOwned) return fail("TRANSACTION_NOT_FOUND", "Transaction not found or does not belong to this user");

        if (updates.categoryId) {
            const catOwned = await categoryBelongsToUser(ctx.db, updates.categoryId, userId);
            if (!catOwned) return fail("CATEGORY_NOT_FOUND", "Category not found or does not belong to this user");
        }

        const patch: Record<string, unknown> = { updatedAt: Date.now() };
        if (updates.description !== undefined) patch.description = updates.description;
        if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId;
        if (updates.transactionType !== undefined) patch.transactionType = updates.transactionType;

        await ctx.db.patch(transactionId, patch);

        // Audit trail (Story 14)
        await ctx.db.insert("actions", {
            userId,
            channel: "telegram",
            actionType: "update_transaction",
            status: "completed",
            inputJson: {
                telegramUserId,
                transactionId,
                updates,
                sourceTelegramMessageId,
            },
            resultJson: { transactionId },
            createdAt: Date.now(),
            completedAt: Date.now(),
        });

        return ok("TRANSACTION_UPDATED", "Transaction updated successfully", { transactionId });
    },
});

// ─── Epic 8: Monthly summary ──────────────────────────────

/**
 * Aggregate the current calendar month's transactions for the /summary command.
 * Returns income, expenses, net, top category, and transaction count.
 */
export const getSummaryForChat = query({
    args: { telegramUserId: v.string() },
    handler: async (ctx, { telegramUserId }) => {
        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.gte(q.field("date"), startOfMonth))
            .collect();

        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryTotals = new Map<string, number>();

        for (const tx of transactions) {
            if (tx.amount > 0) totalIncome += tx.amount;
            else totalExpenses += Math.abs(tx.amount);
            if (tx.categoryId) {
                const key = String(tx.categoryId);
                categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + Math.abs(tx.amount));
            }
        }

        // Find top category by total spend
        let topCategory: { name: string; amount: number } | null = null;
        let maxAmount = 0;
        for (const [catId, amount] of categoryTotals) {
            if (amount > maxAmount) {
                maxAmount = amount;
                const cat = await ctx.db.get(catId as Id<"categories">);
                if (cat) topCategory = { name: cat.name, amount };
            }
        }

        const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

        return ok("SUMMARY_FETCHED", "Summary retrieved", {
            month: monthLabel,
            totalIncome,
            totalExpenses,
            net: totalIncome - totalExpenses,
            transactionCount: transactions.length,
            topCategory,
        });
    },
});

// ─── Epic 8: Correction flow — update last transaction ─────

/**
 * Update the most recently created transaction for this chat.
 * Called when user says "actually X" or "I meant Y".
 * Preserves original sign (expense stays negative, income stays positive).
 */
export const updateLastTransaction = mutation({
    args: {
        telegramUserId: v.string(),
        telegramChatId: v.string(),
        newAmount: v.optional(v.number()),         // always positive — sign inferred from original
        newDescription: v.optional(v.string()),
    },
    handler: async (ctx, { telegramUserId, telegramChatId, newAmount, newDescription }) => {
        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const context = await ctx.db
            .query("chat_context")
            .withIndex("by_chat", (q) => q.eq("telegramChatId", telegramChatId))
            .first();

        if (!context?.lastTransactionId) {
            return fail("NO_LAST_TRANSACTION", "No recent transaction to update. Log a transaction first.");
        }

        const tx = await ctx.db.get(context.lastTransactionId);
        if (!tx || tx.userId !== userId) {
            return fail("TRANSACTION_NOT_FOUND", "Last transaction not found.");
        }

        const patch: Record<string, unknown> = { updatedAt: Date.now() };
        if (newAmount !== undefined) {
            // Preserve original direction (expense=negative, income=positive)
            const sign = tx.amount < 0 ? -1 : 1;
            patch.amount = sign * Math.abs(newAmount);
        }
        if (newDescription !== undefined) patch.description = newDescription.trim();

        await ctx.db.patch(context.lastTransactionId, patch);

        // Keep chat context in sync
        await ctx.db.patch(context._id, {
            lastTransactionAmount: (patch.amount as number | undefined) ?? tx.amount,
            lastTransactionDescription: (patch.description as string | undefined) ?? tx.description,
            updatedAt: Date.now(),
        });

        await ctx.db.insert("actions", {
            userId,
            channel: "telegram",
            actionType: "update_last_transaction",
            status: "completed",
            inputJson: { telegramUserId, transactionId: context.lastTransactionId, newAmount, newDescription },
            resultJson: { updated: true },
            createdAt: Date.now(),
            completedAt: Date.now(),
        });

        return ok("TRANSACTION_UPDATED", "Transaction updated", {
            transactionId: context.lastTransactionId,
            amount: (patch.amount as number | undefined) ?? tx.amount,
            description: (patch.description as string | undefined) ?? tx.description,
        });
    },
});

// ─── Story 2: Delete confirmation flow ───────────────────
//
// Deletion is HIGH-RISK and requires explicit confirmation.
// Flow: requestDeleteTransaction → bot asks "yes/no" → executePendingConfirmation

/**
 * Step 1: Validate ownership, store a pending confirmation, return a prompt.
 * The actual delete only happens after the user replies "yes".
 */
export const requestDeleteTransaction = mutation({
    args: {
        telegramUserId: v.string(),
        telegramChatId: v.string(),
        transactionId: v.id("transactions"),
    },
    handler: async (ctx, { telegramUserId, telegramChatId, transactionId }) => {
        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const owned = await transactionBelongsToUser(ctx.db, transactionId, userId);
        if (!owned) return fail("TRANSACTION_NOT_FOUND", "Transaction not found or does not belong to you");

        const tx = await ctx.db.get(transactionId);
        if (!tx) return fail("TRANSACTION_NOT_FOUND", "Transaction not found");

        // Cancel any previous pending confirmation for this chat before creating a new one
        const previous = await ctx.db
            .query("pending_confirmations")
            .withIndex("by_chat_and_status", (q) =>
                q.eq("telegramChatId", telegramChatId).eq("status", "awaiting")
            )
            .first();
        if (previous) {
            await ctx.db.patch(previous._id, { status: "cancelled" });
        }

        const sign = tx.amount < 0 ? "-" : "+";
        const absAmount = Math.abs(tx.amount).toFixed(2);
        const confirmationText =
            `Delete this transaction?\n\n` +
            `${sign}$${absAmount} — ${tx.description}\n` +
            `Date: ${new Date(tx.date).toLocaleDateString()}\n\n` +
            `Reply YES to confirm or NO to cancel. This will expire in 5 minutes.`;

        await ctx.db.insert("pending_confirmations", {
            userId,
            telegramChatId,
            actionType: "delete_transaction",
            payload: { transactionId },
            confirmationText,
            status: "awaiting",
            expiresAt: Date.now() + CONFIRMATION_TTL_MS,
            createdAt: Date.now(),
        });

        // Audit
        await ctx.db.insert("actions", {
            userId,
            channel: "telegram",
            actionType: "request_delete_transaction",
            status: "pending",
            inputJson: { telegramUserId, transactionId },
            createdAt: Date.now(),
        });

        return ok("CONFIRMATION_REQUIRED", confirmationText, { confirmationText });
    },
});

/**
 * Look up the active pending confirmation for a chat.
 * Returns null if none exists or all have expired/been acted on.
 */
export const getActivePendingConfirmation = query({
    args: { telegramChatId: v.string() },
    handler: async (ctx, { telegramChatId }) => {
        const pending = await ctx.db
            .query("pending_confirmations")
            .withIndex("by_chat_and_status", (q) =>
                q.eq("telegramChatId", telegramChatId).eq("status", "awaiting")
            )
            .first();

        if (!pending) return null;

        // Treat expired confirmations as if they don't exist
        if (pending.expiresAt < Date.now()) {
            return null;
        }

        return pending;
    },
});

/**
 * Step 2 (confirm): Execute the pending action and mark it confirmed.
 */
export const executePendingConfirmation = mutation({
    args: {
        telegramUserId: v.string(),
        telegramChatId: v.string(),
    },
    handler: async (ctx, { telegramUserId, telegramChatId }) => {
        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const pending = await ctx.db
            .query("pending_confirmations")
            .withIndex("by_chat_and_status", (q) =>
                q.eq("telegramChatId", telegramChatId).eq("status", "awaiting")
            )
            .first();

        if (!pending) return fail("NO_PENDING_ACTION", "No action awaiting confirmation.");
        if (pending.expiresAt < Date.now()) {
            await ctx.db.patch(pending._id, { status: "expired" });
            return fail("CONFIRMATION_EXPIRED", "The confirmation window expired. Please try again.");
        }
        if (pending.userId !== userId) {
            return fail("UNAUTHORIZED", "This confirmation does not belong to you.");
        }

        let resultMessage = "Done.";

        if (pending.actionType === "delete_transaction") {
            const { transactionId } = pending.payload as { transactionId: Id<"transactions"> };
            const tx = await ctx.db.get(transactionId);

            if (!tx || tx.userId !== userId) {
                await ctx.db.patch(pending._id, { status: "cancelled" });
                return fail("TRANSACTION_NOT_FOUND", "Transaction no longer exists.");
            }

            const sign = tx.amount < 0 ? "-" : "+";
            const absAmount = Math.abs(tx.amount).toFixed(2);
            await ctx.db.delete(transactionId);

            // Audit
            await ctx.db.insert("actions", {
                userId,
                channel: "telegram",
                actionType: "delete_transaction",
                status: "completed",
                inputJson: { telegramUserId, transactionId },
                resultJson: { deleted: true, amount: tx.amount, description: tx.description },
                createdAt: Date.now(),
                completedAt: Date.now(),
            });

            resultMessage = `Deleted: ${sign}$${absAmount} — ${tx.description}`;
        }

        await ctx.db.patch(pending._id, { status: "confirmed" });

        return ok("ACTION_CONFIRMED", resultMessage, { resultMessage });
    },
});

/**
 * Step 2 (cancel): Discard the pending action.
 */
export const cancelPendingConfirmation = mutation({
    args: {
        telegramUserId: v.string(),
        telegramChatId: v.string(),
    },
    handler: async (ctx, { telegramUserId, telegramChatId }) => {
        const userId = await resolveUserFromTelegram(ctx.db, telegramUserId);
        if (!userId) return fail("USER_NOT_LINKED", "No active Telegram connection found");

        const pending = await ctx.db
            .query("pending_confirmations")
            .withIndex("by_chat_and_status", (q) =>
                q.eq("telegramChatId", telegramChatId).eq("status", "awaiting")
            )
            .first();

        if (!pending) return ok("NO_PENDING_ACTION", "Nothing to cancel.", {});
        if (pending.userId !== userId) return fail("UNAUTHORIZED", "This confirmation does not belong to you.");

        await ctx.db.patch(pending._id, { status: "cancelled" });
        return ok("ACTION_CANCELLED", "Action cancelled.", {});
    },
});
