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

export const listTransactionsPaginated = query({
    args: {
        userId: v.id("users"),
        accountId: v.optional(v.id("accounts")),
        transactionType: v.optional(v.string()),
        categoryId: v.optional(v.string()), // Changed to string to handle special values
        groupId: v.optional(v.string()), // Added for group filtering
        searchTerm: v.optional(v.string()),
        startDate: v.optional(v.number()), // timestamp
        endDate: v.optional(v.number()),   // timestamp
        page: v.number(),
        pageSize: v.number(),
    },
    handler: async (ctx, args) => {
        const { 
            userId, 
            accountId, 
            transactionType, 
            categoryId, 
            groupId,
            searchTerm, 
            startDate, 
            endDate, 
            page, 
            pageSize 
        } = args;

        // Build base query
        let query = ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId));

        // Apply account filter at database level if specified
        if (accountId) {
            query = ctx.db
                .query("transactions")
                .withIndex("by_account", (q) => q.eq("accountId", accountId));
        }

        // Get all matching transactions
        let allTransactions = await query.collect();

        // Get categories and groups for filtering
        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const categoryGroups = await ctx.db
            .query("category_groups")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Apply additional filters
        let filteredTransactions = allTransactions.filter((transaction) => {
            // Account filter (if not already applied at DB level)
            if (accountId && !query.toString().includes("by_account")) {
                if (transaction.accountId !== accountId) {
                    return false;
                }
            }

            // Transaction type filter
            if (transactionType) {
                if (transactionType === "untyped") {
                    // Show transactions with no type
                    if (transaction.transactionType !== undefined) {
                        return false;
                    }
                } else {
                    // Show transactions with specific type
                    if (transaction.transactionType !== transactionType) {
                        return false;
                    }
                }
            }

            // Category filter - Updated to handle "NONE" value from frontend
            if (categoryId !== undefined) {
                if (categoryId === "NONE") {
                    // Show uncategorized transactions (no categoryId)
                    if (transaction.categoryId !== undefined) {
                        return false;
                    }
                } else {
                    // Show transactions with specific category
                    if (transaction.categoryId !== categoryId) {
                        return false;
                    }
                }
            }

            // Group filter - Updated to handle "NONE" value from frontend
            if (groupId !== undefined) {
                if (groupId === "NONE") {
                    // Show transactions with no group (either no category or category has no group)
                    if (transaction.categoryId) {
                        const transactionCategory = categories.find(cat => cat._id === transaction.categoryId);
                        if (transactionCategory && transactionCategory.groupId) {
                            return false;
                        }
                    }
                    // If no categoryId, it automatically has no group, so include it
                } else {
                    // Show transactions with specific group
                    if (!transaction.categoryId) {
                        return false; // No category means no group
                    }
                    const transactionCategory = categories.find(cat => cat._id === transaction.categoryId);
                    if (!transactionCategory || transactionCategory.groupId !== groupId) {
                        return false;
                    }
                }
            }

            // Date range filters
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

export const deleteTransaction = mutation({
    args: { transactionId: v.id("transactions") },
    handler: async (ctx, { transactionId }) => {
        // Get the transaction first to verify it exists
        const transaction = await ctx.db.get(transactionId);
        if (!transaction) {
            throw new Error("Transaction not found");
        }
        
        await ctx.db.delete(transactionId);
        return { success: true };
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
            // Special flags to explicitly clear fields
            clearTransactionType: v.optional(v.boolean()),
            clearCategoryId: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        const { transactionId, updates } = args;

        // Get existing transaction
        const transaction = await ctx.db.get(transactionId);
        if (!transaction) {
            throw new Error("Transaction not found");
        }

        // Build the update object
        const patchData: any = {
            updatedAt: Date.now(), // Track when user made changes
        };

        // Handle clearing transaction type
        if (updates.clearTransactionType) {
            patchData.transactionType = undefined;
        } else if (updates.transactionType !== undefined) {
            patchData.transactionType = updates.transactionType;
        }

        // Handle clearing category
        if (updates.clearCategoryId) {
            patchData.categoryId = undefined;
        } else if (updates.categoryId !== undefined) {
            patchData.categoryId = updates.categoryId;
        }

        // Handle other fields normally
        if (updates.description !== undefined) {
            patchData.description = updates.description;
        }
        
        if (updates.amount !== undefined) {
            patchData.amount = updates.amount;
        }

        // Use replace instead of patch to ensure undefined values are set
        const updatedTransaction = {
            ...transaction,
            ...patchData,
        };

        await ctx.db.replace(transactionId, updatedTransaction);

        return { success: true };
    },
});

// Update transaction by setting category through group selection
export const updateTransactionByGroup = mutation({
    args: {
        transactionId: v.id("transactions"),
        groupId: v.optional(v.id("category_groups")),
        categoryId: v.optional(v.id("categories")),
        clearGroup: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { transactionId, groupId, categoryId, clearGroup } = args;

        // Get existing transaction
        const transaction = await ctx.db.get(transactionId);
        if (!transaction) {
            throw new Error("Transaction not found");
        }

        let finalCategoryId = categoryId;

        // If clearing group, clear category as well
        if (clearGroup) {
            finalCategoryId = undefined;
        }
        // If only group is specified, keep existing category if it belongs to the group,
        // otherwise find the first category in that group
        else if (groupId && !categoryId) {
            const currentCategory = transaction.categoryId ?
                await ctx.db.get(transaction.categoryId) : null;

            // If current category belongs to the selected group, keep it
            if (currentCategory && currentCategory.groupId === groupId) {
                finalCategoryId = currentCategory._id;
            } else {
                // Otherwise, find the first category in that group
                const categoriesInGroup = await ctx.db
                    .query("categories")
                    .withIndex("by_group", (q) => q.eq("groupId", groupId))
                    .collect();

                if (categoriesInGroup.length > 0) {
                    finalCategoryId = categoriesInGroup[0]._id;
                }
            }
        }

        // Update the transaction
        const updatedTransaction = {
            ...transaction,
            categoryId: finalCategoryId,
            updatedAt: Date.now(),
        };

        await ctx.db.replace(transactionId, updatedTransaction);

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