import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const FLOW_TYPES = v.union(v.literal("fundamental"), v.literal("flexible"), v.literal("wealth"));

// 📌 Create a new category
export const createCategory = mutation({
    args: {
        userId: v.id("users"),
        name: v.string(),
        groupId: v.optional(v.id("category_groups")),
        transactionType: v.optional(v.string()),
        stsFlowType: v.optional(FLOW_TYPES),
    },
    handler: async (ctx, args) => {
        const categoryId = await ctx.db.insert("categories", {
            userId: args.userId,
            name: args.name,
            groupId: args.groupId || undefined,
            transactionType: args.transactionType || undefined,
            stsFlowType: args.stsFlowType || undefined,
            createdAt: Date.now(),
        });
        return categoryId;
    },
});

// 📌 List all categories for a user
export const listCategories = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("categories")
            .withIndex("by_user")
            .filter((row) => row.eq(row.field("userId"), userId))
            .order("asc")
            .collect();
    },
});

// 📌 Update a category
export const updateCategory = mutation({
    args: {
        categoryId: v.id("categories"),
        updates: v.object({
            name: v.optional(v.string()),
            groupId: v.optional(v.id("category_groups")),
            transactionType: v.optional(v.string()),
            stsFlowType: v.optional(FLOW_TYPES),
        }),
    },
    handler: async (ctx, { categoryId, updates }) => {
        await ctx.db.patch(categoryId, updates);
        return await ctx.db.get(categoryId);
    },
});

// 📌 Set flow type for a category (convenience wrapper)
export const setFlowType = mutation({
    args: {
        categoryId: v.id("categories"),
        stsFlowType: v.optional(FLOW_TYPES),
    },
    handler: async (ctx, { categoryId, stsFlowType }) => {
        await ctx.db.patch(categoryId, { stsFlowType: stsFlowType || undefined });
        return await ctx.db.get(categoryId);
    },
});

// 📌 Delete a category
export const deleteCategory = mutation({
    args: { categoryId: v.id("categories") },
    handler: async (ctx, { categoryId }) => {
        await ctx.db.delete(categoryId);
        return categoryId;
    },
});

// 📌 List all category groups for a user
export const listCategoryGroups = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("category_groups")
            .withIndex("by_user")
            .filter((row) => row.eq(row.field("userId"), userId))
            .order("asc")
            .collect();
    },
});
