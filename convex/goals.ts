// convex/goals.ts
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
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
    } else if (goal.tracking_type === "EXPENSE_CATEGORY" && goal.linked_category_id) {
        // For expense-linked goals, sum up contributions from category transactions
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

// Helper function to process retroactive contributions for expense-linked goals
async function processRetroactiveContributions(
    ctx: any,
    userId: Id<"users">,
    goalId: Id<"goals">,
    categoryId: Id<"categories">
): Promise<void> {
    // Find all transactions with this category
    const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("categoryId"), categoryId))
        .collect();

    // Create contributions for all negative transactions (expenses)
    for (const transaction of transactions) {
        if (transaction.amount < 0) {
            // Check if contribution already exists for this transaction
            const existingContribution = await ctx.db
                .query("goal_contributions")
                .withIndex("by_transaction", (q: any) => q.eq("transactionId", transaction._id))
                .filter((q: any) => q.eq(q.field("goalId"), goalId))
                .first();

            if (!existingContribution) {
                await ctx.db.insert("goal_contributions", {
                    userId,
                    goalId,
                    transactionId: transaction._id,
                    amount: Math.abs(transaction.amount),
                    contribution_date: new Date(transaction.date).toISOString().split('T')[0],
                    source: "expense_linked",
                    createdAt: Date.now(),
                });
            }
        }
    }
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

                // Get linked category info if exists
                let linked_category = null;
                if (goal.linked_category_id) {
                    const category = await ctx.db.get(goal.linked_category_id);
                    if (category) {
                        let group_name = "";
                        if (category.groupId) {
                            const group = await ctx.db.get(category.groupId);
                            if (group) {
                                group_name = group.name;
                            }
                        }
                        linked_category = {
                            _id: category._id,
                            name: category.name,
                            group_name,
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
                    linked_category,
                    linked_category_id: goal.linked_category_id,
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
        linked_category_id: v.optional(v.union(v.string(), v.null())),
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

        // Handle linked category ID for expense-linked goals
        let linked_category_id = undefined;
        if (args.tracking_type === "EXPENSE_CATEGORY" && args.linked_category_id && args.linked_category_id !== null) {
            const categoryIdStr = args.linked_category_id.toString();
            const category = await ctx.db.get(categoryIdStr as any);
            if (category && (category as any).userId === userId) {
                linked_category_id = categoryIdStr as any;
            } else {
                throw new Error("Invalid category ID or category not found");
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

        // Only add linked_category_id if it's defined (for EXPENSE_CATEGORY tracking)
        if (linked_category_id !== undefined) {
            goalData.linked_category_id = linked_category_id;
        }

        const goalId = await ctx.db.insert("goals", goalData);

        // If this is an expense-linked goal, process retroactive contributions
        if (linked_category_id !== undefined) {
            await processRetroactiveContributions(ctx, userId, goalId, linked_category_id);
        }

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
        linked_category_id: v.optional(v.union(v.string(), v.null())),
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
            } else if (args.tracking_type === "MANUAL" || args.tracking_type === "EXPENSE_CATEGORY") {
                // For manual or expense tracking, remove the linked account
                updateData.linked_account_id = undefined;
            }
        }

        if (args.linked_category_id !== undefined) {
            if (args.tracking_type === "EXPENSE_CATEGORY" && args.linked_category_id) {
                // Validate the category ID
                const categoryIdStr = args.linked_category_id.toString();
                const category = await ctx.db.get(categoryIdStr as any);
                if (category && (category as any).userId === userId) {
                    updateData.linked_category_id = categoryIdStr as any;
                } else {
                    throw new Error("Invalid category ID or category not found");
                }
            } else if (args.tracking_type === "MANUAL" || args.tracking_type === "LINKED_ACCOUNT") {
                // For manual or account tracking, remove the linked category
                updateData.linked_category_id = undefined;
            }
        }

        if (args.image_url !== undefined) {
            updateData.image_url = args.image_url;
        }

        // Handle category linkage changes for expense-linked goals
        const oldCategoryId = goal.linked_category_id;
        const newCategoryId = updateData.linked_category_id;

        // If category changed, clean up old contributions and process new ones
        if (args.tracking_type === "EXPENSE_CATEGORY" && oldCategoryId !== newCategoryId) {
            // Remove old expense-linked contributions if category changed
            if (oldCategoryId) {
                const oldContributions = await ctx.db
                    .query("goal_contributions")
                    .withIndex("by_goal", (q) => q.eq("goalId", goalId))
                    .filter((q: any) => q.eq(q.field("source"), "expense_linked"))
                    .collect();

                for (const contrib of oldContributions) {
                    await ctx.db.delete(contrib._id);
                }
            }

            // Process retroactive contributions for new category
            if (newCategoryId) {
                await processRetroactiveContributions(ctx, userId, goalId, newCategoryId as any);
            }
        }

        // If switching from expense-linked to another type, remove all expense-linked contributions
        if (goal.tracking_type === "EXPENSE_CATEGORY" && args.tracking_type !== "EXPENSE_CATEGORY") {
            const expenseContributions = await ctx.db
                .query("goal_contributions")
                .withIndex("by_goal", (q) => q.eq("goalId", goalId))
                .filter((q: any) => q.eq(q.field("source"), "expense_linked"))
                .collect();

            for (const contrib of expenseContributions) {
                await ctx.db.delete(contrib._id);
            }
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

// @deprecated - Use api.contributions.createContribution instead
// This function is kept for backward compatibility but should not be used in new code.
// The contributions API provides better type safety, withdrawal support, and transaction linking.
// TODO: Remove after confirming no external dependencies
export const addContribution = mutation({
    args: {
        userId: v.id("users"),
        goalId: v.string(),
        amount: v.number(),
        note: v.optional(v.string()),
        contribution_date: v.string(),
        accountId: v.optional(v.id("accounts")), // For creating linked transaction
        source: v.optional(v.string()), // Defaults to "manual_ui"
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const goalId = args.goalId as any;
        const existingGoal = await ctx.db.get(goalId);

        if (!existingGoal) {
            throw new Error("Goal not found");
        }

        const goal = existingGoal as any;
        if (goal.userId !== userId) {
            throw new Error("Not authorized");
        }

        // let transactionId = null;
        let transactionId: Id<"transactions"> | undefined = undefined;


        // Create transaction if account is provided
        if (args.accountId) {
            // Validate account belongs to user
            const account = await ctx.db.get(args.accountId);
            if (!account || (account as any).userId !== userId) {
                throw new Error("Account not found or not authorized");
            }

            // Create transaction
            transactionId = await ctx.db.insert("transactions", {
                userId,
                accountId: args.accountId,
                amount: args.amount,
                date: new Date(args.contribution_date).getTime(),
                description: `Goal contribution: ${goal.name}`,
                transactionType: "deposit",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        // Add the contribution
        const contributionId = await ctx.db.insert("goal_contributions", {
            userId,
            goalId,
            transactionId,
            amount: args.amount,
            note: args.note,
            contribution_date: args.contribution_date,
            source: args.source || "manual_ui",
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

        return { _id: contributionId, transactionId, ...args };
    },
});