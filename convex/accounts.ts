// convex/accounts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";


export const createAccount = mutation({
    args: { userId: v.id("users"), name: v.string(), type: v.string(), bank: v.string() },
    handler: async (ctx, { userId, name, type, bank }) => {
        return await ctx.db.insert("accounts", { userId, name, type, bank, createdAt: new Date().toISOString() });
    },
});

export const listAccounts = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return await ctx.db.query("accounts").withIndex("by_user", q => q.eq("userId", userId)).collect();
    },
});

export const updateAccount = mutation({
    args: {
        accountId: v.id("accounts"),
        name: v.optional(v.string()),
        type: v.optional(v.string()),
        bank: v.optional(v.string()),
    },
    handler: async (ctx, { accountId, ...updates }) => {
        await ctx.db.patch(accountId, updates);
        return await ctx.db.get(accountId);
    },
});

export const deleteAccount = mutation({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, { accountId }) => {
        await ctx.db.delete(accountId);
    },
});
