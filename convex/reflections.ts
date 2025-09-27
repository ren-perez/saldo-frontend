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

        // Calculate totals by transaction type, excluding transfers
        let totalIncome = 0;
        let totalExpenses = 0;

        for (const transaction of transactions) {
            // Skip transfers
            if (transaction.transactionType === "transfer") {
                continue;
            }

            // Use transactionType field for proper classification
            if (transaction.transactionType === "income") {
                totalIncome += Math.abs(transaction.amount);
            } else if (transaction.transactionType === "expense") {
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
            // Skip transfers
            if (transaction.transactionType === "transfer") {
                continue;
            }

            // Filter by transaction type if requested
            if (expensesOnly && transaction.transactionType !== "expense") {
                continue;
            }

            const categoryId = transaction.categoryId || "uncategorized";
            const categoryName = categoryId === "uncategorized"
                ? "Uncategorized"
                : categoryLookup.get(categoryId)?.name || "Unknown";

            const amount = Math.abs(transaction.amount);

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
            // Skip transfers
            if (transaction.transactionType === "transfer") {
                continue;
            }

            // Filter by transaction type if requested
            if (expensesOnly && transaction.transactionType !== "expense") {
                continue;
            }

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

            const amount = Math.abs(transaction.amount);

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

            // Skip transfers for income/expense calculation
            if (transaction.transactionType !== 'transfer') {
                if (transaction.transactionType === 'income') {
                    dayData.income += Math.abs(transaction.amount);
                } else if (transaction.transactionType === 'expense') {
                    dayData.expense += Math.abs(transaction.amount);
                }
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

            // Skip transfers for income/expense calculation
            if (transaction.transactionType !== 'transfer') {
                if (transaction.transactionType === 'income') {
                    dayData.income += Math.abs(transaction.amount);
                } else if (transaction.transactionType === 'expense') {
                    dayData.expense += Math.abs(transaction.amount);
                }
            }
        }

        // Convert to array and sort by date
        const result = Array.from(dailyData.values())
            .sort((a, b) => a.timestamp - b.timestamp);

        return result;
    },
});

export const getTransferInsights = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, startDate, endDate } = args;

    // Get all paired transfer transactions within the date range
    const transferTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => 
        q.and(
          q.neq(q.field("transfer_pair_id"), undefined),
          q.eq(q.field("transactionType"), "transfer"),
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      )
      .collect();

    // Get all accounts for this user
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const accountMap = new Map(accounts.map(acc => [acc._id, acc]));

    // Group transfers by pair ID
    const transferPairs = new Map<string, typeof transferTransactions>();
    for (const tx of transferTransactions) {
      const pairId = tx.transfer_pair_id!;
      if (!transferPairs.has(pairId)) {
        transferPairs.set(pairId, []);
      }
      transferPairs.get(pairId)!.push(tx);
    }

    // Analyze each transfer pair for insights
    const insights = new Map<string, {
      type: 'savings' | 'debt_payment';
      amount: number;
      accountName: string;
      count: number;
    }>();

    for (const [pairId, transactions] of transferPairs) {
      if (transactions.length !== 2) continue; // Skip incomplete pairs

      const outgoing = transactions.find(tx => tx.amount < 0);
      const incoming = transactions.find(tx => tx.amount > 0);

      if (!outgoing || !incoming) continue;

      const outgoingAccount = accountMap.get(outgoing.accountId);
      const incomingAccount = accountMap.get(incoming.accountId);

      if (!outgoingAccount || !incomingAccount) continue;

      // Determine insight type based on account types
      let insightType: 'savings' | 'debt_payment' | null = null;
      let targetAccountName = '';
      let transferAmount = incoming.amount; // Use positive amount

      // Savings: Money going TO savings account
      if (incomingAccount.type === 'savings') {
        insightType = 'savings';
        targetAccountName = incomingAccount.name;
      }
      // Debt payment: Money going TO credit card (reducing debt)
      else if (incomingAccount.type === 'credit') {
        insightType = 'debt_payment';
        targetAccountName = incomingAccount.name;
      }
      // Alternative: Money coming FROM credit card could be debt increase (skip this for insights)
      // Alternative: Check for specific account names that might indicate savings/investment
      else if (incomingAccount.name.toLowerCase().includes('saving') || 
               incomingAccount.name.toLowerCase().includes('investment') ||
               incomingAccount.name.toLowerCase().includes('emergency')) {
        insightType = 'savings';
        targetAccountName = incomingAccount.name;
      }

      if (insightType) {
        const key = `${insightType}-${targetAccountName}`;
        if (insights.has(key)) {
          const existing = insights.get(key)!;
          existing.amount += transferAmount;
          existing.count += 1;
        } else {
          insights.set(key, {
            type: insightType,
            amount: transferAmount,
            accountName: targetAccountName,
            count: 1,
          });
        }
      }
    }

    // Convert to array and sort by amount (descending)
    const insightArray = Array.from(insights.values()).sort((a, b) => b.amount - a.amount);

    return insightArray;
  },
});