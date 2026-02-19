// convex/accounts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listAccounts = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const accounts = await ctx.db.query("accounts").withIndex("by_user", q => q.eq("userId", userId)).collect();

        const withLastUpload = await Promise.all(
            accounts.map(async (account) => {
                const lastImport = await ctx.db
                    .query("imports")
                    .withIndex("by_account", q => q.eq("accountId", account._id))
                    .order("desc")
                    .first();
                return {
                    ...account,
                    lastUploadedAt: lastImport?.uploadedAt ?? null,
                };
            })
        );

        return withLastUpload;
    },
});

export const createAccount = mutation({
    args: {
        userId: v.id("users"),
        name: v.string(),
        bank: v.string(),
        number: v.string(),
        type: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("accounts", {
            ...args,
            createdAt: new Date().toISOString(),
        });
    },
});

export const updateAccount = mutation({
    args: {
        accountId: v.id("accounts"),
        name: v.optional(v.string()),
        bank: v.optional(v.string()),
        number: v.optional(v.string()),
        type: v.optional(v.string()),
    },
    handler: async (ctx, { accountId, ...updates }) => {
        await ctx.db.patch(accountId, updates);
    },
});

export const deleteAccount = mutation({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, { accountId }) => {
        await ctx.db.delete(accountId);
    },
});

// This is the key function your CSV importer needs
export const getAccountPreset = query({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, { accountId }) => {
        // Look up link
        const link = await ctx.db
            .query("presetAccounts")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .first();

        if (!link) return null;

        // Get preset
        return await ctx.db.get(link.presetId);
    },
});

// Get all accounts linked to a preset (used by your presets page)
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

// Get account details with related data
export const getAccountDetails = query({
    args: {
        accountId: v.id("accounts"),
        userId: v.id("users")
    },
    handler: async (ctx, { accountId, userId }) => {
        const account = await ctx.db.get(accountId);

        if (!account || account.userId !== userId) {
            throw new Error("Account not found or unauthorized");
        }

        // Get transactions count
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .collect();

        // Get linked goals
        const goals = await ctx.db
            .query("goals")
            .withIndex("by_account", (q) => q.eq("linked_account_id", accountId))
            .collect();

        // Calculate account statistics
        const totalDeposits = transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalWithdrawals = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const currentBalance = transactions.reduce((sum, t) => sum + t.amount, 0);

        // Get recent imports
        const imports = await ctx.db
            .query("imports")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .order("desc")
            .take(5);

        return {
            account,
            stats: {
                totalTransactions: transactions.length,
                totalDeposits,
                totalWithdrawals,
                currentBalance,
                linkedGoalsCount: goals.length,
                importsCount: imports.length,
            },
            linkedGoals: goals,
            recentImports: imports,
        };
    },
});

// Get transactions for an account with pagination
export const getAccountTransactions = query({
    args: {
        accountId: v.id("accounts"),
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { accountId, userId, limit = 50 }) => {
        const account = await ctx.db.get(accountId);

        if (!account || account.userId !== userId) {
            throw new Error("Account not found or unauthorized");
        }

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .order("desc")
            .take(limit);

        return transactions;
    },
});