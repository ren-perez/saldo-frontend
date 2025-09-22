// convex/users.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const initUser = mutation({
    args: { clerkId: v.string(), email: v.string() },
    handler: async (ctx, { clerkId, email }) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerkId", q => q.eq("clerkId", clerkId))
            .unique();
        if (existing) return existing._id;

        const newUserId = await ctx.db.insert("users", {
            clerkId,
            email,
            createdAt: Date.now(),
        });
        return newUserId;
    },
});

// export const getUserByClerkId = query({
//     args: { clerkId: v.string() },
//     handler: async (ctx, { clerkId }) => {
//         return await ctx.db
//             .query("users")
//             .withIndex("by_clerkId", q => q.eq("clerkId", clerkId))
//             .unique();
//     },
// });


export const getUserByClerkId = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.clerkId) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", q => q.eq("clerkId", args.clerkId as string))
      .unique();
  },
});