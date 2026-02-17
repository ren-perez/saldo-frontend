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
        type: v.string(),
        bank: v.string(),
        createdAt: v.string(),
        balance: v.optional(v.number()),
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
        amountProcessing: v.any(),
        transactionTypeColumn: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_user", ["userId"]),

    presetAccounts: defineTable({
        presetId: v.id("presets"),
        accountId: v.id("accounts"),
    }).index("by_preset", ["presetId"])
        .index("by_account", ["accountId"]),

    transactions: defineTable({
        userId: v.id("users"),
        accountId: v.id("accounts"),
        amount: v.number(),
        date: v.number(),
        description: v.string(),
        transactionType: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        transfer_pair_id: v.optional(v.string()),
        importId: v.optional(v.id("imports")), // ✅ Track which import created this
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_account", ["accountId"])
        .index("by_date", ["date"])
        .index("by_import", ["importId"]) // ✅ Query transactions by import
        .index("by_transfer_pair", ["transfer_pair_id"])
        .searchIndex("search_description", {
            searchField: "description",
            filterFields: ["userId", "accountId"],
        }),

    categories: defineTable({
        userId: v.id("users"),
        name: v.string(),
        transactionType: v.optional(v.string()),
        groupId: v.optional(v.id("category_groups")),
        createdAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_group", ["groupId"])
        .index("by_type", ["transactionType"]),

    category_groups: defineTable({
        userId: v.id("users"),
        name: v.string(),
        createdAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    goals: defineTable({
        userId: v.id("users"),
        name: v.string(),
        total_amount: v.number(),
        current_amount: v.optional(v.number()),
        monthly_contribution: v.number(),
        due_date: v.optional(v.string()),
        color: v.string(),
        emoji: v.string(),
        note: v.optional(v.string()),
        priority: v.optional(v.number()),
        priority_label: v.optional(v.string()),
        tracking_type: v.string(), // "MANUAL" | "LINKED_ACCOUNT" | "EXPENSE_CATEGORY"
        calculation_type: v.optional(v.string()),
        linked_account_id: v.optional(v.id("accounts")),
        linked_category_id: v.optional(v.id("categories")), // For expense-linked goals
        image_url: v.optional(v.string()),
        is_completed: v.optional(v.boolean()),
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_account", ["linked_account_id"])
        .index("by_category", ["linked_category_id"])
        .index("by_completion", ["is_completed"]),

    goal_contributions: defineTable({
        userId: v.id("users"),
        goalId: v.id("goals"),
        transactionId: v.optional(v.id("transactions")),
        amount: v.number(),
        note: v.optional(v.string()),
        contribution_date: v.string(),
        source: v.string(), // "manual_ui" | "manual_tx" | "import" | "auto" | "expense_linked"
        transfer_pair_id: v.optional(v.string()), // For goal-to-goal transfers
        is_withdrawal: v.optional(v.boolean()), // Track negative contributions
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_goal", ["goalId"])
        .index("by_transaction", ["transactionId"])
        .index("by_transfer_pair", ["transfer_pair_id"])
        .index("by_source", ["source"])
        .index("by_date", ["contribution_date"]),

    goal_monthly_plans: defineTable({
        userId: v.id("users"),
        goalId: v.id("goals"),
        name: v.string(),
        month: v.number(),
        year: v.number(),
        allocated_amount: v.number(),
        createdAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_goal", ["goalId"]),

    // ✅ Master import record - tracks the file and overall status
    imports: defineTable({
        userId: v.id("users"),
        accountId: v.id("accounts"),
        fileKey: v.string(),
        fileName: v.string(),
        contentType: v.string(),
        size: v.number(),
        status: v.string(), // "uploaded" | "processing" | "completed" | "failed"
        
        // ✅ Summary statistics
        totalRows: v.optional(v.number()),
        importedCount: v.optional(v.number()),
        skippedCount: v.optional(v.number()),
        errorCount: v.optional(v.number()),
        
        uploadedAt: v.number(),
        processedAt: v.optional(v.number()),
        error: v.optional(v.string()),
        updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_account", ["accountId"])
        .index("by_status", ["status"]),

    // ✅ Session record - tracks processing details and duplicate resolution
    import_sessions: defineTable({
        sessionId: v.string(),
        userId: v.id("users"),
        accountId: v.id("accounts"),
        importId: v.id("imports"),
        
        // ✅ Store original transactions for reference
        pendingTransactions: v.array(v.object({
            date: v.number(),
            amount: v.number(),
            description: v.string(),
            category: v.optional(v.string()),
            transactionType: v.optional(v.string()),
            rawData: v.any(),
        })),
        
        // ✅ Duplicates awaiting user decision
        duplicates: v.array(v.object({
            existingId: v.id("transactions"),
            newTransaction: v.object({
                date: v.number(),
                amount: v.number(),
                description: v.string(),
                transactionType: v.optional(v.string()),
                rawData: v.any(),
                importId: v.id("imports"),
            }),
        })),
        
        // ✅ Errors encountered during processing
        errors: v.array(v.object({
            rowIndex: v.number(),
            message: v.string(),
        })),
        
        // ✅ Summary stats
        summary: v.object({
            inserted: v.number(),
            skipped: v.number(),
            totalErrors: v.number(),
        }),
        
        createdAt: v.number(),
        resolvedAt: v.optional(v.number()), // ✅ When user finished reviewing
        status: v.string(), // "processing" | "awaiting_review" | "completed"
    }).index("by_session", ["sessionId"])
        .index("by_user", ["userId"])
        .index("by_import", ["importId"])
        .index("by_status", ["status"]),

    // ✅ NEW: Audit trail for duplicate resolution decisions
    import_duplicate_resolutions: defineTable({
        sessionId: v.string(),
        importId: v.id("imports"),
        userId: v.id("users"),
        existingTransactionId: v.id("transactions"),
        action: v.string(), // "skip" | "import" | "merge"
        newTransactionId: v.optional(v.id("transactions")), // If imported
        resolvedAt: v.number(),
    }).index("by_session", ["sessionId"])
        .index("by_import", ["importId"])
        .index("by_user", ["userId"]),

    // ─── Planning Layer ────────────────────────────────────

    income_plans: defineTable({
        userId: v.id("users"),
        expected_date: v.string(),      // ISO date string "2026-02-15"
        expected_amount: v.number(),
        label: v.string(),              // e.g. "Acme Corp", "Freelance"
        recurrence: v.string(),         // "none" | "weekly" | "biweekly" | "monthly"
        status: v.string(),             // "planned" | "matched" | "missed"
        notes: v.optional(v.string()),
        matched_transaction_id: v.optional(v.id("transactions")),
        actual_amount: v.optional(v.number()),
        date_received: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_status", ["status"])
        .index("by_date", ["expected_date"]),

    allocation_rules: defineTable({
        userId: v.id("users"),
        accountId: v.id("accounts"),
        category: v.string(),           // "savings" | "investing" | "spending" | "debt"
        ruleType: v.string(),           // "percent" | "fixed"
        value: v.number(),
        priority: v.number(),           // ordering (0 = first)
        active: v.boolean(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    allocation_records: defineTable({
        userId: v.id("users"),
        income_plan_id: v.id("income_plans"),
        accountId: v.id("accounts"),
        rule_id: v.id("allocation_rules"),
        amount: v.number(),
        category: v.string(),           // denormalized from rule
        is_forecast: v.boolean(),       // true = planned, false = matched/actual
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_income_plan", ["income_plan_id"])
        .index("by_account", ["accountId"]),

    ignored_transfer_pairs: defineTable({
        userId: v.id("users"),
        outgoingTransactionId: v.id("transactions"),
        incomingTransactionId: v.id("transactions"),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_outgoing", ["outgoingTransactionId"])
        .index("by_incoming", ["incomingTransactionId"]),
});