// convex/incomePlans.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
        // Delete associated allocation records
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
    },
    handler: async (ctx, { planId, transactionId }) => {
        const transaction = await ctx.db.get(transactionId);
        if (!transaction) throw new Error("Transaction not found");

        await ctx.db.patch(planId, {
            status: "matched",
            matched_transaction_id: transactionId,
            actual_amount: transaction.amount,
            date_received: new Date(transaction.date).toISOString().split("T")[0],
        });

        // Update allocation records to no longer be forecast
        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        for (const record of records) {
            await ctx.db.patch(record._id, { is_forecast: false });
        }
    },
});

export const unmatchIncomePlan = mutation({
    args: { planId: v.id("income_plans") },
    handler: async (ctx, { planId }) => {
        await ctx.db.patch(planId, {
            status: "planned",
            matched_transaction_id: undefined,
            actual_amount: undefined,
            date_received: undefined,
        });

        // Revert allocation records to forecast
        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        for (const record of records) {
            await ctx.db.patch(record._id, { is_forecast: true });
        }
    },
});

export const markMissed = mutation({
    args: { planId: v.id("income_plans") },
    handler: async (ctx, { planId }) => {
        await ctx.db.patch(planId, { status: "missed" });

        // Delete allocation records for missed income
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
        await ctx.db.patch(planId, { status: "planned" });
    },
});

// Find income transactions that could match a plan
export const getSuggestedMatches = query({
    args: {
        planId: v.id("income_plans"),
        userId: v.id("users"),
    },
    handler: async (ctx, { planId, userId }) => {
        const plan = await ctx.db.get(planId);
        if (!plan) return [];

        // Get all income transactions (positive amounts)
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const expectedDate = new Date(plan.expected_date).getTime();
        const dayRange = 30 * 24 * 60 * 60 * 1000; // 30 days

        // Filter to income transactions near the expected date/amount
        const candidates = transactions
            .filter((t) => t.amount > 0) // Income only
            .filter((t) => Math.abs(t.date - expectedDate) <= dayRange) // Within 7 days
            .map((t) => ({
                ...t,
                amountDiff: Math.abs(t.amount - plan.expected_amount),
                dateDiff: Math.abs(t.date - expectedDate),
            }))
            .sort((a, b) => a.amountDiff - b.amountDiff) // Best amount match first
            .slice(0, 5);

        // Check which transactions are already matched to other plans
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

// Find planned income plans that could match a given transaction (reverse flow)
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
        const dayRange = 30 * 24 * 60 * 60 * 1000; // 30 days

        // Get all planned income plans for this user
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

// Get summary stats for dashboard
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
        const matched = thisMonth.filter((p) => p.status === "matched");
        const missed = thisMonth.filter((p) => p.status === "missed");

        const totalPlanned = planned.reduce((sum, p) => sum + p.expected_amount, 0);
        const totalMatched = matched.reduce((sum, p) => sum + (p.actual_amount ?? p.expected_amount), 0);
        const totalMissed = missed.reduce((sum, p) => sum + p.expected_amount, 0);

        // Upcoming: planned income in the future
        const todayStr = now.toISOString().split("T")[0];
        const upcoming = plans
            .filter((p) => p.status === "planned" && p.expected_date >= todayStr)
            .sort((a, b) => a.expected_date.localeCompare(b.expected_date))
            .slice(0, 5);

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
        };
    },
});
