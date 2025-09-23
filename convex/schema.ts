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
        number: v.optional(v.string()),
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
        userId: v.id("users"),
        accountId: v.id("accounts"),
        amount: v.number(),
        date: v.number(),           // ✅ Changed from v.string() to v.number() for timestamp
        description: v.string(),
        transactionType: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_account", ["accountId"])
        .index("by_date", ["date"])     // ✅ This will now work properly with numeric dates
        .searchIndex("search_description", {
            searchField: "description",
            filterFields: ["userId", "accountId"],
        }),

    categories: defineTable({
        userId: v.id("users"),
        name: v.string(),
        // transactionType: v.optional(v.string()),
        groupId: v.optional(v.id("category_groups")),
        createdAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_group", ["groupId"]),

    category_groups: defineTable({
        userId: v.id("users"),
        name: v.string(),
        createdAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    goals: defineTable({
        userId: v.id("users"),
        name: v.string(),
        target: v.number(),
        progress: v.number(),
        createdAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),
});