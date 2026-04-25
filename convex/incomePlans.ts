// convex/incomePlans.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { calculateAllocations } from "./allocations";

function computeNextMonthlyDate(days: number[], fromDate: Date): string {
    const sorted = [...days].sort((a, b) => a - b);
    const currentDay = fromDate.getDate();
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth();

    const nextInMonth = sorted.find((d) => d > currentDay);
    if (nextInMonth) {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(nextInMonth).padStart(2, "0")}`;
    }

    const nextMonth = month + 1 > 11 ? 0 : month + 1;
    const nextYear = month + 1 > 11 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(sorted[0]).padStart(2, "0")}`;
}

function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
}

function computeNextDateFromRecurrence(recurrence: string, fromDateStr: string): string | null {
    switch (recurrence) {
        case "weekly":     return addDays(fromDateStr, 7);
        case "biweekly":   return addDays(fromDateStr, 14);
        case "monthly":    return addMonths(fromDateStr, 1);
        case "quarterly":  return addMonths(fromDateStr, 3);
        case "annually":   return addMonths(fromDateStr, 12);
        default:           return null; // "once" and unknown
    }
}

export const listIncomePlans = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const plans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        return plans.sort((a, b) => b.expected_date.localeCompare(a.expected_date));
    },
});

export const createIncomePlan = mutation({
    args: {
        userId: v.id("users"),
        expected_date: v.string(),
        expected_amount: v.number(),
        label: v.string(),
        recurrence: v.string(),
        notes: v.optional(v.string()),
        schedule_pattern: v.optional(v.object({
            type: v.string(),
            days: v.array(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        const planId = await ctx.db.insert("income_plans", {
            ...args,
            status: "planned",
            createdAt: Date.now(),
        });
        return planId;
    },
});

export const updateIncomePlan = mutation({
    args: {
        planId: v.id("income_plans"),
        expected_date: v.optional(v.string()),
        expected_amount: v.optional(v.number()),
        label: v.optional(v.string()),
        recurrence: v.optional(v.string()),
        notes: v.optional(v.string()),
        schedule_pattern: v.optional(v.object({
            type: v.string(),
            days: v.array(v.number()),
        })),
    },
    handler: async (ctx, { planId, ...updates }) => {
        const cleaned = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );
        await ctx.db.patch(planId, cleaned);
    },
});

export const deleteIncomePlan = mutation({
    args: { planId: v.id("income_plans") },
    handler: async (ctx, { planId }) => {
        const plan = await ctx.db.get(planId);
        if (!plan) return;

        if (plan.status === "matched" || plan.status === "completed") {
            const contributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
                .collect();
            for (const contrib of contributions) {
                await ctx.db.delete(contrib._id);
            }
        }

        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        for (const record of records) {
            await ctx.db.delete(record._id);
        }

        await ctx.db.delete(planId);
    },
});

export const matchIncomePlan = mutation({
    args: {
        planId: v.id("income_plans"),
        transactionId: v.id("transactions"),
        customAllocations: v.optional(v.array(v.object({
            recordId: v.id("allocation_records"),
            amount: v.number(),
        }))),
    },
    handler: async (ctx, { planId, transactionId, customAllocations }) => {
        const plan = await ctx.db.get(planId);
        if (!plan) throw new Error("Plan not found");

        const transaction = await ctx.db.get(transactionId);
        if (!transaction) throw new Error("Transaction not found");

        const allPlans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", transaction.userId))
            .collect();
        const alreadyMatched = allPlans.find(
            (p) => p._id !== planId && p.matched_transaction_id === transactionId
        );
        if (alreadyMatched) throw new Error("Transaction is already matched to another income plan");

        const actualAmount = transaction.amount;
        const dateReceived = new Date(transaction.date).toISOString().split("T")[0];
        const wasAlreadyMatched = plan.status === "matched" || plan.status === "completed";

        await ctx.db.patch(planId, {
            status: "matched",
            matched_transaction_id: transactionId,
            actual_amount: actualAmount,
            date_received: dateReceived,
        });

        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();

        const allocationAmounts = new Map<string, number>();
        if (customAllocations && customAllocations.length > 0) {
            for (const ca of customAllocations) {
                allocationAmounts.set(ca.recordId.toString(), ca.amount);
            }
        } else if (actualAmount !== plan.expected_amount && records.length > 0) {
            const totalExpected = records.reduce((s, r) => s + r.amount, 0);
            const ratio = totalExpected > 0 ? actualAmount / totalExpected : 1;
            for (const record of records) {
                allocationAmounts.set(record._id.toString(), Math.round(record.amount * ratio * 100) / 100);
            }
        }

        const incomeAccountId = transaction.accountId;
        let allVerified = records.length > 0;

        for (const record of records) {
            const newAmount = allocationAmounts.get(record._id.toString()) ?? record.amount;
            const isRefill = record.accountId === incomeAccountId;
            const newStatus = isRefill ? "verified" : "reserved";
            if (newStatus !== "verified") allVerified = false;
            await ctx.db.patch(record._id, {
                is_forecast: false,
                verification_status: newStatus,
                amount: newAmount,
            });
        }

        // Gap 11: If every allocation target is the income account, jump straight to completed
        if (allVerified && records.length > 0) {
            await ctx.db.patch(planId, { status: "completed" });
        }

        // Idempotent goal balance: only apply if plan was NOT previously matched
        if (!wasAlreadyMatched) {
            for (const record of records) {
                const finalAmount = allocationAmounts.get(record._id.toString()) ?? record.amount;
                const linkedGoal = await ctx.db
                    .query("goals")
                    .withIndex("by_account", (q) => q.eq("linked_account_id", record.accountId))
                    .first();

                if (linkedGoal && !linkedGoal.is_completed) {
                    await ctx.db.insert("goal_contributions", {
                        userId: plan.userId,
                        goalId: linkedGoal._id,
                        income_plan_id: planId,
                        amount: finalAmount,
                        contribution_date: dateReceived,
                        source: "income_allocation",
                        note: `Income: ${plan.label}`,
                        createdAt: Date.now(),
                    });
                }
            }
        }

        // Gap 7: JIT recurrence — generate next plan using FRESH allocation rules,
        // not a copy of the current (possibly customized) records.
        let nextDate: string | null = null;
        if (plan.schedule_pattern?.type === "monthly_dates" && plan.schedule_pattern.days.length > 0) {
            nextDate = computeNextMonthlyDate(plan.schedule_pattern.days, new Date(dateReceived));
        } else if (plan.recurrence && plan.recurrence !== "once") {
            nextDate = computeNextDateFromRecurrence(plan.recurrence, dateReceived);
        }

        if (nextDate) {
            const existingNext = allPlans.find(
                (p) => p.label === plan.label && p.expected_date === nextDate
            );

            if (!existingNext) {
                const nextPlanId = await ctx.db.insert("income_plans", {
                    userId: plan.userId,
                    label: plan.label,
                    expected_date: nextDate,
                    expected_amount: plan.expected_amount,
                    recurrence: plan.recurrence,
                    status: "planned",
                    notes: plan.notes,
                    schedule_pattern: plan.schedule_pattern,
                    createdAt: Date.now(),
                });

                // Gap 7: Run fresh allocation rules instead of copying customized records
                const rules = await ctx.db
                    .query("allocation_rules")
                    .withIndex("by_user", (q) => q.eq("userId", plan.userId))
                    .collect();
                const freshAllocations = calculateAllocations(plan.expected_amount, rules);
                for (const alloc of freshAllocations) {
                    await ctx.db.insert("allocation_records", {
                        userId: plan.userId,
                        income_plan_id: nextPlanId,
                        accountId: alloc.accountId,
                        rule_id: alloc.ruleId,
                        amount: alloc.amount,
                        category: alloc.category,
                        is_forecast: true,
                        verification_status: "pending",
                        createdAt: Date.now(),
                    });
                }
            }
        }
    },
});

export const unmatchIncomePlan = mutation({
    args: { planId: v.id("income_plans") },
    handler: async (ctx, { planId }) => {
        const contributions = await ctx.db
            .query("goal_contributions")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        for (const contrib of contributions) {
            await ctx.db.delete(contrib._id);
        }

        await ctx.db.patch(planId, {
            status: "planned",
            matched_transaction_id: undefined,
            actual_amount: undefined,
            date_received: undefined,
        });

        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        for (const record of records) {
            await ctx.db.patch(record._id, {
                is_forecast: true,
                verification_status: "pending",
                transfer_transaction_id: undefined,
            });
        }
    },
});

// Gap 6: Atomic unmatch + allocation reset in a single backend step.
// Replaces the two-call client-side pattern: unmatch() then runAllocations().
export const unmatchAndResetAllocations = mutation({
    args: {
        planId: v.id("income_plans"),
        userId: v.id("users"),
    },
    handler: async (ctx, { planId, userId }) => {
        const plan = await ctx.db.get(planId);
        if (!plan || plan.userId !== userId) throw new Error("Plan not found");

        // Reverse goal contributions
        const contributions = await ctx.db
            .query("goal_contributions")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        for (const contrib of contributions) {
            await ctx.db.delete(contrib._id);
        }

        // Reset plan status
        await ctx.db.patch(planId, {
            status: "planned",
            matched_transaction_id: undefined,
            actual_amount: undefined,
            date_received: undefined,
        });

        // Delete all allocation records (full reset — re-run rules from scratch)
        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        for (const record of records) {
            await ctx.db.delete(record._id);
        }

        // Re-run allocation rules against expected_amount
        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const freshAllocations = calculateAllocations(plan.expected_amount, rules);
        for (const alloc of freshAllocations) {
            await ctx.db.insert("allocation_records", {
                userId,
                income_plan_id: planId,
                accountId: alloc.accountId,
                rule_id: alloc.ruleId,
                amount: alloc.amount,
                category: alloc.category,
                is_forecast: true,
                verification_status: "pending",
                createdAt: Date.now(),
            });
        }
    },
});

export const markMissed = mutation({
    args: { planId: v.id("income_plans") },
    handler: async (ctx, { planId }) => {
        const plan = await ctx.db.get(planId);
        if (!plan) return;

        if (plan.status === "matched" || plan.status === "completed") {
            const contributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
                .collect();
            for (const contrib of contributions) {
                await ctx.db.delete(contrib._id);
            }
        }

        await ctx.db.patch(planId, { status: "missed" });

        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        for (const record of records) {
            await ctx.db.delete(record._id);
        }
    },
});

export const markPlanned = mutation({
    args: { planId: v.id("income_plans") },
    handler: async (ctx, { planId }) => {
        const plan = await ctx.db.get(planId);
        if (!plan) return;

        await ctx.db.patch(planId, {
            status: "planned",
            matched_transaction_id: undefined,
            actual_amount: undefined,
            date_received: undefined,
        });

        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", plan.userId))
            .collect();

        const activeRules = rules.filter((r) => r.active).sort((a, b) => a.priority - b.priority);
        const income = plan.expected_amount;
        let remaining = income;

        const toInsert: Array<{ ruleId: typeof activeRules[0]["_id"]; accountId: typeof activeRules[0]["accountId"]; category: string; amount: number }> = [];
        for (const rule of activeRules) {
            let amount: number;
            if (rule.ruleType === "percent") {
                amount = Math.round((income * rule.value) / 100 * 100) / 100;
            } else {
                amount = rule.value;
            }
            if (rule === activeRules[activeRules.length - 1] && rule.ruleType === "percent" && rule.value === 100) {
                amount = Math.max(0, remaining);
            }
            amount = Math.min(amount, Math.max(0, remaining));
            toInsert.push({ ruleId: rule._id, accountId: rule.accountId, category: rule.category, amount });
            remaining -= amount;
        }

        for (const alloc of toInsert) {
            await ctx.db.insert("allocation_records", {
                userId: plan.userId,
                income_plan_id: planId,
                accountId: alloc.accountId,
                rule_id: alloc.ruleId,
                amount: alloc.amount,
                category: alloc.category,
                is_forecast: true,
                verification_status: "pending",
                createdAt: Date.now(),
            });
        }
    },
});

export const getSuggestedMatches = query({
    args: {
        planId: v.id("income_plans"),
        userId: v.id("users"),
    },
    handler: async (ctx, { planId, userId }) => {
        const plan = await ctx.db.get(planId);
        if (!plan) return [];

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const expectedDate = new Date(plan.expected_date).getTime();
        const dayRange = 14 * 24 * 60 * 60 * 1000;

        const candidates = transactions
            .filter((t) => t.amount > 0)
            .filter((t) => Math.abs(t.date - expectedDate) <= dayRange)
            .map((t) => ({
                ...t,
                amountDiff: Math.abs(t.amount - plan.expected_amount),
                dateDiff: Math.abs(t.date - expectedDate),
            }))
            .sort((a, b) => a.amountDiff - b.amountDiff)
            .slice(0, 5);

        const allPlans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const matchedTxIds = new Set(
            allPlans
                .filter((p) => p.matched_transaction_id)
                .map((p) => p.matched_transaction_id!.toString())
        );

        return candidates.map((c) => ({
            _id: c._id,
            amount: c.amount,
            date: c.date,
            description: c.description,
            amountDiff: c.amountDiff,
            dateDiff: c.dateDiff,
            alreadyMatched: matchedTxIds.has(c._id.toString()),
        }));
    },
});

export const getPlansForTransaction = query({
    args: {
        transactionId: v.id("transactions"),
        userId: v.id("users"),
    },
    handler: async (ctx, { transactionId, userId }) => {
        const transaction = await ctx.db.get(transactionId);
        if (!transaction) return [];

        const txDate = transaction.date;
        const txAmount = transaction.amount;
        const dayRange = 14 * 24 * 60 * 60 * 1000;

        const plans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return plans
            .filter((p) => p.status === "planned")
            .map((p) => {
                const expectedDate = new Date(p.expected_date).getTime();
                return {
                    _id: p._id,
                    label: p.label,
                    expected_date: p.expected_date,
                    expected_amount: p.expected_amount,
                    recurrence: p.recurrence,
                    amountDiff: Math.abs(txAmount - p.expected_amount),
                    dateDiff: Math.abs(txDate - expectedDate),
                };
            })
            .filter((p) => p.dateDiff <= dayRange)
            .sort((a, b) => a.amountDiff - b.amountDiff)
            .slice(0, 10);
    },
});

export const getIncomeSummary = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const plans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const thisMonth = plans.filter((p) => p.expected_date.startsWith(currentMonth));
        const planned = thisMonth.filter((p) => p.status === "planned");
        const matched = thisMonth.filter((p) => p.status === "matched" || p.status === "completed");
        const missed = thisMonth.filter((p) => p.status === "missed");

        const totalPlanned = planned.reduce((sum, p) => sum + p.expected_amount, 0);
        const totalMatched = matched.reduce((sum, p) => sum + (p.actual_amount ?? p.expected_amount), 0);
        const totalMissed = missed.reduce((sum, p) => sum + p.expected_amount, 0);

        const todayStr = now.toISOString().split("T")[0];
        const upcoming = plans
            .filter((p) => p.status === "planned" && p.expected_date >= todayStr)
            .sort((a, b) => a.expected_date.localeCompare(b.expected_date))
            .slice(0, 5);

        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}`;
        const recentMatched = plans.filter(
            (p) => (p.status === "matched" || p.status === "completed") && p.expected_date >= sixMonthsAgoStr && p.expected_date < currentMonth
        );
        const distinctMonths = new Set(recentMatched.map((p) => p.expected_date.slice(0, 7))).size;
        const avgMonthlyIncome = distinctMonths > 0
            ? Math.round(recentMatched.reduce((s, p) => s + (p.actual_amount ?? p.expected_amount), 0) / distinctMonths)
            : 0;

        return {
            thisMonth: {
                plannedCount: planned.length,
                matchedCount: matched.length,
                missedCount: missed.length,
                totalPlanned,
                totalMatched,
                totalMissed,
            },
            upcoming,
            avgMonthlyIncome,
        };
    },
});
