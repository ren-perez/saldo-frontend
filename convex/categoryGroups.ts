// convex/categoryGroups.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 📌 Create a new category group
export const createCategoryGroup = mutation({
    args: {
        userId: v.id("users"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const groupId = await ctx.db.insert("category_groups", {
            userId: args.userId,
            name: args.name,
            createdAt: Date.now(),
        });
        return groupId;
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

// 📌 Update a category group
export const updateCategoryGroup = mutation({
    args: {
        groupId: v.id("category_groups"),
        updates: v.object({
            name: v.optional(v.string()),
        }),
    },
    handler: async (ctx, { groupId, updates }) => {
        await ctx.db.patch(groupId, updates);
        return await ctx.db.get(groupId);
    },
});

// 📌 Delete a category group
export const deleteCategoryGroup = mutation({
    args: { groupId: v.id("category_groups") },
    handler: async (ctx, { groupId }) => {
        await ctx.db.delete(groupId);
        return groupId;
    },
});

// 📌 Get a specific category group
export const getCategoryGroup = query({
    args: { groupId: v.id("category_groups") },
    handler: async (ctx, { groupId }) => {
        return await ctx.db.get(groupId);
    },
});