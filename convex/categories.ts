import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 📌 Create a new category
export const createCategory = mutation({
    args: {
        userId: v.id("users"),
        name: v.string(),
        groupId: v.optional(v.id("category_groups")),
        transactionType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const categoryId = await ctx.db.insert("categories", {
            userId: args.userId,
            name: args.name,
            groupId: args.groupId || undefined,
            transactionType: args.transactionType || undefined,
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
        }),
    },
    handler: async (ctx, { categoryId, updates }) => {
        await ctx.db.patch(categoryId, updates);
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
