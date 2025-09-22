// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),
        email: v.string(),
        createdAt: v.number(),
    }).index("by_clerkId", ["clerkId"]),

    accounts: defineTable({
        userId: v.id("users"),
        name: v.string(),
        type: v.string(), // "checking" | "savings" | "credit"
        bank: v.string(),
        createdAt: v.string(),
    }).index("by_user", ["userId"]),

    presets: defineTable({
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
        amountProcessing: v.any(), // JSON object
        transactionTypeColumn: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_user", ["userId"]),

    // Many-to-many: Preset <-> Accounts
    presetAccounts: defineTable({
        presetId: v.id("presets"),
        accountId: v.id("accounts"),
    }).index("by_preset", ["presetId"])
        .index("by_account", ["accountId"]),

    transactions: defineTable({
        userId: v.string(),
        accountId: v.string(),
        amount: v.number(),
        date: v.string(),
        description: v.string(),
        categoryId: v.optional(v.string()),
    }),

    categories: defineTable({
        userId: v.string(),
        name: v.string(),
        groupId: v.optional(v.string()),
    }),

    category_groups: defineTable({
        userId: v.string(),
        name: v.string(),
    }),

    goals: defineTable({
        userId: v.string(),
        name: v.string(),
        target: v.number(),
        progress: v.number(),
    }),

    //   messages: defineTable({
    //     author: v.string(),   // email or userId
    //     body: v.string(),
    //     createdAt: v.number(),
    //   }),
});
