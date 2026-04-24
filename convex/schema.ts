// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),
        email: v.string(),
        createdAt: v.number(),
        previewIncome: v.optional(v.number()),
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

    category_rules: defineTable({
        userId: v.id("users"),
        pattern: v.string(),       // keyword to match (e.g. "netflix", "uber")
        categoryId: v.id("categories"),
        priority: v.number(),      // higher = checked first
        isActive: v.boolean(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    transactions: defineTable({
        userId: v.id("users"),
        accountId: v.id("accounts"),
        amount: v.number(),
        date: v.number(),
        description: v.string(),
        transactionType: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        isAutoCategorized: v.optional(v.boolean()), // true = applied by rules engine
        appliedRuleId: v.optional(v.id("category_rules")), // traceability — which rule set this category
        transfer_pair_id: v.optional(v.string()),
        importId: v.optional(v.id("imports")), // ✅ Track which import created this
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_account", ["accountId"])
        .index("by_date", ["date"])
        .index("by_import", ["importId"]) // ✅ Query transactions by import
        .index("by_transfer_pair", ["transfer_pair_id"])
        .index("by_applied_rule", ["appliedRuleId"]) // rule audit count
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
        tracking_type: v.string(), // "MANUAL" | "LINKED_ACCOUNT"
        calculation_type: v.optional(v.string()),
        linked_account_id: v.optional(v.id("accounts")),
        linked_category_id: v.optional(v.id("categories")), // keep for backward compat
        image_url: v.optional(v.string()),
        is_completed: v.optional(v.boolean()),
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_account", ["linked_account_id"])
        .index("by_completion", ["is_completed"]),

    goal_contributions: defineTable({
        userId: v.id("users"),
        goalId: v.id("goals"),
        transactionId: v.optional(v.id("transactions")),
        income_plan_id: v.optional(v.id("income_plans")), // set when created from income allocation
        amount: v.number(),
        note: v.optional(v.string()),
        contribution_date: v.string(),
        source: v.string(), // "manual_ui" | "manual_tx" | "import" | "auto" | "income_allocation"
        transfer_pair_id: v.optional(v.string()), // For goal-to-goal transfers
        is_withdrawal: v.optional(v.boolean()), // Track negative contributions
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_goal", ["goalId"])
        .index("by_transaction", ["transactionId"])
        .index("by_income_plan", ["income_plan_id"])
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
        recurrence: v.string(),         // "once" | "weekly" | "biweekly" | "monthly" | "quarterly" | "annually"
        status: v.string(),             // "planned" | "matched" | "missed"
        notes: v.optional(v.string()),
        matched_transaction_id: v.optional(v.id("transactions")),
        actual_amount: v.optional(v.number()),
        date_received: v.optional(v.string()),
        schedule_pattern: v.optional(v.object({
            type: v.string(),           // "monthly_dates"
            days: v.array(v.number()), // e.g. [5, 20]
        })),
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
        scope: v.optional(v.string()), // "transfer" | "refill" — refill auto-verifies when target == income account
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    allocation_records: defineTable({
        userId: v.id("users"),
        income_plan_id: v.id("income_plans"),
        accountId: v.id("accounts"),
        rule_id: v.id("allocation_rules"),
        amount: v.number(),
        category: v.string(),
        is_forecast: v.boolean(),
        verification_status: v.optional(v.string()),
        transfer_transaction_id: v.optional(v.id("transactions")),
        createdAt: v.number(),
        // Deprecated pre-refactor fields — kept optional to avoid rejecting old documents
        matched_amount: v.optional(v.number()),
        status: v.optional(v.string()),
        label: v.optional(v.string()),
        matched_transaction_id: v.optional(v.id("transactions")),
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

    // ─── Reimbursement Pairing (optional) ─────────────────
    // Links a reimbursement transaction (positive amount, expense type)
    // to the original expense transaction it offsets.
    reimbursement_pairs: defineTable({
        userId: v.id("users"),
        reimbursementTransactionId: v.id("transactions"),
        expenseTransactionId: v.id("transactions"),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_reimbursement", ["reimbursementTransactionId"])
        .index("by_expense", ["expenseTransactionId"]),

    // ─── Telegram Integration ──────────────────────────────

    telegram_pairing_codes: defineTable({
        userId: v.id("users"),
        code: v.string(),
        expiresAt: v.number(),
        usedAt: v.optional(v.number()),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_code", ["code"]),

    telegram_connections: defineTable({
        userId: v.id("users"),
        telegramUserId: v.string(),
        telegramChatId: v.string(),
        telegramUsername: v.optional(v.string()),
        telegramFirstName: v.optional(v.string()),
        telegramLastName: v.optional(v.string()),
        linkedAt: v.number(),
        isActive: v.boolean(),
    }).index("by_user", ["userId"])
        .index("by_telegram_user", ["telegramUserId"]),

    // ─── Conversation History ──────────────────────────────
    // Storage assumptions: keep all messages, raw payload retained for debugging,
    // no deletion logic. userId is nullable to support unpaired user traffic.

    messages: defineTable({
        userId: v.optional(v.id("users")),
        telegramConnectionId: v.optional(v.id("telegram_connections")),
        channel: v.string(),                  // "telegram"
        direction: v.string(),                // "inbound" | "outbound"
        messageType: v.string(),              // "text"
        text: v.string(),
        rawPayload: v.optional(v.any()),      // original Telegram webhook JSON (inbound) or API response (outbound)
        telegramMessageId: v.optional(v.string()),
        telegramChatId: v.string(),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_chat", ["telegramChatId"])
        .index("by_chat_and_created", ["telegramChatId", "createdAt"])  // rate limiting
        .index("by_telegram_message", ["telegramMessageId", "direction"]),

    actions: defineTable({
        userId: v.optional(v.id("users")),
        messageId: v.optional(v.id("messages")),
        channel: v.string(),                  // "telegram"
        actionType: v.string(),               // "pair_account" | "unlinked_user_message" | "help_command" | "echo_reply" | "unsupported_message_type"
        status: v.string(),                   // "pending" | "completed" | "failed" | "ignored"
        inputJson: v.optional(v.any()),
        resultJson: v.optional(v.any()),
        errorText: v.optional(v.string()),
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_message", ["messageId"])
        .index("by_status", ["status"]),

    // ─── User Preferences — per-user bot settings ─────────
    // Persists smart defaults learned from usage (e.g. last-used account).
    // Epic 8 — Story 5

    user_preferences: defineTable({
        userId: v.id("users"),
        lastAccountId: v.optional(v.id("accounts")), // silently re-used for next transaction
        updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    // ─── Chat Context — per-chat session state ─────────────
    // Stores ephemeral context that enables multi-turn UX:
    //   - last created transaction (for correction flow, Story 13)
    // Epic 8 — Stories 13 + 14

    chat_context: defineTable({
        telegramChatId: v.string(),
        userId: v.id("users"),
        lastTransactionId: v.optional(v.id("transactions")),
        lastTransactionAmount: v.optional(v.number()),
        lastTransactionDescription: v.optional(v.string()),
        updatedAt: v.number(),
    }).index("by_chat", ["telegramChatId"])
        .index("by_user", ["userId"]),

    // ─── Pending Confirmations — high-risk action gate ─────
    // Stores actions awaiting explicit user confirmation (yes/no).
    // Expire after CONFIRMATION_TTL_MS. Unconfirmed actions are never executed.
    // Epic 7 — Story 2

    pending_confirmations: defineTable({
        userId: v.id("users"),
        telegramChatId: v.string(),
        actionType: v.string(),               // "delete_transaction"
        payload: v.any(),                     // action-specific data (e.g. { transactionId })
        confirmationText: v.string(),         // human-readable summary shown to user before confirming
        status: v.string(),                   // "awaiting" | "confirmed" | "cancelled" | "expired"
        expiresAt: v.number(),                // unix ms — auto-expire after TTL
        createdAt: v.number(),
    }).index("by_chat_and_status", ["telegramChatId", "status"])
        .index("by_user", ["userId"]),
});