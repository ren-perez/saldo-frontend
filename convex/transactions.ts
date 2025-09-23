// convex/transactions.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const importTransactions = mutation({
    args: {
        userId: v.id("users"),
        accountId: v.id("accounts"),
        transactions: v.array(v.object({
            date: v.number(),        // timestamp
            amount: v.number(),
            description: v.string(),
            category: v.optional(v.string()),
            transactionType: v.optional(v.string()),
        })),
        dateRange: v.optional(v.object({
            startDate: v.number(),   // timestamp
            endDate: v.number(),     // timestamp
        })),
    },
    handler: async (ctx, args) => {
        const { userId, accountId, transactions, dateRange } = args;

        // Verify account belongs to user
        const account = await ctx.db.get(accountId);
        if (!account || account.userId !== userId) {
            throw new Error("Account not found or not owned by user");
        }

        let deletedUnmodified = 0;
        let preservedUserEdited = 0;

        // If we have a date range, implement the override logic
        if (dateRange) {
            // 1. Get existing transactions in the date range
            const existingTransactions = await ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", accountId))
                .filter((q) => 
                    q.and(
                        q.gte(q.field("date"), dateRange.startDate),
                        q.lte(q.field("date"), dateRange.endDate)
                    )
                )
                .collect();

            // 2. Identify user-edited transactions
            // A transaction is considered "user-edited" if:
            // - It has a categoryId (user assigned a category)
            // - It has been updated after initial creation (updatedAt > createdAt)
            // For now, we'll use the simple categoryId check
            const userEditedTransactions = existingTransactions.filter(transaction => 
                transaction.categoryId !== undefined
            );

            // 3. Delete unmodified transactions in date range
            const transactionsToDelete = existingTransactions.filter(transaction => 
                !userEditedTransactions.some(edited => edited._id === transaction._id)
            );

            for (const transaction of transactionsToDelete) {
                await ctx.db.delete(transaction._id);
            }

            deletedUnmodified = transactionsToDelete.length;
            preservedUserEdited = userEditedTransactions.length;
        }

        // 4. Insert all new transactions from file
        const insertedTransactions = [];
        for (const transaction of transactions) {
            const inserted = await ctx.db.insert("transactions", {
                userId,
                accountId,
                date: transaction.date,
                amount: transaction.amount,
                description: transaction.description,
                transactionType: transaction.transactionType,
                categoryId: undefined, // Will be set later when categorizing
                createdAt: Date.now(),
            });
            insertedTransactions.push(inserted);
        }

        return {
            success: true,
            insertedCount: insertedTransactions.length,
            deletedUnmodified,
            preservedUserEdited,
            transactionIds: insertedTransactions,
            summary: `Imported ${insertedTransactions.length} transactions. ${deletedUnmodified} unmodified transactions were replaced. ${preservedUserEdited} user-edited transactions were preserved.`
        };
    },
});

export const listTransactions = query({
    args: {
        userId: v.id("users"),
        accountId: v.optional(v.id("accounts")),
        categoryId: v.optional(v.id("categories")),
        transactionType: v.optional(v.string()),
        searchTerm: v.optional(v.string()),
        startDate: v.optional(v.number()), // timestamp
        endDate: v.optional(v.number()),   // timestamp
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Start with the table query and the index you want to order by.
        let q = ctx.db
            .query("transactions")
            .withIndex("by_date") // uses the index you defined in schema
            .order("desc"); // "asc" | "desc"

        // Required: only the user's transactions
        q = q.filter((row) => row.eq(row.field("userId"), args.userId));

        // Optional filters applied on the builder (so the DB does the filtering)
        if (args.accountId) {
            q = q.filter((row) => row.eq(row.field("accountId"), args.accountId));
        }
        if (args.categoryId) {
            q = q.filter((row) => row.eq(row.field("categoryId"), args.categoryId));
        }
        if (args.transactionType) {
            q = q.filter((row) =>
                row.eq(row.field("transactionType"), args.transactionType)
            );
        }

        // Date filtering with proper numeric comparison and type guards
        if (args.startDate !== undefined) {
            q = q.filter((row) => row.gte(row.field("date"), args.startDate!));
        }
        if (args.endDate !== undefined) {
            q = q.filter((row) => row.lte(row.field("date"), args.endDate!));
        }

        // Now fetch (limit default 50)
        let results = await q.take(args.limit ?? 50);

        // Fallback text search (client-side) until you add a search index.
        if (args.searchTerm) {
            const term = args.searchTerm.toLowerCase();
            results = results.filter((t) =>
                t.description.toLowerCase().includes(term)
            );
        }

        return results;
    },
});

// Paginated query (this one was already correct)
export const listTransactionsPaginated = query({
    args: {
        userId: v.id("users"),
        accountId: v.optional(v.id("accounts")),
        transactionType: v.optional(v.string()),
        searchTerm: v.optional(v.string()),
        startDate: v.optional(v.number()), // timestamp
        endDate: v.optional(v.number()),   // timestamp
        page: v.number(),
        pageSize: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId, accountId, transactionType, searchTerm, startDate, endDate, page, pageSize } = args;

        // Build base query
        let query = ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId));

        // Apply account filter
        if (accountId) {
            query = ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", accountId));
        }

        // Get all matching transactions (we'll filter in memory for complex filters)
        let allTransactions = await query.collect();

        // Apply additional filters
        let filteredTransactions = allTransactions.filter((transaction) => {
            // Transaction type filter
            if (transactionType && transaction.transactionType !== transactionType) {
                return false;
            }

            // Date range filters - now working with numeric timestamps
            if (startDate && transaction.date < startDate) {
                return false;
            }
            if (endDate && transaction.date > endDate) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                if (!transaction.description.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            return true;
        });

        // Sort by date (newest first)
        filteredTransactions.sort((a, b) => b.date - a.date);

        // Apply pagination
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

        return {
            data: paginatedTransactions,
            total: filteredTransactions.length,
            page,
            pageSize,
            hasMore: endIndex < filteredTransactions.length,
        };
    },
});

export const deleteTransaction = mutation({
    args: { transactionId: v.id("transactions") },
    handler: async (ctx, { transactionId }) => {
        await ctx.db.delete(transactionId);
    },
});

export const updateTransaction = mutation({
    args: {
        transactionId: v.id("transactions"),
        updates: v.object({
            transactionType: v.optional(v.string()),
            categoryId: v.optional(v.id("categories")),
            description: v.optional(v.string()),
            amount: v.optional(v.number()),
        }),
    },
    handler: async (ctx, args) => {
        const { transactionId, updates } = args;

        // Get existing transaction
        const transaction = await ctx.db.get(transactionId);
        if (!transaction) {
            throw new Error("Transaction not found");
        }

        // Update transaction with timestamp to track user modifications
        await ctx.db.patch(transactionId, {
            ...updates,
            updatedAt: Date.now(), // Track when user made changes
        });

        return { success: true };
    },
});

// Helper query to get transactions in a date range (useful for debugging/admin)
export const getTransactionsInDateRange = query({
    args: {
        userId: v.id("users"),
        accountId: v.id("accounts"),
        startDate: v.number(),
        endDate: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId, accountId, startDate, endDate } = args;

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .filter((q) => 
                q.and(
                    q.eq(q.field("userId"), userId),
                    q.gte(q.field("date"), startDate),
                    q.lte(q.field("date"), endDate)
                )
            )
            .collect();

        // Categorize transactions
        const userEdited = transactions.filter(t => t.categoryId !== undefined);
        const unmodified = transactions.filter(t => t.categoryId === undefined);

        return {
            total: transactions.length,
            userEdited: userEdited.length,
            unmodified: unmodified.length,
            transactions,
        };
    },
});

// Cleanup mutation for development
export const deleteAllTransactions = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        // Get all transactions for the user
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Delete each transaction
        for (const transaction of transactions) {
            await ctx.db.delete(transaction._id);
        }

        return {
            success: true,
            deletedCount: transactions.length,
        };
    },
});