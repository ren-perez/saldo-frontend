// convex/allocations.ts
import { mutation, query, internalMutation } from "./_generated/server";
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
        const verificationStatus = isForecast ? "pending" : "reserved";

        const allocations = calculateAllocations(amount, rules);

        // Delete existing records
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
                verification_status: verificationStatus,
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
        await ctx.db.patch(recordId, { amount: Math.max(0, amount) });
    },
});

// Get allocation records for a specific income plan, enriched with account/goal info
export const getAllocationsForPlan = query({
    args: { incomePlanId: v.id("income_plans") },
    handler: async (ctx, { incomePlanId }) => {
        const plan = await ctx.db.get(incomePlanId);
        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", incomePlanId))
            .collect();

        const allGoals = plan
            ? await ctx.db.query("goals").withIndex("by_user", (q) => q.eq("userId", plan.userId)).collect()
            : [];

        const enriched = await Promise.all(
            records.map(async (record) => {
                const account = await ctx.db.get(record.accountId);
                const linkedGoal = allGoals.find(
                    (g) => g.linked_account_id === record.accountId && !g.is_completed
                );
                return {
                    ...record,
                    accountName: account?.name ?? "Unknown",
                    goalName: linkedGoal?.name ?? null,
                    goalEmoji: linkedGoal?.emoji ?? null,
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

// Add a single allocation record to an income plan
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
            verification_status: plan.status === "matched" ? "reserved" : "pending",
            createdAt: Date.now(),
        });
    },
});

// Delete a single allocation record
export const deleteAllocationRecord = mutation({
    args: {
        recordId: v.id("allocation_records"),
    },
    handler: async (ctx, { recordId }) => {
        await ctx.db.delete(recordId);
    },
});

// Passive verification: scan for transfers from income account → goal accounts
// Call fire-and-forget after match. Marks allocations as "verified" when transfer is found.
export const verifyAllocations = mutation({
    args: {
        planId: v.id("income_plans"),
    },
    handler: async (ctx, { planId }) => {
        const plan = await ctx.db.get(planId);
        if (!plan || plan.status !== "matched" || !plan.date_received) return;

        const incomeAccount = plan.matched_transaction_id
            ? (await ctx.db.get(plan.matched_transaction_id))?.accountId
            : undefined;

        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();

        const dateAnchor = new Date(plan.date_received).getTime();
        const windowMs = 10 * 24 * 60 * 60 * 1000; // 10 days (covers weekends)

        for (const record of records) {
            if (record.verification_status === "verified") continue;

            // Scan transactions to the allocation's target account (inflow)
            const inflows = await ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", record.accountId))
                .collect();

            const amountTolerance = record.amount * 0.05;

            for (const tx of inflows) {
                if (Math.abs(tx.date - dateAnchor) > windowMs) continue;
                if (Math.abs(tx.amount - record.amount) > amountTolerance) continue;

                // Gold standard check: if we know the income account, verify outflow matches
                if (incomeAccount) {
                    const outflows = await ctx.db
                        .query("transactions")
                        .withIndex("by_account", (q) => q.eq("accountId", incomeAccount))
                        .collect();
                    const matchingOutflow = outflows.find(
                        (o) =>
                            o.amount < 0 &&
                            Math.abs(Math.abs(o.amount) - record.amount) <= amountTolerance &&
                            Math.abs(o.date - dateAnchor) <= windowMs
                    );
                    if (!matchingOutflow) continue; // outflow didn't exist → likely false positive
                }

                await ctx.db.patch(record._id, {
                    verification_status: "verified",
                    transfer_transaction_id: tx._id,
                });
                break;
            }
        }
    },
});

// One-time migration: strip deprecated pre-refactor fields from allocation_records
export const migrateStripDeprecatedFields = mutation({
    args: {},
    handler: async (ctx) => {
        const records = await ctx.db.query("allocation_records").collect();
        let patched = 0;
        for (const record of records) {
            if (record.matched_amount !== undefined || record.status !== undefined || record.label !== undefined || record.matched_transaction_id !== undefined) {
                await ctx.db.patch(record._id, {
                    matched_amount: undefined,
                    status: undefined,
                    label: undefined,
                    matched_transaction_id: undefined,
                });
                patched++;
            }
        }
        return { patched };
    },
});

// Observer: called whenever a transaction lands in any account.
// If the account is goal-linked, scans reserved allocations and verifies matches.
export const verifyAccountAllocations = internalMutation({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, { accountId }) => {
        const linkedGoal = await ctx.db
            .query("goals")
            .withIndex("by_account", (q) => q.eq("linked_account_id", accountId))
            .first();
        if (!linkedGoal) return;

        const allRecords = await ctx.db
            .query("allocation_records")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .collect();

        // Track already-claimed transfer IDs to prevent double-matching
        const usedTxIds = new Set(
            allRecords
                .filter((r) => r.transfer_transaction_id)
                .map((r) => r.transfer_transaction_id!.toString())
        );

        const reserved = allRecords.filter(
            (r) => r.verification_status === "reserved" && !r.transfer_transaction_id
        );
        if (reserved.length === 0) return;

        // Enrich with plan date and sort oldest-first so earlier months get priority
        const enriched: Array<{ record: typeof reserved[0]; dateAnchor: string }> = [];
        for (const r of reserved) {
            const plan = await ctx.db.get(r.income_plan_id);
            if (plan?.status === "matched") {
                enriched.push({
                    record: r,
                    dateAnchor: plan.date_received ?? plan.expected_date,
                });
            }
        }
        enriched.sort((a, b) => a.dateAnchor.localeCompare(b.dateAnchor));

        const inflows = (
            await ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", accountId))
                .collect()
        ).filter((t) => t.amount > 0);

        const windowMs = 10 * 24 * 60 * 60 * 1000;

        for (const { record, dateAnchor } of enriched) {
            const anchor = new Date(dateAnchor).getTime();
            const tolerance = record.amount * 0.05;

            const match = inflows.find(
                (t) =>
                    !usedTxIds.has(t._id.toString()) &&
                    Math.abs(t.date - anchor) <= windowMs &&
                    Math.abs(t.amount - record.amount) <= tolerance
            );

            if (match) {
                await ctx.db.patch(record._id, {
                    verification_status: "verified",
                    transfer_transaction_id: match._id,
                });
                usedTxIds.add(match._id.toString());
            }
        }
    },
});
