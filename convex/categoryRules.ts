// convex/categoryRules.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all rules for a user, sorted by priority descending
export const listRules = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const rules = await ctx.db
            .query("category_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        return rules.sort((a, b) => b.priority - a.priority);
    },
});

// Create a rule — rejects duplicates (same userId + pattern)
export const createRule = mutation({
    args: {
        userId: v.id("users"),
        pattern: v.string(),
        categoryId: v.id("categories"),
        priority: v.number(),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const normalizedPattern = args.pattern.toLowerCase().trim();

        // Check for existing rule with same pattern for this user
        const existing = await ctx.db
            .query("category_rules")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const duplicate = existing.find(
            (r) => r.pattern.toLowerCase() === normalizedPattern
        );
        if (duplicate) {
            throw new Error(`A rule for "${args.pattern}" already exists.`);
        }

        const ruleId = await ctx.db.insert("category_rules", {
            userId: args.userId,
            pattern: normalizedPattern,
            categoryId: args.categoryId,
            priority: args.priority,
            isActive: args.isActive ?? true,
            createdAt: Date.now(),
        });

        return ruleId;
    },
});

// Update an existing rule (toggle active, change category, adjust priority)
export const updateRule = mutation({
    args: {
        ruleId: v.id("category_rules"),
        updates: v.object({
            pattern: v.optional(v.string()),
            categoryId: v.optional(v.id("categories")),
            priority: v.optional(v.number()),
            isActive: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, { ruleId, updates }) => {
        const rule = await ctx.db.get(ruleId);
        if (!rule) throw new Error("Rule not found");

        const patch: Record<string, unknown> = {};
        if (updates.pattern !== undefined) patch.pattern = updates.pattern.toLowerCase().trim();
        if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId;
        if (updates.priority !== undefined) patch.priority = updates.priority;
        if (updates.isActive !== undefined) patch.isActive = updates.isActive;

        await ctx.db.patch(ruleId, patch);
        return ruleId;
    },
});

// Delete a rule
export const deleteRule = mutation({
    args: { ruleId: v.id("category_rules") },
    handler: async (ctx, { ruleId }) => {
        await ctx.db.delete(ruleId);
        return ruleId;
    },
});
