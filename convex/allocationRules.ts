// convex/allocationRules.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listRules = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        return rules.sort((a, b) => a.priority - b.priority);
    },
});

export const createRule = mutation({
    args: {
        userId: v.id("users"),
        accountId: v.id("accounts"),
        category: v.string(),
        ruleType: v.string(),
        value: v.number(),
        priority: v.number(),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("allocation_rules", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

export const updateRule = mutation({
    args: {
        ruleId: v.id("allocation_rules"),
        category: v.optional(v.string()),
        ruleType: v.optional(v.string()),
        value: v.optional(v.number()),
        priority: v.optional(v.number()),
        active: v.optional(v.boolean()),
    },
    handler: async (ctx, { ruleId, ...updates }) => {
        const cleaned = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );
        await ctx.db.patch(ruleId, cleaned);
    },
});

export const deleteRule = mutation({
    args: { ruleId: v.id("allocation_rules") },
    handler: async (ctx, { ruleId }) => {
        // Delete associated allocation records
        const records = await ctx.db
            .query("allocation_records")
            .filter((q) => q.eq(q.field("rule_id"), ruleId))
            .collect();
        for (const record of records) {
            await ctx.db.delete(record._id);
        }
        await ctx.db.delete(ruleId);
    },
});

export const reorderRules = mutation({
    args: {
        ruleIds: v.array(v.id("allocation_rules")),
    },
    handler: async (ctx, { ruleIds }) => {
        for (let i = 0; i < ruleIds.length; i++) {
            await ctx.db.patch(ruleIds[i], { priority: i });
        }
    },
});
