// convex/goals.ts
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { updateGoalCompletionStatus } from "./contributions";

function getPriorityLabel(priority: number): string {
    return priority === 1 ? "High" : priority === 2 ? "Medium" : "Low";
}

// Helper: compute goal's current balance.
// LINKED_ACCOUNT goals use the linked account's balance (starting_balance + sum of transactions).
// MANUAL goals sum their goal_contributions records.
async function calculateCurrentAmount(ctx: any, goal: Doc<"goals">): Promise<number> {
    if (goal.tracking_type === "LINKED_ACCOUNT" && goal.linked_account_id) {
        const account = await ctx.db.get(goal.linked_account_id);
        if (account) {
            const txns = await ctx.db
                .query("transactions")
                .withIndex("by_account", (q: any) => q.eq("accountId", goal.linked_account_id))
                .collect();
            return ((account as any).starting_balance ?? 0) + txns.reduce((s: number, t: any) => s + t.amount, 0);
        }
    }
    const contributions = await ctx.db
        .query("goal_contributions")
        .withIndex("by_goal", (q: any) => q.eq("goalId", goal._id))
        .collect();
    return contributions.reduce((sum: number, contrib: any) => sum + contrib.amount, 0);
}


export const getGoals = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const goals = await ctx.db
            .query("goals")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Get related data for each goal
        const goalsWithData = await Promise.all(
            goals.map(async (goal) => {
                // Get linked account info if exists
                let linked_account = null;
                if (goal.linked_account_id) {
                    const account = await ctx.db.get(goal.linked_account_id);
                    if (account) {
                        linked_account = {
                            _id: account._id,  // Changed from 'id' to '_id'
                            name: account.name,
                            account_type: account.type,
                        };
                    }
                }

                // Calculate current amount based on tracking type
                const current_amount = await calculateCurrentAmount(ctx, goal);

                return {
                    _id: goal._id,  // Changed from 'id' to '_id'
                    name: goal.name,
                    total_amount: goal.total_amount,
                    current_amount,
                    monthly_contribution: goal.monthly_contribution,
                    due_date: goal.due_date || "",
                    color: goal.color,
                    emoji: goal.emoji,
                    note: goal.note,
                    priority: goal.priority || 3,
                    priority_label: goal.priority_label || "Medium",
                    tracking_type: goal.tracking_type,
                    calculation_type: goal.calculation_type,
                    linked_account,
                    image_url: goal.image_url,
                    is_completed: goal.is_completed || false,
                    createdAt: goal.createdAt,
                    updatedAt: goal.updatedAt,
                };
            })
        );

        return goalsWithData;
    },
});

// Query to get filter options (accounts and monthly plans)
export const getFilterOptions = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return {
            accounts: accounts.map((account) => ({
                _id: account._id,  // Changed from 'id' to '_id'
                name: account.name,
                account_type: account.type,
            })),
        };
    },
});

// Query to get accounts for goal creation/editing
export const getGoalAccounts = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return await Promise.all(accounts.map(async (account) => {
            const txns = await ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", account._id))
                .collect();
            const computedBalance = (account.starting_balance ?? 0) + txns.reduce((s, t) => s + t.amount, 0);
            return {
                _id: account._id,
                name: account.name,
                account_type: account.type,
                balance: computedBalance,
            };
        }));
    },
});

// Query to get priority options
export const getGoalPriorityOptions = query({
    args: {},
    handler: async () => {
        return [
            { value: 1, label: "High" },
            { value: 2, label: "Medium" },
            { value: 3, label: "Low" },
        ];
    },
});

// Mutation to create a new goal
export const createGoal = mutation({
    args: {
        userId: v.id("users"),
        name: v.string(),
        note: v.optional(v.string()),
        // total_amount: v.union(v.string(), v.number()),
        total_amount: v.union(v.string(), v.number()),
        current_amount: v.optional(v.number()),
        monthly_contribution: v.union(v.string(), v.number()),
        due_date: v.optional(v.string()),
        calculation_type: v.optional(v.string()),
        tracking_type: v.string(),
        linked_account_id: v.optional(v.union(v.string(), v.number(), v.null())),
        color: v.string(),
        emoji: v.string(),
        priority: v.union(v.string(), v.number()),
        priority_label: v.optional(v.string()),
        image_url: v.optional(v.string()),
        imageChanged: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Convert string values to numbers
        const total_amount = typeof args.total_amount === "string"
            ? parseFloat(args.total_amount)
            : args.total_amount;

        const monthly_contribution = typeof args.monthly_contribution === "string"
            ? parseFloat(args.monthly_contribution)
            : args.monthly_contribution;

        const priority = typeof args.priority === "string"
            ? parseInt(args.priority)
            : args.priority;

        if (total_amount <= 0) {
            throw new Error("Total amount must be greater than 0");
        }
        if (monthly_contribution <= 0) {
            throw new Error("Monthly contribution must be greater than 0");
        }

        // Handle linked account ID based on tracking type
        let linked_account_id = undefined;
        if (args.tracking_type === "LINKED_ACCOUNT" && args.linked_account_id && args.linked_account_id !== null) {
            const accountIdStr = args.linked_account_id.toString();
            const account = await ctx.db.get(accountIdStr as any);
            if (account && (account as any).userId === userId) {
                linked_account_id = accountIdStr as any;
            } else {
                throw new Error("Invalid account ID or account not found");
            }
        }

        // Prepare goal data
        const goalData: any = {
            userId,
            name: args.name,
            total_amount,
            monthly_contribution,
            due_date: args.due_date,
            color: args.color,
            emoji: args.emoji,
            note: args.note,
            priority,
            priority_label: getPriorityLabel(priority),
            tracking_type: args.tracking_type,
            calculation_type: args.calculation_type,
            image_url: undefined,
            is_completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        if (args.image_url) {
            goalData.image_url = args.image_url;
        }

        if (linked_account_id !== undefined) {
            goalData.linked_account_id = linked_account_id;
        }

        const goalId = await ctx.db.insert("goals", goalData);

        // If linked to an account, create retroactive contributions for existing transactions
        if (linked_account_id !== undefined) {
            const account = await ctx.db.get(linked_account_id);
            if (account) {
                const transactions = await ctx.db
                    .query("transactions")
                    .withIndex("by_account", (q: any) => q.eq("accountId", linked_account_id))
                    .order("asc")
                    .collect();

                const now = new Date().toISOString().split('T')[0];

                // Create contribution for starting_balance if non-zero
                const startingBalance = (account as any).starting_balance ?? 0;
                if (startingBalance !== 0) {
                    await ctx.db.insert("goal_contributions", {
                        userId,
                        goalId,
                        amount: startingBalance,
                        contribution_date: (account as any).createdAt || now,
                        source: "auto",
                        is_withdrawal: false,
                        note: "Initial account balance",
                        createdAt: Date.now(),
                    });
                }

                // Create contributions for each transaction
                for (const tx of transactions) {
                    const txAmount = tx.amount;
                    const txDate = new Date(tx.date).toISOString().split('T')[0];

                    await ctx.db.insert("goal_contributions", {
                        userId,
                        goalId,
                        transactionId: tx._id,
                        amount: txAmount,
                        contribution_date: txDate,
                        source: "auto",
                        is_withdrawal: txAmount < 0,
                        note: tx.description || undefined,
                        createdAt: Date.now(),
                    });
                }

                await updateGoalCompletionStatus(ctx, goalId);
            }
        }

        return { _id: goalId, ...args };
    },
});

// Mutation to update an existing goal
export const updateGoal = mutation({
    args: {
        userId: v.id("users"),
        goalId: v.string(),
        name: v.optional(v.string()),
        note: v.optional(v.string()),
        total_amount: v.optional(v.union(v.string(), v.number())),
        monthly_contribution: v.optional(v.union(v.string(), v.number())),
        due_date: v.optional(v.string()),
        calculation_type: v.optional(v.string()),
        tracking_type: v.optional(v.string()),
        linked_account_id: v.optional(v.union(v.string(), v.number(), v.null())),
        color: v.optional(v.string()),
        emoji: v.optional(v.string()),
        priority: v.optional(v.union(v.string(), v.number())),
        image_url: v.optional(v.string()),
        imageChanged: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const goalId = args.goalId as any; // Convert to proper ID type
        const existingGoal = await ctx.db.get(goalId);

        if (!existingGoal) {
            throw new Error("Goal not found");
        }

        const goal = existingGoal as any;
        if (goal.userId !== userId) {
            throw new Error("Not authorized");
        }

        // Prepare update object
        const updateData: any = {
            updatedAt: Date.now(),
        };

        // Convert and add fields that are provided
        if (args.name !== undefined) updateData.name = args.name;
        if (args.note !== undefined) updateData.note = args.note;
        if (args.total_amount !== undefined) {
            const val = typeof args.total_amount === "string" ? parseFloat(args.total_amount) : args.total_amount;
            if (val <= 0) throw new Error("Total amount must be greater than 0");
            updateData.total_amount = val;
        }
        if (args.monthly_contribution !== undefined) {
            const val = typeof args.monthly_contribution === "string" ? parseFloat(args.monthly_contribution) : args.monthly_contribution;
            if (val <= 0) throw new Error("Monthly contribution must be greater than 0");
            updateData.monthly_contribution = val;
        }
        if (args.due_date !== undefined) updateData.due_date = args.due_date;
        if (args.calculation_type !== undefined) updateData.calculation_type = args.calculation_type;
        if (args.tracking_type !== undefined) updateData.tracking_type = args.tracking_type;
        if (args.color !== undefined) updateData.color = args.color;
        if (args.emoji !== undefined) updateData.emoji = args.emoji;

        if (args.priority !== undefined) {
            const priority = typeof args.priority === "string" ? parseInt(args.priority) : args.priority;
            updateData.priority = priority;
            updateData.priority_label = getPriorityLabel(priority);
        }

        if (args.linked_account_id !== undefined) {
            if (args.tracking_type === "LINKED_ACCOUNT" && args.linked_account_id) {
                const accountIdStr = args.linked_account_id.toString();
                const account = await ctx.db.get(accountIdStr as any);
                if (account && (account as any).userId === userId) {
                    updateData.linked_account_id = accountIdStr as any;
                } else {
                    throw new Error("Invalid account ID or account not found");
                }
            } else if (args.tracking_type === "MANUAL") {
                updateData.linked_account_id = undefined;
            }
        }

        if (args.image_url !== undefined) {
            updateData.image_url = args.image_url;
        }

        await ctx.db.patch(goalId, updateData);

        return { _id: goalId, ...updateData };
    },
});

// Mutation to delete a goal
export const deleteGoal = mutation({
    args: {
        userId: v.id("users"),
        goalId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const goalId = args.goalId as any;
        const existingGoal = await ctx.db.get(goalId);

        if (!existingGoal) {
            throw new Error("Goal not found");
        }

        // Type assertion to ensure this is a goal document
        const goal = existingGoal as any;
        if (goal.userId !== userId) {
            throw new Error("Not authorized");
        }

        // Delete related contributions
        const contributions = await ctx.db
            .query("goal_contributions")
            .withIndex("by_goal", (q) => q.eq("goalId", goalId))
            .collect();

        for (const contribution of contributions) {
            await ctx.db.delete(contribution._id);
        }

        // Delete related monthly plans
        const monthlyPlans = await ctx.db
            .query("goal_monthly_plans")
            .withIndex("by_goal", (q) => q.eq("goalId", goalId))
            .collect();

        for (const plan of monthlyPlans) {
            await ctx.db.delete(plan._id);
        }

        // Delete the goal
        await ctx.db.delete(goalId);

        return { success: true };
    },
});

