// convex/goals.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to calculate current amount based on tracking type
async function calculateCurrentAmount(ctx: any, goal: any): Promise<number> {
    if (goal.tracking_type === "MANUAL") {
        // For manual tracking, sum up manual contributions
        const contributions = await ctx.db
            .query("goal_contributions")
            .withIndex("by_goal", (q: any) => q.eq("goalId", goal._id))
            .collect();
        return contributions.reduce((sum: number, contrib: any) => sum + contrib.amount, 0);
    } else if (goal.tracking_type === "LINKED_ACCOUNT" && goal.linked_account_id) {
        // For automatic tracking, calculate from account transactions
        // TODO: Implement automatic balance calculation from transactions
        // For now, fall back to manual contributions
        const contributions = await ctx.db
            .query("goal_contributions")
            .withIndex("by_goal", (q: any) => q.eq("goalId", goal._id))
            .collect();
        return contributions.reduce((sum: number, contrib: any) => sum + contrib.amount, 0);
    }
    return 0;
}

// Helper function to determine if goal progress should be automatically tracked
function shouldAutoTrack(goal: any): boolean {
    return goal.tracking_type === "LINKED_ACCOUNT" && goal.linked_account_id;
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

                // Get monthly plans for this goal
                const monthly_plans = await ctx.db
                    .query("goal_monthly_plans")
                    .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
                    .collect();

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
                    monthly_plans: monthly_plans.map((plan) => ({
                        _id: plan._id,  // Changed from 'id' to '_id'
                        name: plan.name,
                        month: plan.month,
                        year: plan.year,
                        allocated_amount: plan.allocated_amount,
                    })),
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

        const monthly_plans = await ctx.db
            .query("goal_monthly_plans")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return {
            accounts: accounts.map((account) => ({
                _id: account._id,  // Changed from 'id' to '_id'
                name: account.name,
                account_type: account.type,
            })),
            monthly_plans: monthly_plans.map((plan) => ({
                _id: plan._id,  // Changed from 'id' to '_id'
                name: plan.name,
                month: plan.month,
                year: plan.year,
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

        return accounts.map((account) => ({
            _id: account._id, // Keep as _id to match Convex format
            name: account.name,
            account_type: account.type,
            balance: 0,
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
        image_url: v.optional(v.any()), // File object - you might want to handle image upload separately
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

        // Handle linked account ID based on tracking type
        let linked_account_id = undefined;
        if (args.tracking_type === "LINKED_ACCOUNT" && args.linked_account_id && args.linked_account_id !== null) {
            // Convert to Convex ID format if it's a number or string
            const accountIdStr = args.linked_account_id.toString();
            // Validate this is a valid account ID
            const account = await ctx.db.get(accountIdStr as any);
            if (account && (account as any).userId === userId) {
                linked_account_id = accountIdStr as any;
            } else {
                throw new Error("Invalid account ID or account not found");
            }
        }

        // Prepare goal data - only include linked_account_id if it's defined
        const goalData: any = {
            userId,
            name: args.name,
            total_amount,
            current_amount: 0,
            monthly_contribution,
            due_date: args.due_date,
            color: args.color,
            emoji: args.emoji,
            note: args.note,
            priority,
            priority_label: priority === 1 ? "High" : priority === 2 ? "Medium" : "Low",
            tracking_type: args.tracking_type,
            calculation_type: args.calculation_type,
            image_url: undefined, // Handle image upload separately if needed
            is_completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        if (args.image_url) {
            goalData.image_url = args.image_url;
        }


        // Only add linked_account_id if it's defined (for LINKED_ACCOUNT tracking)
        if (linked_account_id !== undefined) {
            goalData.linked_account_id = linked_account_id;
        }

        const goalId = await ctx.db.insert("goals", goalData);

        // return { _id: goalId, id: parseInt(goalId), ...args };
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
        image_url: v.optional(v.any()),
        imageChanged: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const goalId = args.goalId as any; // Convert to proper ID type
        const existingGoal = await ctx.db.get(goalId);

        if (!existingGoal) {
            throw new Error("Goal not found");
        }

        // Type assertion to ensure this is a goal document
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
            updateData.total_amount = typeof args.total_amount === "string"
                ? parseFloat(args.total_amount)
                : args.total_amount;
        }
        if (args.monthly_contribution !== undefined) {
            updateData.monthly_contribution = typeof args.monthly_contribution === "string"
                ? parseFloat(args.monthly_contribution)
                : args.monthly_contribution;
        }
        if (args.due_date !== undefined) updateData.due_date = args.due_date;
        if (args.calculation_type !== undefined) updateData.calculation_type = args.calculation_type;
        if (args.tracking_type !== undefined) updateData.tracking_type = args.tracking_type;
        if (args.color !== undefined) updateData.color = args.color;
        if (args.emoji !== undefined) updateData.emoji = args.emoji;

        if (args.priority !== undefined) {
            const priority = typeof args.priority === "string" ? parseInt(args.priority) : args.priority;
            updateData.priority = priority;
            updateData.priority_label = priority === 1 ? "High" : priority === 2 ? "Medium" : "Low";
        }

        if (args.linked_account_id !== undefined) {
            if (args.tracking_type === "LINKED_ACCOUNT" && args.linked_account_id) {
                // Validate the account ID
                const accountIdStr = args.linked_account_id.toString();
                const account = await ctx.db.get(accountIdStr as any);
                if (account && (account as any).userId === userId) {
                    updateData.linked_account_id = accountIdStr as any;
                } else {
                    throw new Error("Invalid account ID or account not found");
                }
            } else if (args.tracking_type === "MANUAL") {
                // For manual tracking, remove the linked account
                updateData.linked_account_id = undefined;
            }
        }
        
        if (args.image_url !== undefined) {
            updateData.image_url = args.image_url;
        }

        await ctx.db.patch(goalId, updateData);

        return { _id: goalId, id: parseInt(goalId), ...updateData };
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

// Mutation to add a contribution to a goal
export const addContribution = mutation({
    args: {
        userId: v.id("users"),
        goalId: v.string(),
        amount: v.number(),
        note: v.optional(v.string()),
        contribution_date: v.string(),
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

        // Add the contribution
        const contributionId = await ctx.db.insert("goal_contributions", {
            userId,
            goalId,
            amount: args.amount,
            note: args.note,
            contribution_date: args.contribution_date,
            createdAt: Date.now(),
        });

        // Check if goal is now completed
        const allContributions = await ctx.db
            .query("goal_contributions")
            .withIndex("by_goal", (q) => q.eq("goalId", goalId))
            .collect();

        const totalContributions = allContributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        const isCompleted = totalContributions >= goal.total_amount;

        if (isCompleted && !goal.is_completed) {
            await ctx.db.patch(goalId, {
                is_completed: true,
                updatedAt: Date.now(),
            });
        }

        return { _id: contributionId, ...args };
    },
});