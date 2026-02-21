// convex/allocations.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Shared allocation engine logic
function calculateAllocations(
    income: number,
    rules: Array<{
        _id: Id<"allocation_rules">;
        accountId: Id<"accounts">;
        category: string;
        ruleType: string;
        value: number;
        priority: number;
        active: boolean;
    }>
): Array<{ ruleId: Id<"allocation_rules">; accountId: Id<"accounts">; category: string; amount: number }> {
    let remaining = income;
    const allocations: Array<{ ruleId: Id<"allocation_rules">; accountId: Id<"accounts">; category: string; amount: number }> = [];

    const sortedRules = [...rules].filter((r) => r.active).sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
        let amount: number;
        if (rule.ruleType === "percent") {
            amount = Math.round((income * rule.value) / 100 * 100) / 100;
        } else {
            amount = rule.value;
        }

        // Last rule with 100% gets remainder
        if (rule === sortedRules[sortedRules.length - 1] && rule.ruleType === "percent" && rule.value === 100) {
            amount = Math.max(0, remaining);
        }

        amount = Math.min(amount, Math.max(0, remaining));

        allocations.push({
            ruleId: rule._id,
            accountId: rule.accountId,
            category: rule.category,
            amount,
        });

        remaining -= amount;
    }

    return allocations;
}

// Run allocations for an income plan and persist records
export const runAllocationsForPlan = mutation({
    args: {
        userId: v.id("users"),
        incomePlanId: v.id("income_plans"),
    },
    handler: async (ctx, { userId, incomePlanId }) => {
        const plan = await ctx.db.get(incomePlanId);
        if (!plan || plan.userId !== userId) throw new Error("Plan not found");

        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const amount = plan.status === "matched" && plan.actual_amount != null
            ? plan.actual_amount
            : plan.expected_amount;
        const isForecast = plan.status !== "matched";

        const allocations = calculateAllocations(amount, rules);

        // Delete existing records and their transaction matches
        const existing = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", incomePlanId))
            .collect();
        for (const record of existing) {
            const matches = await ctx.db
                .query("allocation_transaction_matches")
                .withIndex("by_allocation", (q) => q.eq("allocation_record_id", record._id))
                .collect();
            for (const match of matches) {
                await ctx.db.delete(match._id);
            }
            await ctx.db.delete(record._id);
        }

        // Insert new records
        for (const alloc of allocations) {
            await ctx.db.insert("allocation_records", {
                userId,
                income_plan_id: incomePlanId,
                accountId: alloc.accountId,
                rule_id: alloc.ruleId,
                amount: alloc.amount,
                category: alloc.category,
                is_forecast: isForecast,
                status: "pending",
                matched_amount: 0,
                createdAt: Date.now(),
            });
        }

        return allocations;
    },
});

// Preview allocation without persisting (for the preview card)
export const previewAllocation = query({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, { userId, amount }) => {
        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const goals = await ctx.db
            .query("goals")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const allocations = calculateAllocations(amount, rules);
        const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

        const enriched = allocations.map((a) => {
            const account = accounts.find((acc) => acc._id === a.accountId);
            const linkedGoal = goals.find(
                (g) => g.linked_account_id === a.accountId && !g.is_completed
            );
            return {
                accountId: a.accountId,
                accountName: account ? `${account.name}` : "Unknown",
                category: a.category,
                ruleType: rules.find((r) => r._id === a.ruleId)?.ruleType ?? "fixed",
                ruleValue: rules.find((r) => r._id === a.ruleId)?.value ?? 0,
                amount: a.amount,
                goalName: linkedGoal?.name ?? null,
                goalEmoji: linkedGoal?.emoji ?? null,
            };
        });

        // Sort: goals first, then accounts
        enriched.sort((a, b) => {
            if (a.goalName && !b.goalName) return -1;
            if (!a.goalName && b.goalName) return 1;
            return 0;
        });

        return {
            allocations: enriched,
            unallocated: Math.max(0, Math.round((amount - totalAllocated) * 100) / 100),
        };
    },
});

// Update a single allocation record amount (for per-income customization)
export const updateAllocationAmount = mutation({
    args: {
        recordId: v.id("allocation_records"),
        amount: v.number(),
    },
    handler: async (ctx, { recordId, amount }) => {
        const record = await ctx.db.get(recordId);
        if (!record) throw new Error("Allocation record not found");

        // Lock edits only when the entire plan is fully distributed
        const allRecords = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", record.income_plan_id))
            .collect();
        const isFullyDistributed =
            allRecords.length > 0 && allRecords.every((r) => r.status === "complete");
        if (isFullyDistributed) throw new Error("Cannot edit a fully distributed income plan");

        await ctx.db.patch(recordId, { amount: Math.max(0, amount) });
    },
});

// Get allocation records for a specific income plan
export const getAllocationsForPlan = query({
    args: { incomePlanId: v.id("income_plans") },
    handler: async (ctx, { incomePlanId }) => {
        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", incomePlanId))
            .collect();

        // Enrich with account names
        const enriched = await Promise.all(
            records.map(async (record) => {
                const account = await ctx.db.get(record.accountId);
                return {
                    ...record,
                    accountName: account?.name ?? "Unknown",
                };
            })
        );

        return enriched;
    },
});

// Get monthly forecast based on planned income + rules
export const getMonthlyForecast = query({
    args: {
        userId: v.id("users"),
        months: v.optional(v.number()),
    },
    handler: async (ctx, { userId, months = 3 }) => {
        const plans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const now = new Date();
        const forecast: Array<{
            month: string;
            totalIncome: number;
            totalSavings: number;
            totalInvesting: number;
            totalSpending: number;
            totalDebt: number;
            planCount: number;
        }> = [];

        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

            // Find plans in this month
            const monthPlans = plans.filter((p) => p.expected_date.startsWith(monthStr));

            let totalIncome = 0;
            let totalSavings = 0;
            let totalInvesting = 0;
            let totalSpending = 0;
            let totalDebt = 0;

            for (const plan of monthPlans) {
                const amount = plan.status === "matched" && plan.actual_amount != null
                    ? plan.actual_amount
                    : plan.expected_amount;
                totalIncome += amount;

                const allocations = calculateAllocations(amount, rules);
                for (const alloc of allocations) {
                    if (alloc.category === "savings") totalSavings += alloc.amount;
                    else if (alloc.category === "investing") totalInvesting += alloc.amount;
                    else if (alloc.category === "spending") totalSpending += alloc.amount;
                    else if (alloc.category === "debt") totalDebt += alloc.amount;
                }
            }

            forecast.push({
                month: monthStr,
                totalIncome: Math.round(totalIncome),
                totalSavings: Math.round(totalSavings),
                totalInvesting: Math.round(totalInvesting),
                totalSpending: Math.round(totalSpending),
                totalDebt: Math.round(totalDebt),
                planCount: monthPlans.length,
            });
        }

        return forecast;
    },
});

// ─── Distribution Checklist ──────────────────────────────────────────────────

// Get distribution checklist for a matched income plan
export const getDistributionChecklist = query({
    args: { incomePlanId: v.id("income_plans") },
    handler: async (ctx, { incomePlanId }) => {
        const plan = await ctx.db.get(incomePlanId);
        if (!plan) return null;

        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", incomePlanId))
            .collect();

        // Look up goals linked to accounts
        const allGoals = await ctx.db
            .query("goals")
            .withIndex("by_user", (q) => q.eq("userId", plan.userId))
            .collect();

        const enriched = await Promise.all(
            records.map(async (record) => {
                const account = await ctx.db.get(record.accountId);
                const matches = await ctx.db
                    .query("allocation_transaction_matches")
                    .withIndex("by_allocation", (q) => q.eq("allocation_record_id", record._id))
                    .collect();

                const enrichedMatches = await Promise.all(
                    matches.map(async (m) => {
                        const tx = await ctx.db.get(m.transaction_id);
                        return { ...m, transaction: tx };
                    })
                );

                const status = record.status ?? "pending";
                const matchedAmount = record.matched_amount ?? 0;

                // Find goal linked to this account
                const linkedGoal = allGoals.find(
                    (g) => g.linked_account_id === record.accountId && !g.is_completed
                );

                return {
                    ...record,
                    status,
                    matchedAmount,
                    accountName: account?.name ?? "Unknown",
                    matches: enrichedMatches,
                    remainingAmount: Math.max(0, record.amount - matchedAmount),
                    goalName: linkedGoal?.name ?? null,
                    goalEmoji: linkedGoal?.emoji ?? null,
                    goalId: linkedGoal?._id ?? null,
                };
            })
        );

        // Sort: goals first, then accounts
        enriched.sort((a, b) => {
            if (a.goalName && !b.goalName) return -1;
            if (!a.goalName && b.goalName) return 1;
            return 0;
        });

        const totalAmount = plan.actual_amount ?? plan.expected_amount;
        const totalAllocated = enriched.reduce((s, r) => s + r.amount, 0);
        const totalMatched = enriched.reduce((s, r) => s + r.matchedAmount, 0);
        const completedCount = enriched.filter((r) => r.status === "complete").length;

        return {
            plan,
            items: enriched,
            totalAmount,
            totalAllocated,
            totalMatched,
            completedCount,
            totalItems: enriched.length,
            progress: totalAllocated > 0 ? totalMatched / totalAllocated : 0,
            isComplete: enriched.length > 0 && enriched.every((r) => r.status === "complete"),
            unallocated: Math.max(0, totalAmount - totalAllocated),
        };
    },
});

// Match a transaction to an allocation record
export const matchAllocationTransaction = mutation({
    args: {
        allocationRecordId: v.id("allocation_records"),
        transactionId: v.id("transactions"),
        amount: v.number(),
    },
    handler: async (ctx, { allocationRecordId, transactionId, amount }) => {
        const record = await ctx.db.get(allocationRecordId);
        if (!record) throw new Error("Allocation record not found");

        const tx = await ctx.db.get(transactionId);
        if (!tx) throw new Error("Transaction not found");

        // Check transaction isn't already matched to another allocation
        const existing = await ctx.db
            .query("allocation_transaction_matches")
            .withIndex("by_transaction", (q) => q.eq("transaction_id", transactionId))
            .first();
        if (existing) throw new Error("Transaction already matched to an allocation");

        await ctx.db.insert("allocation_transaction_matches", {
            userId: record.userId,
            allocation_record_id: allocationRecordId,
            transaction_id: transactionId,
            amount,
            createdAt: Date.now(),
        });

        const currentMatched = (record.matched_amount ?? 0) + amount;
        const newStatus = currentMatched >= record.amount ? "complete" : "partial";

        await ctx.db.patch(allocationRecordId, {
            matched_amount: currentMatched,
            status: newStatus,
        });
    },
});

// Unmatch a transaction from an allocation record
export const unmatchAllocationTransaction = mutation({
    args: {
        matchId: v.id("allocation_transaction_matches"),
    },
    handler: async (ctx, { matchId }) => {
        const match = await ctx.db.get(matchId);
        if (!match) throw new Error("Match not found");

        await ctx.db.delete(matchId);

        // Recalculate matched_amount from remaining matches
        const remaining = await ctx.db
            .query("allocation_transaction_matches")
            .withIndex("by_allocation", (q) => q.eq("allocation_record_id", match.allocation_record_id))
            .collect();
        const actualMatched = remaining.reduce((s, m) => s + m.amount, 0);

        const record = await ctx.db.get(match.allocation_record_id);
        if (!record) return;

        const newStatus = actualMatched >= record.amount ? "complete" : actualMatched > 0 ? "partial" : "pending";
        await ctx.db.patch(match.allocation_record_id, {
            matched_amount: actualMatched,
            status: newStatus,
        });
    },
});

// Mark an allocation as complete (set aside / cash)
export const markAllocationComplete = mutation({
    args: {
        allocationRecordId: v.id("allocation_records"),
    },
    handler: async (ctx, { allocationRecordId }) => {
        const record = await ctx.db.get(allocationRecordId);
        if (!record) throw new Error("Allocation record not found");

        await ctx.db.patch(allocationRecordId, {
            status: "complete",
            matched_amount: record.amount,
        });
    },
});

// Unmark a manually completed allocation
export const unmarkAllocationComplete = mutation({
    args: {
        allocationRecordId: v.id("allocation_records"),
    },
    handler: async (ctx, { allocationRecordId }) => {
        const record = await ctx.db.get(allocationRecordId);
        if (!record) throw new Error("Allocation record not found");

        const matches = await ctx.db
            .query("allocation_transaction_matches")
            .withIndex("by_allocation", (q) => q.eq("allocation_record_id", allocationRecordId))
            .collect();
        const actualMatched = matches.reduce((s, m) => s + m.amount, 0);
        const newStatus = actualMatched >= record.amount ? "complete" : actualMatched > 0 ? "partial" : "pending";

        await ctx.db.patch(allocationRecordId, {
            status: newStatus,
            matched_amount: actualMatched,
        });
    },
});

// Get suggested transactions for matching to an allocation
export const getSuggestedTransactionsForAllocation = query({
    args: {
        allocationRecordId: v.id("allocation_records"),
        userId: v.id("users"),
    },
    handler: async (ctx, { allocationRecordId, userId }) => {
        const record = await ctx.db.get(allocationRecordId);
        if (!record) return [];

        const plan = await ctx.db.get(record.income_plan_id);
        if (!plan) return [];

        const dateAnchor = plan.date_received
            ? new Date(plan.date_received).getTime()
            : new Date(plan.expected_date).getTime();
        const dayRange = 30 * 24 * 60 * 60 * 1000;
        const remainingAmount = record.amount - (record.matched_amount ?? 0);

        // Get transactions for this account
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_account", (q) => q.eq("accountId", record.accountId))
            .collect();

        // Get already-matched transaction IDs
        const allMatches = await ctx.db
            .query("allocation_transaction_matches")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const matchedTxIds = new Set(allMatches.map((m) => m.transaction_id.toString()));

        const candidates = transactions
            .filter((t) => !matchedTxIds.has(t._id.toString()))
            .filter((t) => Math.abs(t.date - dateAnchor) <= dayRange)
            .map((t) => ({
                ...t,
                amountDiff: Math.abs(Math.abs(t.amount) - remainingAmount),
                dateDiff: Math.abs(t.date - dateAnchor),
            }))
            .sort((a, b) => a.amountDiff - b.amountDiff)
            .slice(0, 10);

        return candidates;
    },
});

// Get active (incomplete) distributions for dashboard
export const getActiveDistributions = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const plans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const matched = plans.filter((p) => p.status === "matched");
        const active = [];

        for (const plan of matched) {
            const records = await ctx.db
                .query("allocation_records")
                .withIndex("by_income_plan", (q) => q.eq("income_plan_id", plan._id))
                .collect();

            if (records.length === 0) continue;

            const allComplete = records.every((r) => (r.status ?? "pending") === "complete");
            if (!allComplete) {
                const totalMatched = records.reduce((s, r) => s + (r.matched_amount ?? 0), 0);
                const totalAmount = records.reduce((s, r) => s + r.amount, 0);
                const completedCount = records.filter((r) => (r.status ?? "pending") === "complete").length;
                active.push({
                    plan,
                    totalItems: records.length,
                    completedItems: completedCount,
                    totalAmount,
                    totalMatched,
                    progress: totalAmount > 0 ? totalMatched / totalAmount : 0,
                });
            }
        }

        return active;
    },
});

// Add a single allocation record to an income plan (for quick add in checklist)
export const addAllocationRecord = mutation({
    args: {
        incomePlanId: v.id("income_plans"),
        accountId: v.id("accounts"),
        amount: v.number(),
        category: v.string(),
    },
    handler: async (ctx, { incomePlanId, accountId, amount, category }) => {
        const plan = await ctx.db.get(incomePlanId);
        if (!plan) throw new Error("Plan not found");

        // Use a dummy rule_id — find an existing rule for this account or use the first rule
        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", plan.userId))
            .collect();
        const matchingRule = rules.find((r) => r.accountId === accountId) ?? rules[0];
        if (!matchingRule) throw new Error("No allocation rules exist");

        await ctx.db.insert("allocation_records", {
            userId: plan.userId,
            income_plan_id: incomePlanId,
            accountId,
            rule_id: matchingRule._id,
            amount: Math.max(0, amount),
            category,
            is_forecast: plan.status !== "matched",
            status: "pending",
            matched_amount: 0,
            createdAt: Date.now(),
        });
    },
});

// Delete a single allocation record (for quick remove in checklist)
export const deleteAllocationRecord = mutation({
    args: {
        recordId: v.id("allocation_records"),
    },
    handler: async (ctx, { recordId }) => {
        const record = await ctx.db.get(recordId);
        if (!record) throw new Error("Allocation record not found");

        // Delete any transaction matches first
        const matches = await ctx.db
            .query("allocation_transaction_matches")
            .withIndex("by_allocation", (q) => q.eq("allocation_record_id", recordId))
            .collect();
        for (const match of matches) {
            await ctx.db.delete(match._id);
        }

        await ctx.db.delete(recordId);
    },
});
