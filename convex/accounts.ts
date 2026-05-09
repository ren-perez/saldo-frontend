// convex/accounts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
                        current_amount: g.current_amount,
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