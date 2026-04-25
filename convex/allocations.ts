// convex/allocations.ts
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Shared allocation engine logic — exported for use in incomePlans.ts
export function calculateAllocations(
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

// Run allocations for an income plan and persist records.
// Gap 3: Preserves already-verified records — only resets non-verified ones.
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
        const isForecast = plan.status !== "matched" && plan.status !== "completed";
        const verificationStatus = isForecast ? "pending" : "reserved";

        const allocations = calculateAllocations(amount, rules);

        const existing = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", incomePlanId))
            .collect();

        // Gap 3: Keep verified records as-is; delete only non-verified ones
        const verified = existing.filter((r) => r.verification_status === "verified");
        const nonVerified = existing.filter((r) => r.verification_status !== "verified");
        const verifiedAccountIds = new Set(verified.map((r) => r.accountId.toString()));

        for (const record of nonVerified) {
            await ctx.db.delete(record._id);
        }

        // Insert fresh records only for accounts that don't already have a verified record
        for (const alloc of allocations) {
            if (!verifiedAccountIds.has(alloc.accountId.toString())) {
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
                // Use actual allocation records for matched/completed plans; re-calculate for planned
                if (plan.status === "matched" || plan.status === "completed") {
                    const records = await ctx.db
                        .query("allocation_records")
                        .withIndex("by_income_plan", (q) => q.eq("income_plan_id", plan._id))
                        .collect();
                    const amount = plan.actual_amount ?? plan.expected_amount;
                    totalIncome += amount;
                    for (const record of records) {
                        if (record.category === "savings") totalSavings += record.amount;
                        else if (record.category === "investing") totalInvesting += record.amount;
                        else if (record.category === "spending") totalSpending += record.amount;
                        else if (record.category === "debt") totalDebt += record.amount;
                    }
                } else {
                    const amount = plan.expected_amount;
                    totalIncome += amount;
                    const allocations = calculateAllocations(amount, rules);
                    for (const alloc of allocations) {
                        if (alloc.category === "savings") totalSavings += alloc.amount;
                        else if (alloc.category === "investing") totalInvesting += alloc.amount;
                        else if (alloc.category === "spending") totalSpending += alloc.amount;
                        else if (alloc.category === "debt") totalDebt += alloc.amount;
                    }
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

// Add a single allocation record to an income plan.
// Gap 4: Prefers the refill-scoped rule for the target account to ensure budget pool inclusion.
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

        // Gap 4: prefer refill rule for this account → any rule for this account → rules[0]
        const matchingRule =
            rules.find((r) => r.accountId === accountId && r.scope === "refill") ??
            rules.find((r) => r.accountId === accountId) ??
            rules[0];
        if (!matchingRule) throw new Error("No allocation rules exist");

        await ctx.db.insert("allocation_records", {
            userId: plan.userId,
            income_plan_id: incomePlanId,
            accountId,
            rule_id: matchingRule._id,
            amount: Math.max(0, amount),
            category,
            is_forecast: plan.status !== "matched" && plan.status !== "completed",
            verification_status: (plan.status === "matched" || plan.status === "completed") ? "reserved" : "pending",
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

// Passive verification: scan for transfers from income account → goal accounts.
// Call fire-and-forget after match. Marks allocations as "verified" when transfer is found.
export const verifyAllocations = mutation({
    args: {
        planId: v.id("income_plans"),
    },
    handler: async (ctx, { planId }) => {
        const plan = await ctx.db.get(planId);
        if (!plan || (plan.status !== "matched" && plan.status !== "completed") || !plan.date_received) return;

        const incomeAccount = plan.matched_transaction_id
            ? (await ctx.db.get(plan.matched_transaction_id))?.accountId
            : undefined;

        const records = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();

        const dateAnchor = new Date(plan.date_received).getTime();
        const windowMs = 10 * 24 * 60 * 60 * 1000; // 10 days

        // Cache outflows from income account to avoid re-querying per record
        let incomeOutflows: Array<{ _id: Id<"transactions">; amount: number; date: number }> | undefined;
        if (incomeAccount) {
            incomeOutflows = (await ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", incomeAccount))
                .collect()).filter((t) => t.amount < 0);
        }

        for (const record of records) {
            if (record.verification_status === "verified") continue;
            if (incomeAccount && record.accountId === incomeAccount) continue;

            const inflows = await ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", record.accountId))
                .collect();

            const amountTolerance = record.amount * 0.05;

            for (const tx of inflows) {
                if (Math.abs(tx.date - dateAnchor) > windowMs) continue;
                if (Math.abs(tx.amount - record.amount) > amountTolerance) continue;

                // Adaptive outflow check: enforce only when the income account has outflows
                // in the window (i.e., it's being tracked). Otherwise, trust the inflow.
                if (incomeOutflows) {
                    const outflowsInWindow = incomeOutflows.filter(
                        (o) => Math.abs(o.date - dateAnchor) <= windowMs
                    );
                    if (outflowsInWindow.length > 0) {
                        const hasMatchingOutflow = outflowsInWindow.some(
                            (o) => Math.abs(Math.abs(o.amount) - record.amount) <= amountTolerance
                        );
                        if (!hasMatchingOutflow) continue;
                    }
                }

                await ctx.db.patch(record._id, {
                    verification_status: "verified",
                    transfer_transaction_id: tx._id,
                });
                break;
            }
        }

        // Gap 11: promote to completed if all allocations are now verified
        const updatedRecords = await ctx.db
            .query("allocation_records")
            .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
            .collect();
        if (
            updatedRecords.length > 0 &&
            updatedRecords.every((r) => r.verification_status === "verified") &&
            plan.status !== "completed"
        ) {
            await ctx.db.patch(planId, { status: "completed" });
        }
    },
});

// Monthly Safe to Spend context: refill pool vs actual expenses.
// Returns pool breakdown (verified/reserved/pending) for the SafeToSpendCard.
export const getMonthlyBudgetContext = query({
    args: {
        userId: v.id("users"),
        monthKey: v.string(), // "YYYY-MM"
    },
    handler: async (ctx, { userId, monthKey }) => {
        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Gap 4 fix: identify refill accounts by accountId (not rule_id), more robust against
        // manually-added records that may have been assigned an incorrect rule_id.
        const refillAccountIds = new Set(
            rules.filter((r) => r.scope === "refill").map((r) => r.accountId.toString())
        );

        const plans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const monthPlans = plans.filter((p) => p.expected_date.startsWith(monthKey));

        let verifiedPool = 0;
        let reservedPool = 0;
        let pendingPool = 0;

        for (const plan of monthPlans) {
            const records = await ctx.db
                .query("allocation_records")
                .withIndex("by_income_plan", (q) => q.eq("income_plan_id", plan._id))
                .collect();
            for (const record of records) {
                if (!refillAccountIds.has(record.accountId.toString())) continue;
                const status = record.verification_status ?? "pending";
                if (status === "verified") verifiedPool += record.amount;
                else if (status === "reserved") reservedPool += record.amount;
                else pendingPool += record.amount;
            }
        }

        const totalPool = verifiedPool + reservedPool + pendingPool;

        // Build category -> transactionType map for reimbursement detection
        const categories = await ctx.db.query("categories").collect();
        const categoryTypeMap = new Map(
            categories
                .filter((c) => c.transactionType)
                .map((c) => [c._id.toString(), c.transactionType!])
        );

        const [year, month] = monthKey.split("-").map(Number);
        const startMs = new Date(year, month - 1, 1).getTime();
        const endMs = new Date(year, month, 1).getTime();

        const allTx = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const monthTx = allTx.filter(
            (t) => t.date >= startMs && t.date < endMs && t.transactionType !== "transfer"
        );

        let grossSpent = 0;
        let reimbursements = 0;
        for (const t of monthTx) {
            const catType = t.categoryId ? categoryTypeMap.get(t.categoryId.toString()) : undefined;
            const isReimbursement = t.amount > 0 && (t.transactionType === "expense" || catType === "expense");
            if (isReimbursement) {
                reimbursements += t.amount;
            } else if (t.amount < 0) {
                grossSpent += Math.abs(t.amount);
            }
        }
        const totalSpent = Math.max(0, grossSpent - reimbursements);

        return {
            monthKey,
            totalPool: Math.round(totalPool * 100) / 100,
            verifiedPool: Math.round(verifiedPool * 100) / 100,
            reservedPool: Math.round(reservedPool * 100) / 100,
            pendingPool: Math.round(pendingPool * 100) / 100,
            totalSpent: Math.round(totalSpent * 100) / 100,
            remaining: Math.round((totalPool - totalSpent) * 100) / 100,
        };
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

// Observer: called whenever a positive transaction lands in any account.
// Scans reserved allocation records for that account and verifies matches.
//
// Outflow check is adaptive:
//   - If the income account has outflows in the window → require a matching one (gold standard).
//   - If the income account has NO outflows in the window → the account is likely not fully
//     tracked; verify on the inflow alone so manually-created transfer transactions still work.
export const verifyAccountAllocations = internalMutation({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, { accountId }) => {
        const allRecords = await ctx.db
            .query("allocation_records")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .collect();

        const usedTxIds = new Set(
            allRecords
                .filter((r) => r.transfer_transaction_id)
                .map((r) => r.transfer_transaction_id!.toString())
        );

        const reserved = allRecords.filter(
            (r) => r.verification_status === "reserved" && !r.transfer_transaction_id
        );
        if (reserved.length === 0) return;

        // Enrich with plan date + income account, sorted oldest-first so earlier months get priority
        type EnrichedRecord = {
            record: typeof reserved[0];
            dateAnchor: string;
            incomeAccountId: Id<"accounts"> | undefined;
        };
        const enriched: EnrichedRecord[] = [];
        for (const r of reserved) {
            const plan = await ctx.db.get(r.income_plan_id);
            if (plan?.status === "matched" || plan?.status === "completed") {
                let incomeAccountId: Id<"accounts"> | undefined;
                if (plan.matched_transaction_id) {
                    const matchedTx = await ctx.db.get(plan.matched_transaction_id);
                    incomeAccountId = matchedTx?.accountId;
                }
                enriched.push({
                    record: r,
                    dateAnchor: plan.date_received ?? plan.expected_date,
                    incomeAccountId,
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

        // Cache outflows per income account (lazy, keyed by accountId)
        const outflowsCache = new Map<string, Array<{ amount: number; date: number }>>();
        async function getIncomeOutflows(incomeAccId: Id<"accounts">) {
            const key = incomeAccId.toString();
            if (!outflowsCache.has(key)) {
                const txs = await ctx.db
                    .query("transactions")
                    .withIndex("by_account", (q) => q.eq("accountId", incomeAccId))
                    .collect();
                outflowsCache.set(key, txs.filter((t) => t.amount < 0));
            }
            return outflowsCache.get(key)!;
        }

        const windowMs = 10 * 24 * 60 * 60 * 1000;
        const verifiedPlanIds = new Set<Id<"income_plans">>();

        for (const { record, dateAnchor, incomeAccountId } of enriched) {
            const anchor = new Date(dateAnchor).getTime();
            const tolerance = record.amount * 0.05;

            const matchingInflow = inflows.find(
                (t) =>
                    !usedTxIds.has(t._id.toString()) &&
                    Math.abs(t.date - anchor) <= windowMs &&
                    Math.abs(t.amount - record.amount) <= tolerance
            );

            if (!matchingInflow) continue;

            // Adaptive outflow check: only enforce if the income account has ANY outflows
            // in the window — meaning it's being tracked. If there are none, the income
            // account's transactions aren't in the system; trust the inflow alone.
            if (incomeAccountId) {
                const outflows = await getIncomeOutflows(incomeAccountId);
                const outflowsInWindow = outflows.filter(
                    (o) => Math.abs(o.date - anchor) <= windowMs
                );
                if (outflowsInWindow.length > 0) {
                    // Income account is tracked — require a matching outflow
                    const hasMatchingOutflow = outflowsInWindow.some(
                        (o) => Math.abs(Math.abs(o.amount) - record.amount) <= tolerance
                    );
                    if (!hasMatchingOutflow) continue;
                }
                // No outflows in window → income account not tracked → proceed without check
            }

            await ctx.db.patch(record._id, {
                verification_status: "verified",
                transfer_transaction_id: matchingInflow._id,
            });
            usedTxIds.add(matchingInflow._id.toString());
            verifiedPlanIds.add(record.income_plan_id);
        }

        // Gap 11: Promote plans to "completed" if all their allocations are now verified
        for (const planId of verifiedPlanIds) {
            const plan = await ctx.db.get(planId);
            if (!plan || plan.status === "completed") continue;
            const planRecords = await ctx.db
                .query("allocation_records")
                .withIndex("by_income_plan", (q) => q.eq("income_plan_id", planId))
                .collect();
            if (planRecords.length > 0 && planRecords.every((r) => r.verification_status === "verified")) {
                await ctx.db.patch(planId, { status: "completed" });
            }
        }
    },
});
