// convex/accounts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { updateGoalCompletionStatus } from "./contributions";

// List all accounts for a user, enriched with last import, recent imports, linked goals, and computed balance
export const listAccounts = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const accounts = await ctx.db.query("accounts").withIndex("by_user", q => q.eq("userId", userId)).collect();

        const enriched = await Promise.all(
            accounts.map(async (account) => {
                const [lastImport, recentImports, linkedGoals, transactions] = await Promise.all([
                    ctx.db
                        .query("imports")
                        .withIndex("by_account", q => q.eq("accountId", account._id))
                        .order("desc")
                        .first(),
                    ctx.db
                        .query("imports")
                        .withIndex("by_account", q => q.eq("accountId", account._id))
                        .order("desc")
                        .take(3),
                    ctx.db
                        .query("goals")
                        .withIndex("by_account", q => q.eq("linked_account_id", account._id))
                        .collect(),
                    ctx.db
                        .query("transactions")
                        .withIndex("by_account", q => q.eq("accountId", account._id))
                        .collect(),
                ]);

                const txSum = transactions.reduce((s, t) => s + t.amount, 0);
                const computedBalance = (account.starting_balance ?? 0) + txSum;

                return {
                    ...account,
                    balance: computedBalance,
                    starting_balance: account.starting_balance ?? 0,
                    lastUploadedAt: lastImport?.uploadedAt ?? null,
                    recentImports: recentImports.map(i => ({
                        _id: i._id,
                        fileName: i.fileName,
                        uploadedAt: i.uploadedAt,
                        status: i.status,
                    })),
                    linkedGoals: linkedGoals.map(g => ({
                        _id: g._id,
                        name: g.name,
                        emoji: g.emoji,
                        total_amount: g.total_amount,
                        is_completed: g.is_completed,
                    })),
                };
            })
        );

        return enriched;
    },
});

// Create a new account for a user with an optional starting balance
export const createAccount = mutation({
    args: {
        userId: v.id("users"),
        name: v.string(),
        bank: v.string(),
        number: v.optional(v.string()),
        type: v.string(),
        balance: v.optional(v.number()),          // legacy alias — maps to starting_balance
        starting_balance: v.optional(v.number()),
    },
    handler: async (ctx, { balance, starting_balance, ...rest }) => {
        return await ctx.db.insert("accounts", {
            ...rest,
            starting_balance: starting_balance ?? balance,
            createdAt: new Date().toISOString(),
        });
    },
});

// Update an existing account's details. Use starting_balance to set the manual balance anchor.
export const updateAccount = mutation({
    args: {
        accountId: v.id("accounts"),
        name: v.optional(v.string()),
        bank: v.optional(v.string()),
        number: v.optional(v.string()),
        type: v.optional(v.string()),
        balance: v.optional(v.number()),          // legacy alias — maps to starting_balance
        starting_balance: v.optional(v.number()),
    },
    handler: async (ctx, { accountId, balance, starting_balance, ...rest }) => {
        const updates: Record<string, unknown> = { ...rest };
        const sb = starting_balance ?? balance;
        if (sb !== undefined) updates.starting_balance = sb;
        await ctx.db.patch(accountId, updates);

        // Sync the "Initial account balance" goal contributions for LINKED_ACCOUNT goals
        if (sb !== undefined) {
            const linkedGoals = await ctx.db
                .query("goals")
                .withIndex("by_account", (q: any) => q.eq("linked_account_id", accountId))
                .collect();

            const activeGoals = (linkedGoals as any[]).filter(
                (g: any) => g.tracking_type === "LINKED_ACCOUNT"
            );

            for (const goal of activeGoals) {
                const existing = await ctx.db
                    .query("goal_contributions")
                    .withIndex("by_goal", (q: any) => q.eq("goalId", goal._id))
                    .filter((q: any) =>
                        q.and(
                            q.eq(q.field("source"), "auto"),
                            q.eq(q.field("note"), "Initial account balance"),
                        )
                    )
                    .first();

                if (existing) {
                    if (sb === 0) {
                        await ctx.db.delete(existing._id);
                    } else {
                        await ctx.db.patch(existing._id, { amount: sb });
                    }
                } else if (sb !== 0) {
                    const account = await ctx.db.get(accountId);
                    await ctx.db.insert("goal_contributions", {
                        userId: goal.userId,
                        goalId: goal._id,
                        amount: sb,
                        contribution_date: (account as any)?.createdAt || new Date().toISOString().split('T')[0],
                        source: "auto",
                        is_withdrawal: false,
                        note: "Initial account balance",
                        createdAt: Date.now(),
                    });
                }

                await updateGoalCompletionStatus(ctx, goal._id);
            }
        }
    },
});

// Delete an account by ID
export const deleteAccount = mutation({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, { accountId }) => {
        await ctx.db.delete(accountId);
    },
});

// Get the CSV preset linked to a given account, used by the CSV importer
export const getAccountPreset = query({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, { accountId }) => {
        const link = await ctx.db
            .query("presetAccounts")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .first();

        if (!link) return null;

        return await ctx.db.get(link.presetId);
    },
});

// Get daily balance history for all accounts (used for sparklines in affordability/accounts)
export const getAccountBalanceHistories = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const accounts = await ctx.db.query("accounts").withIndex("by_user", q => q.eq("userId", userId)).collect();
        if (accounts.length === 0) return {};

        const allTx = await ctx.db
            .query("transactions")
            .withIndex("by_user", q => q.eq("userId", userId))
            .collect();

        // Group transactions by account, then by date
        const byAccount = new Map<string, Map<string, number>>();
        for (const tx of allTx) {
            const aid = tx.accountId.toString();
            if (!byAccount.has(aid)) byAccount.set(aid, new Map());
            const dateKey = new Date(tx.date).toISOString().split("T")[0];
            const dateMap = byAccount.get(aid)!;
            dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + tx.amount);
        }

        const results: Record<string, Array<{ date: string; balance: number }>> = {};

        for (const account of accounts) {
            const aid = account._id.toString();
            const dateMap = byAccount.get(aid) ?? new Map();
            const sortedDates = Array.from(dateMap.keys()).sort();
            const series: Array<{ date: string; balance: number }> = [];
            let running = account.starting_balance ?? 0;

            for (const date of sortedDates) {
                running += dateMap.get(date) ?? 0;
                series.push({ date, balance: Math.round(running * 100) / 100 });
            }

            results[aid] = series;
        }

        return results;
    },
});

// Get all accounts linked to a given preset, used by the presets page
export const getPresetAccounts = query({
    args: { presetId: v.id("presets") },
    handler: async (ctx, { presetId }) => {
        const links = await ctx.db
            .query("presetAccounts")
            .withIndex("by_preset", q => q.eq("presetId", presetId))
            .collect();

        const accounts = await Promise.all(
            links.map(link => ctx.db.get(link.accountId))
        );

        return accounts.filter(Boolean);
    },
});