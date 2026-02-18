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

        // Delete existing records for this plan
        const existing = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", incomePlanId))
            .collect();
        for (const record of existing) {
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

        const allocations = calculateAllocations(amount, rules);
        const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

        return {
            allocations: allocations.map((a) => {
                const account = accounts.find((acc) => acc._id === a.accountId);
                return {
                    accountId: a.accountId,
                    accountName: account ? `${account.name}` : "Unknown",
                    category: a.category,
                    ruleType: rules.find((r) => r._id === a.ruleId)?.ruleType ?? "fixed",
                    ruleValue: rules.find((r) => r._id === a.ruleId)?.value ?? 0,
                    amount: a.amount,
                };
            }),
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
        // Only allow editing forecast (planned) allocations
        if (!record.is_forecast) throw new Error("Cannot edit matched allocations");
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
