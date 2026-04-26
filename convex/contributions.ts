// convex/contributions.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Enhanced contribution creation with multiple source types
export const createContribution = mutation({
    args: {
        userId: v.id("users"),
        goalId: v.id("goals"),
        amount: v.number(),
        source: v.string(), // "manual_ui" | "manual_tx" | "import" | "auto"
        accountId: v.optional(v.id("accounts")), // For transaction creation
        transactionId: v.optional(v.id("transactions")), // For existing tx
        note: v.optional(v.string()),
        contribution_date: v.string(),
        is_withdrawal: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Validate goal belongs to user
        const goal = await ctx.db.get(args.goalId);
        if (!goal || (goal as any).userId !== userId) {
            throw new Error("Goal not found or not authorized");
        }

        // Cap contribution so it doesn't exceed the goal target
        let contributionAmount = args.amount;
        if (!args.is_withdrawal) {
            const contributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_goal", (q: any) => q.eq("goalId", args.goalId))
                .collect();
            const currentTotal = contributions.reduce((sum: number, c: any) => sum + c.amount, 0);
            const remaining = (goal as any).total_amount - currentTotal;
            if (remaining <= 0) {
                throw new Error("Goal is already completed");
            }
            if (contributionAmount > remaining) {
                contributionAmount = remaining;
            }
        }

        let transactionId = args.transactionId;

        // Create transaction if account is provided and no transaction exists
        if (args.accountId && !transactionId) {
            const account = await ctx.db.get(args.accountId);
            if (!account || (account as any).userId !== userId) {
                throw new Error("Account not found or not authorized");
            }

            const transactionType = args.is_withdrawal ? "withdrawal" : "deposit";
            const description = args.is_withdrawal
                ? `Goal withdrawal: ${(goal as any).name}`
                : `Goal contribution: ${(goal as any).name}`;

            transactionId = await ctx.db.insert("transactions", {
                userId,
                accountId: args.accountId,
                amount: args.is_withdrawal ? -Math.abs(contributionAmount) : Math.abs(contributionAmount),
                date: new Date(args.contribution_date).getTime(),
                description,
                transactionType,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        // Create contribution
        const contributionId = await ctx.db.insert("goal_contributions", {
            userId,
            goalId: args.goalId,
            transactionId,
            amount: contributionAmount,
            note: args.note,
            contribution_date: args.contribution_date,
            source: args.source,
            is_withdrawal: args.is_withdrawal,
            createdAt: Date.now(),
        });

        // Update goal completion status
        await updateGoalCompletionStatus(ctx, args.goalId);

        return { _id: contributionId, transactionId };
    },
});

// Allocate existing transaction to goals
export const allocateTransactionToGoals = mutation({
    args: {
        userId: v.id("users"),
        transactionId: v.id("transactions"),
        allocations: v.array(v.object({
            goalId: v.id("goals"),
            amount: v.number(),
            note: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Validate transaction belongs to user
        const transaction = await ctx.db.get(args.transactionId);
        if (!transaction || (transaction as any).userId !== userId) {
            throw new Error("Transaction not found or not authorized");
        }

        // Validate allocations sum to transaction amount
        const totalAllocated = args.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
        if (Math.abs(totalAllocated - (transaction as any).amount) > 0.01) {
            throw new Error("Allocations must sum to transaction amount");
        }

        // Validate all goals belong to user
        for (const allocation of args.allocations) {
            const goal = await ctx.db.get(allocation.goalId);
            if (!goal || (goal as any).userId !== userId) {
                throw new Error("Goal not found or not authorized");
            }
        }

        // Create contributions for each allocation
        const contributionIds = [];
        for (const allocation of args.allocations) {
            const contributionId = await ctx.db.insert("goal_contributions", {
                userId,
                goalId: allocation.goalId,
                transactionId: args.transactionId,
                amount: allocation.amount,
                note: allocation.note,
                contribution_date: new Date((transaction as any).date).toISOString().split('T')[0],
                source: "manual_tx",
                createdAt: Date.now(),
            });
            contributionIds.push(contributionId);

            // Update goal completion status
            await updateGoalCompletionStatus(ctx, allocation.goalId);
        }

        return { contributionIds };
    },
});

// Transfer between goals
export const transferBetweenGoals = mutation({
    args: {
        userId: v.id("users"),
        fromGoalId: v.id("goals"),
        toGoalId: v.id("goals"),
        amount: v.number(),
        note: v.optional(v.string()),
        createTransactions: v.optional(v.boolean()), // For cross-account transfers
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Validate both goals belong to user
        const fromGoal = await ctx.db.get(args.fromGoalId);
        const toGoal = await ctx.db.get(args.toGoalId);

        if (!fromGoal || (fromGoal as any).userId !== userId ||
            !toGoal || (toGoal as any).userId !== userId) {
            throw new Error("Goals not found or not authorized");
        }

        // Check if sufficient balance exists in source goal
        const fromContributions = await ctx.db
            .query("goal_contributions")
            .withIndex("by_goal", (q) => q.eq("goalId", args.fromGoalId))
            .collect();

        const currentBalance = fromContributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        if (currentBalance < args.amount) {
            throw new Error("Insufficient balance in source goal");
        }

        const transferPairId = `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const transferDate = new Date().toISOString().split('T')[0];

        let fromTransactionId: Id<"transactions"> | undefined = undefined;
        let toTransactionId: Id<"transactions"> | undefined = undefined;

        // Create transactions if requested (for cross-account transfers)
        if (args.createTransactions) {
            const fromAccount = (fromGoal as any).linked_account_id;
            const toAccount = (toGoal as any).linked_account_id;

            if (fromAccount && toAccount && fromAccount !== toAccount) {
                // Cross-account transfer - create withdrawal and deposit transactions
                fromTransactionId = await ctx.db.insert("transactions", {
                    userId,
                    accountId: fromAccount,
                    amount: -args.amount,
                    date: Date.now(),
                    description: `Transfer to ${(toGoal as any).name}`,
                    transactionType: "transfer",
                    transfer_pair_id: transferPairId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });

                toTransactionId = await ctx.db.insert("transactions", {
                    userId,
                    accountId: toAccount,
                    amount: args.amount,
                    date: Date.now(),
                    description: `Transfer from ${(fromGoal as any).name}`,
                    transactionType: "transfer",
                    transfer_pair_id: transferPairId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
            }
        }

        // Create withdrawal contribution (negative)
        const withdrawalId = await ctx.db.insert("goal_contributions", {
            userId,
            goalId: args.fromGoalId,
            transactionId: fromTransactionId,
            amount: -args.amount,
            note: args.note ? `Transfer out: ${args.note}` : `Transfer to ${(toGoal as any).name}`,
            contribution_date: transferDate,
            source: "manual_ui",
            transfer_pair_id: transferPairId,
            is_withdrawal: true,
            createdAt: Date.now(),
        });

        // Create deposit contribution (positive)
        const depositId = await ctx.db.insert("goal_contributions", {
            userId,
            goalId: args.toGoalId,
            transactionId: toTransactionId,
            amount: args.amount,
            note: args.note ? `Transfer in: ${args.note}` : `Transfer from ${(fromGoal as any).name}`,
            contribution_date: transferDate,
            source: "manual_ui",
            transfer_pair_id: transferPairId,
            createdAt: Date.now(),
        });

        // Update goal completion statuses
        await updateGoalCompletionStatus(ctx, args.fromGoalId);
        await updateGoalCompletionStatus(ctx, args.toGoalId);

        return {
            withdrawalId,
            depositId,
            transferPairId,
            fromTransactionId,
            toTransactionId
        };
    },
});

// Withdraw from goal
export const withdrawFromGoal = mutation({
    args: {
        userId: v.id("users"),
        goalId: v.id("goals"),
        amount: v.number(),
        note: v.optional(v.string()),
        date: v.optional(v.string()),
        transactionId: v.optional(v.id("transactions")),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Validate amount
        if (args.amount <= 0) {
            throw new Error("Withdrawal amount must be greater than 0");
        }

        // Validate goal belongs to user
        const goal = await ctx.db.get(args.goalId);
        if (!goal || (goal as any).userId !== userId) {
            throw new Error("Goal not found or not authorized");
        }

        // For linked-account goals, validate the provided transactionId belongs to the user
        // (and ideally to the linked account, as a sanity check)
        if ((goal as any).tracking_type === "LINKED_ACCOUNT" && args.transactionId) {
            const tx = await ctx.db.get(args.transactionId);
            if (!tx || (tx as any).userId !== userId) {
                throw new Error("Transaction not found or not authorized");
            }
        }

        // Check if sufficient balance exists
        const contributions = await ctx.db
            .query("goal_contributions")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();

        const currentBalance = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        if (args.amount > currentBalance) {
            throw new Error("Withdrawal amount exceeds current goal balance");
        }

        const withdrawalDate = args.date || new Date().toISOString().split('T')[0];

        // Determine source: linked to a transaction vs pure manual entry
        const source = args.transactionId ? "manual_tx" : "manual_ui";

        // Create withdrawal contribution (negative amount)
        const contributionId = await ctx.db.insert("goal_contributions", {
            userId,
            goalId: args.goalId,
            transactionId: args.transactionId,
            amount: -args.amount,
            note: args.note,
            contribution_date: withdrawalDate,
            source,
            is_withdrawal: true,
            createdAt: Date.now(),
        });

        // Update goal completion status
        await updateGoalCompletionStatus(ctx, args.goalId);

        return { _id: contributionId };
    },
});

// Record any goal balance movement (positive = deposit, negative = withdrawal).
// Works for both MANUAL and LINKED_ACCOUNT goals.
// If accountId is provided a matching transaction is created on that account.
// If transactionId is provided the movement is paired with an existing transaction.
export const recordGoalMovement = mutation({
    args: {
        userId: v.id("users"),
        goalId: v.id("goals"),
        amount: v.number(),                            // signed: + deposit, - withdrawal
        note: v.optional(v.string()),
        date: v.string(),
        transactionId: v.optional(v.id("transactions")), // link existing tx
        accountId: v.optional(v.id("accounts")),         // create new tx on this account
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        if (args.amount === 0) throw new Error("Amount must be non-zero");

        const goal = await ctx.db.get(args.goalId);
        if (!goal || (goal as any).userId !== userId) {
            throw new Error("Goal not found or not authorized");
        }

        const isWithdrawal = args.amount < 0;
        const absAmount = Math.abs(args.amount);

        // Overdraw guard for withdrawals
        if (isWithdrawal) {
            const contributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
                .collect();
            const balance = contributions.reduce((s, c) => s + c.amount, 0);
            if (absAmount > balance) {
                throw new Error("Withdrawal amount exceeds current goal balance");
            }
        }

        let transactionId = args.transactionId;

        // Validate existing transaction ownership
        if (transactionId) {
            const tx = await ctx.db.get(transactionId);
            if (!tx || (tx as any).userId !== userId) {
                throw new Error("Transaction not found or not authorized");
            }
        }

        // Create transaction on linked account if accountId provided
        if (args.accountId && !transactionId) {
            const account = await ctx.db.get(args.accountId);
            if (!account || (account as any).userId !== userId) {
                throw new Error("Account not found or not authorized");
            }
            transactionId = await ctx.db.insert("transactions", {
                userId,
                accountId: args.accountId,
                amount: args.amount,           // signed
                date: new Date(args.date).getTime(),
                description: `Goal ${isWithdrawal ? "withdrawal" : "contribution"}: ${(goal as any).name}`,
                transactionType: isWithdrawal ? "withdrawal" : "deposit",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        const source = transactionId ? "manual_tx" : "manual_ui";

        const contributionId = await ctx.db.insert("goal_contributions", {
            userId,
            goalId: args.goalId,
            transactionId,
            amount: args.amount,               // signed
            note: args.note,
            contribution_date: args.date,
            source,
            is_withdrawal: isWithdrawal,
            createdAt: Date.now(),
        });

        await updateGoalCompletionStatus(ctx, args.goalId);

        return { _id: contributionId, transactionId };
    },
});

// Delete a contribution (restores goal balance automatically via dynamic calculation)
export const deleteContribution = mutation({
    args: {
        userId: v.id("users"),
        contributionId: v.id("goal_contributions"),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const contribution = await ctx.db.get(args.contributionId);
        if (!contribution || contribution.userId !== userId) {
            throw new Error("Contribution not found or not authorized");
        }

        const goalId = contribution.goalId;
        await ctx.db.delete(args.contributionId);

        // Recalculate goal completion status (balance restored automatically)
        await updateGoalCompletionStatus(ctx, goalId);

        return { success: true };
    },
});

// Update a contribution's amount, date, or note
export const updateContribution = mutation({
    args: {
        userId: v.id("users"),
        contributionId: v.id("goal_contributions"),
        amount: v.optional(v.number()),
        note: v.optional(v.string()),
        date: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const contribution = await ctx.db.get(args.contributionId);
        if (!contribution || contribution.userId !== userId) {
            throw new Error("Contribution not found or not authorized");
        }

        if (args.amount !== undefined && args.amount <= 0) {
            throw new Error("Amount must be greater than 0");
        }

        const updateData: Record<string, unknown> = {};

        if (args.amount !== undefined) {
            // Preserve sign (withdrawal = negative, deposit = positive)
            const isWithdrawal = contribution.is_withdrawal;
            updateData.amount = isWithdrawal ? -Math.abs(args.amount) : Math.abs(args.amount);
        }

        if (args.note !== undefined) updateData.note = args.note;
        if (args.date !== undefined) updateData.contribution_date = args.date;

        await ctx.db.patch(args.contributionId, updateData as any);

        // Recalculate goal completion status
        await updateGoalCompletionStatus(ctx, contribution.goalId);

        return { success: true };
    },
});

// Get recent transactions from a linked account for withdrawal matching
export const getAccountTransactionsForWithdrawal = query({
    args: {
        userId: v.id("users"),
        accountId: v.id("accounts"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db.get(args.accountId);
        if (!account || (account as any).userId !== args.userId) {
            return [];
        }

        const raw = await ctx.db
            .query("transactions")
            .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
            .order("desc")
            .take(args.limit || 50);

        // Mark each one as already-linked if it has an existing goal contribution
        const result = [];
        for (const tx of raw) {
            const existing = await ctx.db
                .query("goal_contributions")
                .withIndex("by_transaction", (q) => q.eq("transactionId", tx._id))
                .first();
            result.push({
                _id: tx._id,
                amount: (tx as any).amount,
                description: (tx as any).description,
                date: (tx as any).date,
                transactionType: (tx as any).transactionType,
                alreadyLinked: !!existing,
            });
        }

        return result;
    },
});

// Get unallocated transactions for goal linking
export const getUnallocatedTransactions = query({
    args: {
        userId: v.id("users"),
        accountId: v.optional(v.id("accounts")),
        limit: v.optional(v.number()),
        incomeOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const desiredLimit = args.limit || 50;
        // Fetch more than needed since we filter after fetching.
        // With "all accounts" most transactions may be expenses,
        // so we need a larger pool to find enough income transactions.
        const fetchLimit = args.incomeOnly ? desiredLimit * 6 : desiredLimit * 2;

        let transactions;

        if (args.accountId) {
            const accountId = args.accountId;
            transactions = await ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", accountId))
                .order("desc")
                .take(fetchLimit);
        } else {
            transactions = await ctx.db
                .query("transactions")
                .withIndex("by_user", (q) => q.eq("userId", args.userId))
                .order("desc")
                .take(fetchLimit);
        }

        // Filter for income-only if requested
        if (args.incomeOnly) {
            transactions = transactions.filter(t => t.amount > 0);
        }

        // Build set of transaction IDs already matched to an income plan
        const incomePlans = await ctx.db
            .query("income_plans")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        const matchedByIncomePlan = new Set(
            incomePlans
                .filter((p) => p.matched_transaction_id)
                .map((p) => p.matched_transaction_id!.toString())
        );

        // Filter out transactions that already have contributions or are matched to an income plan
        const unallocatedTransactions = [];
        for (const transaction of transactions) {
            if (unallocatedTransactions.length >= desiredLimit) break;

            if (matchedByIncomePlan.has(transaction._id.toString())) continue;

            const existingContributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_transaction", (q) => q.eq("transactionId", transaction._id))
                .collect();

            if (existingContributions.length === 0) {
                // Get account info
                const account = await ctx.db.get(transaction.accountId);
                unallocatedTransactions.push({
                    ...transaction,
                    account: account ? {
                        _id: account._id,
                        name: (account as any).name,
                        type: (account as any).type,
                    } : null,
                });
            }
        }

        return unallocatedTransactions;
    },
});

// Get goals for account allocation
export const getGoalsForAllocation = query({
    args: {
        userId: v.id("users"),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        let goalsQuery = ctx.db
            .query("goals")
            .withIndex("by_user", (q) => q.eq("userId", args.userId));

        const allGoals = await goalsQuery.collect();

        // Filter goals that are either not linked to an account or linked to the specified account
        const availableGoals = allGoals.filter(goal => {
            if (!args.accountId) return true; // If no account specified, show all goals
            return !goal.linked_account_id || goal.linked_account_id === args.accountId;
        });

        // Add current balance and account info to each goal
        const goalsWithBalance = await Promise.all(
            availableGoals.map(async (goal) => {
                const contributions = await ctx.db
                    .query("goal_contributions")
                    .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
                    .collect();

                const currentAmount = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);

                // Get account info if linked
                let account = null;
                if (goal.linked_account_id) {
                    const accountData = await ctx.db.get(goal.linked_account_id);
                    if (accountData) {
                        account = {
                            _id: accountData._id,
                            name: (accountData as any).name,
                            type: (accountData as any).type,
                        };
                    }
                }

                return {
                    _id: goal._id,
                    name: goal.name,
                    total_amount: goal.total_amount,
                    current_amount: currentAmount,
                    emoji: goal.emoji,
                    color: goal.color,
                    linked_account_id: goal.linked_account_id,
                    account,
                };
            })
        );

        return goalsWithBalance;
    },
});

// Get comprehensive contribution history
export const getContributionHistory = query({
    args: {
        userId: v.id("users"),
        goalId: v.optional(v.id("goals")),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let contributions;

        if (args.goalId) {
            const goalId = args.goalId;
            contributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_goal", (q) => q.eq("goalId", goalId))
                .order("desc")
                .take(args.limit || 100);
        } else {
            contributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_user", (q) => q.eq("userId", args.userId))
                .order("desc")
                .take(args.limit || 100);
        }

        // Filter by date range if provided
        if (args.startDate || args.endDate) {
            contributions = contributions.filter(contrib => {
                const contribDate = contrib.contribution_date;
                if (args.startDate && contribDate < args.startDate) return false;
                if (args.endDate && contribDate > args.endDate) return false;
                return true;
            });
        }

        // Enrich with related data
        const enrichedContributions = await Promise.all(
            contributions.map(async (contrib) => {
                // Get goal info
                const goal = await ctx.db.get(contrib.goalId);

                // Get transaction info if exists
                let transaction = null;
                if (contrib.transactionId) {
                    const tx = await ctx.db.get(contrib.transactionId);
                    if (tx) {
                        // Get account info
                        const account = await ctx.db.get((tx as any).accountId);
                        transaction = {
                            _id: tx._id,
                            amount: (tx as any).amount,
                            description: (tx as any).description,
                            transactionType: (tx as any).transactionType,
                            account: account ? {
                                _id: account._id,
                                name: (account as any).name,
                                type: (account as any).type,
                            } : null,
                        };
                    }
                }

                // Get transfer pair info if exists
                let transferPair = null;
                if (contrib.transfer_pair_id) {
                    const pairContributions = await ctx.db
                        .query("goal_contributions")
                        .withIndex("by_transfer_pair", (q) => q.eq("transfer_pair_id", contrib.transfer_pair_id))
                        .collect();

                    const otherContrib = pairContributions.find(c => c._id !== contrib._id);
                    if (otherContrib) {
                        const otherGoal = await ctx.db.get(otherContrib.goalId);
                        transferPair = {
                            otherGoalId: otherContrib.goalId,
                            otherGoalName: otherGoal ? (otherGoal as any).name : "Unknown",
                            otherAmount: otherContrib.amount,
                        };
                    }
                }

                return {
                    ...contrib,
                    goal: goal ? {
                        _id: goal._id,
                        name: (goal as any).name,
                        emoji: (goal as any).emoji,
                        color: (goal as any).color,
                    } : null,
                    transaction,
                    transferPair,
                };
            })
        );

        return enrichedContributions;
    },
});

// Get contribution analytics
export const getContributionAnalytics = query({
    args: {
        userId: v.id("users"),
        goalId: v.optional(v.id("goals")),
        timeframe: v.string(), // "week" | "month" | "year" | "all"
    },
    handler: async (ctx, args) => {
        const now = new Date();
        let startDate: Date;

        switch (args.timeframe) {
            case "week":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "year":
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0); // All time
        }

        const startDateStr = startDate.toISOString().split('T')[0];

        let allContributions;

        if (args.goalId) {
            const goalId = args.goalId;
            allContributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_goal", (q) => q.eq("goalId", goalId))
                .collect();
        } else {
            allContributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_user", (q) => q.eq("userId", args.userId))
                .collect();
        }

        // Filter by date range
        const contributions = allContributions.filter(contrib =>
            contrib.contribution_date >= startDateStr
        );

        // Calculate metrics
        const totalContributions = contributions
            .filter(c => !c.is_withdrawal)
            .reduce((sum, contrib) => sum + contrib.amount, 0);

        const totalWithdrawals = contributions
            .filter(c => c.is_withdrawal)
            .reduce((sum, contrib) => sum + Math.abs(contrib.amount), 0);

        const netContributions = totalContributions - totalWithdrawals;

        const contributionsBySource = contributions.reduce((acc, contrib) => {
            const source = contrib.source || "unknown";
            acc[source] = (acc[source] || 0) + contrib.amount;
            return acc;
        }, {} as Record<string, number>);

        const contributionsByDate = contributions.reduce((acc, contrib) => {
            const date = contrib.contribution_date;
            acc[date] = (acc[date] || 0) + contrib.amount;
            return acc;
        }, {} as Record<string, number>);

        const averageContribution = contributions.length > 0
            ? totalContributions / contributions.filter(c => !c.is_withdrawal).length
            : 0;

        return {
            totalContributions,
            totalWithdrawals,
            netContributions,
            contributionCount: contributions.filter(c => !c.is_withdrawal).length,
            withdrawalCount: contributions.filter(c => c.is_withdrawal).length,
            averageContribution,
            contributionsBySource,
            contributionsByDate,
            timeframe: args.timeframe,
            startDate: startDateStr,
            endDate: now.toISOString().split('T')[0],
        };
    },
});

// Auto-allocate imported transaction to goals based on account linking
export const autoAllocateImportedTransaction = mutation({
    args: {
        userId: v.id("users"),
        transactionId: v.id("transactions"),
        force: v.optional(v.boolean()), // Override existing allocations
    },
    handler: async (ctx, args) => {
        const { userId, transactionId } = args;

        // Get transaction details
        const transaction = await ctx.db.get(transactionId);
        if (!transaction || (transaction as any).userId !== userId) {
            throw new Error("Transaction not found or not authorized");
        }

        // Check if already allocated (unless forced)
        if (!args.force) {
            const existingContributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_transaction", (q) => q.eq("transactionId", transactionId))
                .collect();

            if (existingContributions.length > 0) {
                return { message: "Transaction already allocated", allocated: false };
            }
        }

        // Find goals linked to this account
        const accountId = (transaction as any).accountId;
        const linkedGoals = await ctx.db
            .query("goals")
            .withIndex("by_account", (q) => q.eq("linked_account_id", accountId))
            .collect();

        if (linkedGoals.length === 0) {
            return { message: "No goals linked to account", allocated: false };
        }

        const transactionAmount = (transaction as any).amount;

        // Only auto-allocate positive amounts (deposits)
        if (transactionAmount <= 0) {
            return { message: "Only positive transactions are auto-allocated", allocated: false };
        }

        if (linkedGoals.length === 1) {
            // Single goal - auto-allocate the full amount
            const goal = linkedGoals[0];
            const contributionId = await ctx.db.insert("goal_contributions", {
                userId,
                goalId: goal._id,
                transactionId,
                amount: transactionAmount,
                note: "Auto-allocated from import",
                contribution_date: new Date((transaction as any).date).toISOString().split('T')[0],
                source: "auto",
                createdAt: Date.now(),
            });

            await updateGoalCompletionStatus(ctx, goal._id);

            return {
                allocated: true,
                goalId: goal._id,
                contributionId,
                amount: transactionAmount,
                type: "single_goal"
            };
        } else {
            // Multiple goals - mark for manual allocation
            return {
                allocated: false,
                message: "Multiple goals found - manual allocation required",
                goalCount: linkedGoals.length,
                type: "manual_required"
            };
        }
    },
});

// Batch auto-allocate transactions from import
export const batchAutoAllocateImport = mutation({
    args: {
        userId: v.id("users"),
        importId: v.id("imports"),
        accountId: v.id("accounts"),
    },
    handler: async (ctx, args) => {
        const { userId, importId, accountId } = args;

        // Get all transactions from this import
        const importedTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_import", (q) => q.eq("importId", importId))
            .collect();

        // Get goals linked to this account
        const linkedGoals = await ctx.db
            .query("goals")
            .withIndex("by_account", (q) => q.eq("linked_account_id", accountId))
            .collect();

        if (linkedGoals.length === 0) {
            return {
                processed: 0,
                allocated: 0,
                message: "No goals linked to account"
            };
        }

        let processed = 0;
        let allocated = 0;
        const results = [];

        for (const transaction of importedTransactions) {
            // Skip if already allocated
            const existingContributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_transaction", (q) => q.eq("transactionId", transaction._id))
                .collect();

            if (existingContributions.length > 0) {
                processed++;
                continue;
            }

            // Only process positive amounts
            if (transaction.amount <= 0) {
                processed++;
                continue;
            }

            if (linkedGoals.length === 1) {
                // Auto-allocate to single goal
                const goal = linkedGoals[0];
                const contributionId = await ctx.db.insert("goal_contributions", {
                    userId,
                    goalId: goal._id,
                    transactionId: transaction._id,
                    amount: transaction.amount,
                    note: "Auto-allocated from import",
                    contribution_date: new Date(transaction.date).toISOString().split('T')[0],
                    source: "auto",
                    createdAt: Date.now(),
                });

                await updateGoalCompletionStatus(ctx, goal._id);
                allocated++;
                results.push({
                    transactionId: transaction._id,
                    goalId: goal._id,
                    contributionId,
                    amount: transaction.amount
                });
            }

            processed++;
        }

        return {
            processed,
            allocated,
            requiresManualAllocation: processed - allocated,
            results,
            linkedGoalCount: linkedGoals.length
        };
    },
});

// Get import allocation status
export const getImportAllocationStatus = query({
    args: {
        userId: v.id("users"),
        importId: v.id("imports"),
    },
    handler: async (ctx, args) => {
        const { userId, importId } = args;

        // Get import details
        const importRecord = await ctx.db.get(importId);
        if (!importRecord || (importRecord as any).userId !== userId) {
            throw new Error("Import not found or not authorized");
        }

        // Get all transactions from this import
        const importedTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_import", (q) => q.eq("importId", importId))
            .collect();

        // Category name lookup
        const allCategories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const categoryNameById = new Map(allCategories.map(c => [c._id.toString(), c.name]));

        // Check allocation + categorization status for each transaction
        const allocationStatus = [];
        let totalAllocated = 0;
        let totalUnallocated = 0;

        for (const transaction of importedTransactions) {
            const contributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_transaction", (q) => q.eq("transactionId", transaction._id))
                .collect();

            const isAllocated = contributions.length > 0;
            const allocatedAmount = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);

            if (isAllocated) {
                totalAllocated++;
            } else {
                totalUnallocated++;
            }

            const categoryId = (transaction as any).categoryId ?? null;
            allocationStatus.push({
                transactionId: transaction._id,
                amount: transaction.amount,
                description: transaction.description,
                date: transaction.date,
                isAllocated,
                allocatedAmount,
                categoryId,
                categoryName: categoryId ? (categoryNameById.get(categoryId.toString()) ?? null) : null,
                isAutoCategorized: (transaction as any).isAutoCategorized ?? false,
                contributions: contributions.map(contrib => ({
                    goalId: contrib.goalId,
                    amount: contrib.amount,
                    note: contrib.note
                }))
            });
        }

        const { autoCategorized, manuallyCategorized, uncategorized } = importedTransactions.reduce(
            (acc, t) => {
                const isCat = !!(t as any).categoryId;
                const isAuto = !!(t as any).isAutoCategorized;
                return {
                    autoCategorized: acc.autoCategorized + (isAuto ? 1 : 0),
                    manuallyCategorized: acc.manuallyCategorized + (isCat && !isAuto ? 1 : 0),
                    uncategorized: acc.uncategorized + (!isCat ? 1 : 0),
                };
            },
            { autoCategorized: 0, manuallyCategorized: 0, uncategorized: 0 }
        );

        const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

        const unmatchedIncomePlans: Array<{
            _id: Id<"income_plans">;
            label: string;
            expected_amount: number;
            expected_date: string;
            recurrence: string;
        }> = [];

        if (importedTransactions.length > 0) {
            const dates = importedTransactions.map(t => t.date);
            const minDate = dates.reduce((m, d) => Math.min(m, d), Infinity);
            const maxDate = dates.reduce((m, d) => Math.max(m, d), -Infinity);
            const windowStart = new Date(minDate - FOURTEEN_DAYS_MS).toISOString().split("T")[0];
            const windowEnd = new Date(maxDate + FOURTEEN_DAYS_MS).toISOString().split("T")[0];

            const allPlans = await ctx.db
                .query("income_plans")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect();

            for (const plan of allPlans) {
                if (
                    plan.status === "planned" &&
                    plan.expected_date >= windowStart &&
                    plan.expected_date <= windowEnd
                ) {
                    unmatchedIncomePlans.push({
                        _id: plan._id,
                        label: plan.label,
                        expected_amount: plan.expected_amount,
                        expected_date: plan.expected_date,
                        recurrence: plan.recurrence,
                    });
                }
            }
        }

        const linkedGoals = await ctx.db
            .query("goals")
            .withIndex("by_account", (q) => q.eq("linked_account_id", (importRecord as any).accountId))
            .collect();

        // Tag each positive transaction with the closest matching income plan (date ≤14 days,
        // amount ≤20% off). Income-matched transactions must NOT be auto-allocated to goals —
        // they belong to the Income Plan matching flow.
        let isIncomeRelevant = false;
        const allocationStatusWithPlans = allocationStatus.map(tx => {
            if (tx.amount <= 0 || unmatchedIncomePlans.length === 0) {
                return { ...tx, suggestedPlanId: null as Id<"income_plans"> | null, suggestedPlanLabel: null as string | null };
            }
            let bestMatch: typeof unmatchedIncomePlans[0] | null = null;
            let bestAmountDiff = Infinity;
            for (const plan of unmatchedIncomePlans) {
                const planDate = new Date(plan.expected_date + "T12:00:00").getTime();
                const dateDiff = Math.abs(tx.date - planDate);
                const amountDiff = Math.abs(tx.amount - plan.expected_amount);
                const amountRatio = plan.expected_amount > 0 ? amountDiff / plan.expected_amount : 1;
                if (dateDiff <= FOURTEEN_DAYS_MS && amountRatio <= 0.2 && amountDiff < bestAmountDiff) {
                    bestMatch = plan;
                    bestAmountDiff = amountDiff;
                }
            }
            if (bestMatch) isIncomeRelevant = true;
            return {
                ...tx,
                suggestedPlanId: bestMatch?._id ?? null,
                suggestedPlanLabel: bestMatch?.label ?? null,
            };
        });

        return {
            importId,
            accountId: (importRecord as any).accountId,
            totalTransactions: importedTransactions.length,
            totalAllocated,
            totalUnallocated,
            linkedGoals: linkedGoals.map(goal => ({
                _id: goal._id,
                name: goal.name,
                emoji: goal.emoji,
                color: goal.color
            })),
            transactions: allocationStatusWithPlans,
            categorizationHealth: {
                autoCategorized,
                manuallyCategorized,
                uncategorized,
                total: importedTransactions.length,
            },
            unmatchedIncomePlans,
            isIncomeRelevant,
        };
    },
});

// Helper function to update goal completion status
async function updateGoalCompletionStatus(ctx: any, goalId: Id<"goals">) {
    const goal = await ctx.db.get(goalId);
    if (!goal) return;

    const contributions = await ctx.db
        .query("goal_contributions")
        .withIndex("by_goal", (q: any) => q.eq("goalId", goalId))
        .collect();

    const totalContributions = contributions.reduce((sum: number, contrib: any) => sum + contrib.amount, 0);
    const isCompleted = totalContributions >= (goal as any).total_amount;

    if (isCompleted !== (goal as any).is_completed) {
        await ctx.db.patch(goalId, {
            is_completed: isCompleted,
            updatedAt: Date.now(),
        });
    }
}