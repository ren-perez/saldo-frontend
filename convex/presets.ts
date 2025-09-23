// convex/presets.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// async function getUserByClerkId(ctx: any, clerkId: string) {
//     return await ctx.db
//         .query("users")
//         .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
//         .first();
// }

export const createPreset = mutation({
    args: {
        userId: v.id("users"),
        name: v.string(),
        description: v.string(),
        delimiter: v.string(),
        hasHeader: v.boolean(),
        skipRows: v.number(),
        accountColumn: v.optional(v.string()),
        amountMultiplier: v.number(),
        categoryColumn: v.optional(v.string()),
        categoryGroupColumn: v.optional(v.string()),
        dateColumn: v.string(),
        dateFormat: v.string(),
        descriptionColumn: v.string(),
        amountColumns: v.array(v.string()),
        amountProcessing: v.any(),
        transactionTypeColumn: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("presets", { ...args, createdAt: new Date().toISOString() });
    },
});

export const listPresets = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return await ctx.db.query("presets").withIndex("by_user", q => q.eq("userId", userId)).collect();
    },
});

export const deletePreset = mutation({
    args: { presetId: v.id("presets") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.presetId);
    },
});

export const linkPresetToAccount = mutation({
    args: { presetId: v.id("presets"), accountId: v.id("accounts") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("presetAccounts")
            .withIndex("by_preset", (q) => q.eq("presetId", args.presetId))
            .first();
        if (existing?.accountId === args.accountId) return;
        await ctx.db.insert("presetAccounts", args);
    },
});

export const unlinkPresetFromAccount = mutation({
    args: { presetId: v.id("presets"), accountId: v.id("accounts") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("presetAccounts")
            .withIndex("by_preset", (q) => q.eq("presetId", args.presetId))
            .first();
        if (existing) await ctx.db.delete(existing._id);
    },
});

export const getPresetAccounts = query({
    args: { presetId: v.id("presets") },
    handler: async (ctx, args) => {
        const links = await ctx.db
            .query("presetAccounts")
            .withIndex("by_preset", (q) => q.eq("presetId", args.presetId))
            .collect();
        return links.map((l) => l.accountId);
    },
});

export const isAccountLinked = query({
    args: { presetId: v.id("presets"), accountId: v.id("accounts") },
    handler: async (ctx, { presetId, accountId }) => {
        const link = await ctx.db.query("presetAccounts")
            .withIndex("by_preset", q => q.eq("presetId", presetId))
            .filter(q => q.eq(q.field("accountId"), accountId))
            .unique();
        return !!link;
    },
});

export const updatePreset = mutation({
    args: {
        presetId: v.id("presets"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            delimiter: v.optional(v.string()),
            hasHeader: v.optional(v.boolean()),
            skipRows: v.optional(v.number()),
            accountColumn: v.optional(v.string()),
            amountMultiplier: v.optional(v.number()),
            categoryColumn: v.optional(v.string()),
            categoryGroupColumn: v.optional(v.string()),
            dateColumn: v.optional(v.string()),
            dateFormat: v.optional(v.string()),
            descriptionColumn: v.optional(v.string()),
            amountColumns: v.optional(v.array(v.string())),
            amountProcessing: v.optional(v.any()),
            transactionTypeColumn: v.optional(v.string()),
        }),
    },
    handler: async (ctx, { presetId, updates }) => {
        await ctx.db.patch(presetId, updates);
        return await ctx.db.get(presetId);
    },
});


