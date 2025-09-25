// convex/reflections.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getMonthlySummary = query({
    args: {
        userId: v.id("users"),
        startDate: v.number(), // timestamp for start of period
        endDate: v.number(),   // timestamp for end of period
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate } = args;

        // Get all transactions in the date range
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.and(
                    q.gte(q.field("date"), startDate),
                    q.lte(q.field("date"), endDate)
                )
            )
            .collect();

        // Calculate totals by type
        let totalIncome = 0;
        let totalExpenses = 0;

        for (const transaction of transactions) {
            if (transaction.amount > 0) {
                totalIncome += transaction.amount;
            } else {
                totalExpenses += Math.abs(transaction.amount);
            }
        }

        const netDifference = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            netDifference,
            transactionCount: transactions.length,
            period: { startDate, endDate },
        };
    },
});

export const getCategoryBreakdown = query({
    args: {
        userId: v.id("users"),
        startDate: v.number(),
        endDate: v.number(),
        expensesOnly: v.optional(v.boolean()), // Default to false to include all
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate, expensesOnly = false } = args;

        // Get transactions in date range
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.and(
                    q.gte(q.field("date"), startDate),
                    q.lte(q.field("date"), endDate)
                )
            )
            .collect();

        // Get categories for this user
        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Create category lookup
        const categoryLookup = new Map();
        categories.forEach(cat => {
            categoryLookup.set(cat._id, cat);
        });

        // Group by category
        const categoryBreakdown = new Map<string, { name: string; amount: number; count: number }>();

        for (const transaction of transactions) {
            // Filter by expenses only if requested
            if (expensesOnly && transaction.amount >= 0) continue;

            const categoryId = transaction.categoryId || "uncategorized";
            const categoryName = categoryId === "uncategorized"
                ? "Uncategorized"
                : categoryLookup.get(categoryId)?.name || "Unknown";

            const amount = expensesOnly ? Math.abs(transaction.amount) : transaction.amount;

            if (categoryBreakdown.has(categoryId)) {
                const existing = categoryBreakdown.get(categoryId)!;
                existing.amount += amount;
                existing.count += 1;
            } else {
                categoryBreakdown.set(categoryId, {
                    name: categoryName,
                    amount: amount,
                    count: 1,
                });
            }
        }

        // Convert to array and sort by amount (descending)
        const result = Array.from(categoryBreakdown.values())
            .sort((a, b) => b.amount - a.amount);

        return result;
    },
});

export const getGroupBreakdown = query({
    args: {
        userId: v.id("users"),
        startDate: v.number(),
        endDate: v.number(),
        expensesOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate, expensesOnly = false } = args;

        // Get transactions in date range
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.and(
                    q.gte(q.field("date"), startDate),
                    q.lte(q.field("date"), endDate)
                )
            )
            .collect();

        // Get categories and groups
        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const categoryGroups = await ctx.db
            .query("category_groups")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Create lookups
        const categoryLookup = new Map();
        categories.forEach(cat => {
            categoryLookup.set(cat._id, cat);
        });

        const groupLookup = new Map();
        categoryGroups.forEach(group => {
            groupLookup.set(group._id, group);
        });

        // Group by category group
        const groupBreakdown = new Map<string, { name: string; amount: number; count: number }>();

        for (const transaction of transactions) {
            // Filter by expenses only if requested
            if (expensesOnly && transaction.amount >= 0) continue;

            let groupId = "ungrouped";
            let groupName = "Ungrouped";

            if (transaction.categoryId) {
                const category = categoryLookup.get(transaction.categoryId);
                if (category && category.groupId) {
                    const group = groupLookup.get(category.groupId);
                    if (group) {
                        groupId = category.groupId;
                        groupName = group.name;
                    }
                }
            }

            const amount = expensesOnly ? Math.abs(transaction.amount) : transaction.amount;

            if (groupBreakdown.has(groupId)) {
                const existing = groupBreakdown.get(groupId)!;
                existing.amount += amount;
                existing.count += 1;
            } else {
                groupBreakdown.set(groupId, {
                    name: groupName,
                    amount: amount,
                    count: 1,
                });
            }
        }

        // Convert to array and sort by amount (descending)
        const result = Array.from(groupBreakdown.values())
            .sort((a, b) => b.amount - a.amount);

        return result;
    },
});

export const getCategoryTrend = query({
    args: {
        userId: v.id("users"),
        categoryId: v.optional(v.id("categories")), // Optional - if not provided, shows all
        startDate: v.number(),
        endDate: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId, categoryId, startDate, endDate } = args;

        // Get transactions in date range
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.and(
                    q.gte(q.field("date"), startDate),
                    q.lte(q.field("date"), endDate)
                )
            )
            .collect();

        // Get accounts, categories, and groups for enriched data
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Create lookups
        const accountLookup = new Map();
        accounts.forEach(acc => accountLookup.set(acc._id, acc));

        const categoryLookup = new Map();
        categories.forEach(cat => categoryLookup.set(cat._id, cat));

        // Filter by category if specified
        const filteredTransactions = categoryId
            ? transactions.filter(t => t.categoryId === categoryId)
            : transactions;

        // Group by day with detailed transaction info
        const dailyData = new Map<string, {
            totalAmount: number;
            income: number;
            expense: number;
            transfer: number;
            transactions: Array<{
                id: string;
                amount: number;
                description: string;
                accountName: string;
                categoryName: string;
                transactionType?: string;
            }>;
        }>();

        for (const transaction of filteredTransactions) {
            const date = new Date(transaction.date);
            const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

            const account = accountLookup.get(transaction.accountId);
            const category = categoryLookup.get(transaction.categoryId);

            const transactionDetail = {
                id: transaction._id,
                amount: transaction.amount,
                description: transaction.description,
                accountName: account?.name || 'Unknown Account',
                categoryName: category?.name || 'Uncategorized',
                transactionType: transaction.transactionType,
            };

            if (!dailyData.has(dayKey)) {
                dailyData.set(dayKey, {
                    totalAmount: 0,
                    income: 0,
                    expense: 0,
                    transfer: 0,
                    transactions: [],
                });
            }

            const dayData = dailyData.get(dayKey)!;
            dayData.transactions.push(transactionDetail);

            if (transaction.amount > 0) {
                dayData.income += transaction.amount;
            } else {
                dayData.expense += Math.abs(transaction.amount);
            }

            if (transaction.transactionType === 'transfer') {
                dayData.transfer += Math.abs(transaction.amount);
            }

            dayData.totalAmount += Math.abs(transaction.amount);
        }

        // Convert to array for charting
        const result = Array.from(dailyData.entries())
            .map(([date, data]) => ({
                date,
                amount: data.totalAmount,
                income: data.income,
                expense: data.expense,
                transfer: data.transfer,
                transactionCount: data.transactions.length,
                transactions: data.transactions,
                timestamp: new Date(date).getTime(),
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        return result;
    },
});

// Helper query to get spending by transaction type
export const getTransactionTypeBreakdown = query({
    args: {
        userId: v.id("users"),
        startDate: v.number(),
        endDate: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate } = args;

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.and(
                    q.gte(q.field("date"), startDate),
                    q.lte(q.field("date"), endDate)
                )
            )
            .collect();

        const typeBreakdown = new Map<string, { name: string; amount: number; count: number }>();

        for (const transaction of transactions) {
            const type = transaction.transactionType || "untyped";
            const typeName = type === "untyped" ? "Untyped" : type;
            const amount = Math.abs(transaction.amount);

            if (typeBreakdown.has(type)) {
                const existing = typeBreakdown.get(type)!;
                existing.amount += amount;
                existing.count += 1;
            } else {
                typeBreakdown.set(type, {
                    name: typeName,
                    amount: amount,
                    count: 1,
                });
            }
        }

        return Array.from(typeBreakdown.values())
            .sort((a, b) => b.amount - a.amount);
    },
});

// Get time-based breakdown for specific category or group
export const getTimeBasedBreakdown = query({
    args: {
        userId: v.id("users"),
        startDate: v.number(),
        endDate: v.number(),
        filterType: v.string(), // "category" or "group"
        filterId: v.optional(v.string()), // categoryId or groupId
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate, filterType, filterId } = args;

        // Get transactions in date range
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
                q.and(
                    q.gte(q.field("date"), startDate),
                    q.lte(q.field("date"), endDate)
                )
            )
            .collect();

        // Get categories and groups for filtering
        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const categoryGroups = await ctx.db
            .query("category_groups")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Create lookups
        const categoryLookup = new Map();
        categories.forEach(cat => categoryLookup.set(cat._id, cat));

        const groupLookup = new Map();
        categoryGroups.forEach(group => groupLookup.set(group._id, group));

        // Filter transactions based on filterType and filterId
        let filteredTransactions = transactions;

        if (filterId && filterId !== "all") {
            if (filterType === "category") {
                if (filterId === "uncategorized") {
                    filteredTransactions = transactions.filter(t => !t.categoryId);
                } else {
                    filteredTransactions = transactions.filter(t => t.categoryId === filterId);
                }
            } else if (filterType === "group") {
                filteredTransactions = transactions.filter(t => {
                    if (!t.categoryId) return filterId === "ungrouped";
                    const category = categoryLookup.get(t.categoryId);
                    if (!category) return filterId === "ungrouped";
                    if (!category.groupId) return filterId === "ungrouped";
                    return category.groupId === filterId;
                });
            }
        }

        // Group by day
        const dailyData = new Map<string, {
            date: string;
            income: number;
            expense: number;
            timestamp: number;
        }>();

        for (const transaction of filteredTransactions) {
            const date = new Date(transaction.date);
            const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!dailyData.has(dayKey)) {
                dailyData.set(dayKey, {
                    date: dayKey,
                    income: 0,
                    expense: 0,
                    timestamp: date.getTime(),
                });
            }

            const dayData = dailyData.get(dayKey)!;

            if (transaction.amount > 0) {
                dayData.income += transaction.amount;
            } else {
                dayData.expense += Math.abs(transaction.amount);
            }
        }

        // Convert to array and sort by date
        const result = Array.from(dailyData.values())
            .sort((a, b) => a.timestamp - b.timestamp);

        return result;
    },
});