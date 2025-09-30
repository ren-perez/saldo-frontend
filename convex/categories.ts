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

// 📌 Get categories with their group names for goal dialog
export const getCategoriesWithGroups = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user")
            .filter((row) => row.eq(row.field("userId"), userId))
            .collect();

        const categoriesWithGroups = await Promise.all(
            categories.map(async (category) => {
                let groupName = "";
                if (category.groupId) {
                    const group = await ctx.db.get(category.groupId);
                    if (group) {
                        groupName = group.name;
                    }
                }
                return {
                    _id: category._id,
                    name: category.name,
                    groupName,
                    transactionType: category.transactionType,
                };
            })
        );

        return categoriesWithGroups;
    },
});
