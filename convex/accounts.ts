// convex/accounts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listAccounts = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return await ctx.db.query("accounts").withIndex("by_user", q => q.eq("userId", userId)).collect();
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