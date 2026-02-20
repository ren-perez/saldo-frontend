// convex/transactions.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const normalizeDescription = (description: string): string => {
    return description.toLowerCase().trim().replace(/\s+/g, ' ');
};

const createDeduplicationKey = (accountId: string, amount: number, description: string): string => {
    return `${accountId}:${amount}:${normalizeDescription(description)}`;
};

export const importTransactions = mutation({
    args: {
        userId: v.id("users"),
        accountId: v.id("accounts"),
        transactions: v.array(v.object({
            date: v.number(),
            amount: v.number(),
            description: v.string(),
            category: v.optional(v.string()),
            transactionType: v.optional(v.string()),
            rawData: v.any(),
        })),
        sessionId: v.string(),
        importId: v.id("imports"), // ✅ Required, not optional
    },
    handler: async (ctx, args) => {
        const { userId, accountId, transactions, sessionId, importId } = args;

        // Verify account belongs to user
        const account = await ctx.db.get(accountId);
        if (!account || account.userId !== userId) {
            throw new Error("Account not found or not owned by user");
        }

        // Get all existing transactions for this account to check for duplicates
        const existingTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_account", (q) => q.eq("accountId", accountId))
            .collect();

        // Build deduplication lookup
        const existingTransactionKeys = new Map<string, {
            _id: Id<"transactions">;
            amount: number;
            description: string;
            [key: string]: unknown;
        }>();
        for (const existing of existingTransactions) {
            const key = createDeduplicationKey(accountId, existing.amount, existing.description);
            existingTransactionKeys.set(key, existing);
        }

        const inserted: string[] = [];
        const possibleDuplicates = [];
        const errors: Array<{ rowIndex: number; message: string }> = [];

        // Process each transaction
        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];

            try {
                // Validate transaction data
                if (!transaction.description || transaction.description.trim() === '') {
                    errors.push({ rowIndex: i, message: 'Description is required' });
                    continue;
                }

                if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
                    errors.push({ rowIndex: i, message: 'Invalid amount' });
                    continue;
                }

                if (typeof transaction.date !== 'number' || isNaN(transaction.date)) {
                    errors.push({ rowIndex: i, message: 'Invalid date' });
                    continue;
                }

                // Check for duplicates
                const deduplicationKey = createDeduplicationKey(accountId, transaction.amount, transaction.description);
                const existingTransaction = existingTransactionKeys.get(deduplicationKey);

                if (existingTransaction) {
                    // Possible duplicate found
                    possibleDuplicates.push({
                        existingId: existingTransaction._id,
                        newTransaction: {
                            date: transaction.date,
                            amount: transaction.amount,
                            description: transaction.description,
                            transactionType: transaction.transactionType,
                            rawData: transaction.rawData,
                            importId: importId,
                        },
                    });
                } else {
                    // No duplicate, insert new transaction
                    const insertedId = await ctx.db.insert("transactions", {
                        userId,
                        accountId,
                        date: transaction.date,
                        amount: transaction.amount,
                        description: transaction.description,
                        importId: importId,
                        transactionType: transaction.transactionType,
                        categoryId: undefined,
                        createdAt: Date.now(),
                    });
                    inserted.push(insertedId);
                }
            } catch (error) {
                errors.push({
                    rowIndex: i,
                    message: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }

        // ✅ ALWAYS create import session (no conditional)
        await ctx.db.insert("import_sessions", {
            sessionId,
            userId,
            accountId,
            importId,
            pendingTransactions: transactions,
            duplicates: possibleDuplicates,
            errors,
            summary: {
                inserted: inserted.length,
                skipped: possibleDuplicates.length,
                totalErrors: errors.length,
            },
            createdAt: Date.now(),
            status: possibleDuplicates.length > 0 ? "awaiting_review" : "completed",
        });

        return {
            inserted: inserted.length,
            skipped: possibleDuplicates.length,
            errors,
            sessionId, // ✅ Always return sessionId
            hasDuplicates: possibleDuplicates.length > 0,
        };
    },
});


export const resolveDuplicates = mutation({
    args: {
        sessionId: v.string(),
        userId: v.id("users"),
        decisions: v.array(v.object({
            existingId: v.id("transactions"),
            action: v.union(v.literal("skip"), v.literal("import")),
            newTransaction: v.optional(v.object({
                date: v.number(),
                amount: v.number(),
                description: v.string(),
                transactionType: v.optional(v.string()),
                rawData: v.any(),
            })),
        })),
    },
    handler: async (ctx, args) => {
        const { sessionId, userId, decisions } = args;

        // Get session
        const session = await ctx.db
            .query("import_sessions")
            .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
            .unique();

        if (!session || session.userId !== userId) {
            throw new Error("Session not found or unauthorized");
        }

        const { importId, accountId } = session;
        let importedCount = session.summary.inserted;

        // Process decisions
        for (const decision of decisions) {
            if (decision.action === "import" && decision.newTransaction) {
                // Import the transaction
                const insertedId = await ctx.db.insert("transactions", {
                    userId,
                    accountId,
                    date: decision.newTransaction.date,
                    amount: decision.newTransaction.amount,
                    description: decision.newTransaction.description,
                    transactionType: decision.newTransaction.transactionType,
                    importId,
                    createdAt: Date.now(),
                });

                importedCount++;

                // Record resolution
                await ctx.db.insert("import_duplicate_resolutions", {
                    sessionId,
                    importId,
                    userId,
                    existingTransactionId: decision.existingId,
                    action: "import",
                    newTransactionId: insertedId,
                    resolvedAt: Date.now(),
                });
            } else {
                // Skip - record decision
                await ctx.db.insert("import_duplicate_resolutions", {
                    sessionId,
                    importId,
                    userId,
                    existingTransactionId: decision.existingId,
                    action: "skip",
                    resolvedAt: Date.now(),
                });
            }
        }

        // Update session status
        await ctx.db.patch(session._id, {
            status: "completed",
            resolvedAt: Date.now(),
            summary: {
                ...session.summary,
                inserted: importedCount,
            },
        });

        // Update import record
        await ctx.db.patch(importId, {
            status: "completed",
            processedAt: Date.now(),
            importedCount,
            skippedCount: session.summary.skipped - (importedCount - session.summary.inserted),
            updatedAt: Date.now(),
        });

        return {
            success: true,
            totalImported: importedCount,
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
        const allTransactions = await query.collect();

        // Get categories and groups for filtering
        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();


        // Apply additional filters
        const filteredTransactions = allTransactions.filter((transaction) => {
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

        const oldCategoryId = transaction.categoryId;

        // Build the update object
        const patchData: Record<string, unknown> = {
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

            // If a category is being assigned, inherit its transaction type (unless explicitly clearing transaction type)
            if (updates.categoryId && !updates.clearTransactionType && updates.transactionType === undefined) {
                const category = await ctx.db.get(updates.categoryId);
                if (category && category.transactionType) {
                    patchData.transactionType = category.transactionType;
                }
            }
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

        // Get the transaction type from the category (if a category is being assigned)
        let inheritedTransactionType = transaction.transactionType;
        if (finalCategoryId) {
            const category = await ctx.db.get(finalCategoryId);
            if (category && category.transactionType) {
                inheritedTransactionType = category.transactionType;
            }
        }

        const oldCategoryId = transaction.categoryId;

        // Update the transaction
        const updatedTransaction = {
            ...transaction,
            categoryId: finalCategoryId,
            transactionType: inheritedTransactionType,
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

// export const mergeTransaction = mutation({
//     args: {
//         existingTransactionId: v.id("transactions"),
//         newTransactionData: v.object({
//             date: v.number(),
//             amount: v.number(),
//             description: v.string(),
//             transactionType: v.optional(v.string()),
//             rawData: v.any(), // Raw CSV data - keeping v.any() for Convex compatibility
//         }),
//         userId: v.id("users"),
//     },
//     handler: async (ctx, args) => {
//         const { existingTransactionId, newTransactionData, userId } = args;

//         // Get the existing transaction
//         const existingTransaction = await ctx.db.get(existingTransactionId);
//         if (!existingTransaction) {
//             throw new Error("Transaction not found");
//         }

//         // Verify the transaction belongs to the user
//         if (existingTransaction.userId !== userId) {
//             throw new Error("Transaction not owned by user");
//         }

//         // Merge: preserve user edits (category, type if manually set) but update file-driven values
//         const mergedTransaction = {
//             ...existingTransaction,
//             date: newTransactionData.date,
//             amount: newTransactionData.amount,
//             description: newTransactionData.description,
//             // Only update transactionType if user hasn't manually set one (preserve user edits)
//             transactionType: existingTransaction.updatedAt
//                 ? existingTransaction.transactionType // Keep existing if user edited
//                 : newTransactionData.transactionType, // Use new if never edited
//             updatedAt: Date.now(),
//         };

//         await ctx.db.replace(existingTransactionId, mergedTransaction);

//         return { success: true };
//     },
// });

export const mergeTransaction = mutation({
    args: {
        existingTransactionId: v.id("transactions"),
        newTransactionData: v.object({
            date: v.number(),
            amount: v.number(),
            description: v.string(),
            transactionType: v.optional(v.string()),
            importId: v.optional(v.id("imports")), // ✅ Add this
            rawData: v.any(),
        }),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { existingTransactionId, newTransactionData, userId } = args;

        // Get the existing transaction
        const existingTransaction = await ctx.db.get(existingTransactionId);
        if (!existingTransaction) {
            throw new Error("Transaction not found");
        }

        // Verify the transaction belongs to the user
        if (existingTransaction.userId !== userId) {
            throw new Error("Transaction not owned by user");
        }

        // Merge: preserve user edits but update file-driven values
        const mergedTransaction = {
            ...existingTransaction,
            date: newTransactionData.date,
            amount: newTransactionData.amount,
            description: newTransactionData.description,
            // Only update transactionType if user hasn't manually set one
            transactionType: existingTransaction.updatedAt
                ? existingTransaction.transactionType
                : newTransactionData.transactionType,
            // ✅ Update importId if provided (links old transaction to new import)
            importId: newTransactionData.importId || existingTransaction.importId,
            updatedAt: Date.now(),
        };

        await ctx.db.replace(existingTransactionId, mergedTransaction);

        return { success: true };
    },
});

export const addAsNewTransaction = mutation({
    args: {
        newTransactionData: v.object({
            date: v.number(),
            amount: v.number(),
            description: v.string(),
            transactionType: v.optional(v.string()),
            rawData: v.any(),
            importId: v.id("imports"),
        }),
        userId: v.id("users"),
        accountId: v.id("accounts"),
    },
    handler: async (ctx, args) => {
        const { newTransactionData, userId, accountId } = args;

        // Verify account belongs to user
        const account = await ctx.db.get(accountId);
        if (!account || account.userId !== userId) {
            throw new Error("Account not found or not owned by user");
        }

        // Insert the new transaction
        const insertedId = await ctx.db.insert("transactions", {
            userId,
            accountId,
            date: newTransactionData.date,
            amount: newTransactionData.amount,
            description: newTransactionData.description,
            transactionType: newTransactionData.transactionType,
            categoryId: undefined,
            createdAt: Date.now(),
            importId: newTransactionData.importId,
        });

        return { success: true, transactionId: insertedId };
    },
});


export const loadImportSession = query({
    args: {
        sessionId: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { sessionId, userId } = args;

        const session = await ctx.db
            .query("import_sessions")
            .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
            .first();

        if (!session || session.userId !== userId) {
            return null;
        }

        return session;
    },
});

export const resolveImportSession = mutation({
    args: {
        sessionId: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { sessionId, userId } = args;

        const session = await ctx.db
            .query("import_sessions")
            .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
            .first();

        if (!session || session.userId !== userId) {
            throw new Error("Session not found or not owned by user");
        }

        // Mark session as completed
        await ctx.db.patch(session._id, {
            status: "completed",
            resolvedAt: Date.now(),
        });

        return { success: true };
    },
});

export const getDashboardStats = query({
    args: {
        userId: v.id("users"),
        startDate: v.number(),
        endDate: v.number(),
    },
    handler: async (ctx, { userId, startDate, endDate }) => {
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

        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const accountMap = new Map(accounts.map((a) => [a._id.toString(), a.name]));

        const categoryGroups = await ctx.db
            .query("category_groups")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const groupMap = new Map(categoryGroups.map((g) => [g._id.toString(), g.name]));

        const categories = await ctx.db
            .query("categories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        const categoryToGroup = new Map(
            categories
                .filter((c) => c.groupId)
                .map((c) => [c._id.toString(), c.groupId!.toString()])
        );

        let totalIncome = 0;
        let totalExpenses = 0;
        const groupSpending = new Map<string, number>();
        const accountFlowMap = new Map<string, { inflow: number; outflow: number }>();
        const dailyNetMap = new Map<string, number>();

        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weekBuckets: { weekStart: number; income: number; expenses: number }[] = [];
        let weekStart = startDate;
        while (weekStart < endDate) {
            weekBuckets.push({ weekStart, income: 0, expenses: 0 });
            weekStart += msPerWeek;
        }

        for (const tx of transactions) {
            if (tx.transactionType === "transfer") continue;

            if (tx.amount > 0) {
                totalIncome += tx.amount;
            } else {
                totalExpenses += Math.abs(tx.amount);
            }

            if (tx.amount < 0 && tx.categoryId) {
                const groupId = categoryToGroup.get(tx.categoryId.toString());
                const groupName = groupId ? (groupMap.get(groupId) ?? "Uncategorized") : "Uncategorized";
                groupSpending.set(groupName, (groupSpending.get(groupName) ?? 0) + Math.abs(tx.amount));
            } else if (tx.amount < 0) {
                groupSpending.set("Uncategorized", (groupSpending.get("Uncategorized") ?? 0) + Math.abs(tx.amount));
            }

            const accId = tx.accountId.toString();
            const flow = accountFlowMap.get(accId) ?? { inflow: 0, outflow: 0 };
            if (tx.amount > 0) flow.inflow += tx.amount;
            else flow.outflow += Math.abs(tx.amount);
            accountFlowMap.set(accId, flow);

            // Daily net flow for heatmap (positive = income, negative = expense)
            const dateKey = new Date(tx.date).toISOString().split("T")[0];
            dailyNetMap.set(dateKey, (dailyNetMap.get(dateKey) ?? 0) + tx.amount);

            for (const bucket of weekBuckets) {
                const bucketEnd = bucket.weekStart + msPerWeek;
                if (tx.date >= bucket.weekStart && tx.date < bucketEnd) {
                    if (tx.amount > 0) bucket.income += tx.amount;
                    else bucket.expenses += Math.abs(tx.amount);
                    break;
                }
            }
        }

        const topCategoryGroups = Array.from(groupSpending.entries())
            .map(([groupName, amount]) => ({ groupName, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const accountFlows = Array.from(accountFlowMap.entries()).map(([accId, flow]) => ({
            accountId: accId,
            accountName: accountMap.get(accId) ?? "Unknown",
            inflow: flow.inflow,
            outflow: flow.outflow,
        }));

        const dailyNet: Record<string, number> = Object.fromEntries(dailyNetMap);

        return {
            totalIncome,
            totalExpenses,
            netFlow: totalIncome - totalExpenses,
            topCategoryGroups,
            weeklyBreakdown: weekBuckets,
            accountFlows,
            dailyNet,
        };
    },
});