// convex/imports.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";


export const registerImport = mutation({
    args: {
        userId: v.id("users"),
        accountId: v.id("accounts"),
        fileKey: v.string(),
        fileName: v.string(),
        contentType: v.string(),
        size: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId, accountId, fileKey, fileName, contentType, size } = args;

        const account = await ctx.db.get(accountId);
        if (!account || account.userId !== userId) {
            throw new Error("Account not found or not owned by user");
        }

        const importId = await ctx.db.insert("imports", {
            userId,
            accountId,
            fileKey,
            fileName,
            contentType,
            size,
            status: "uploaded",
            uploadedAt: Date.now(),
        });

        return { importId };
    },
});

// // ✅ New: Create import session (called from importTransactions)
// export const createImportSession = mutation({
//     args: {
//         sessionId: v.string(),
//         userId: v.id("users"),
//         accountId: v.id("accounts"),
//         importId: v.id("imports"),
//         pendingTransactions: v.array(v.object({
//             date: v.number(),
//             amount: v.number(),
//             description: v.string(),
//             category: v.optional(v.string()),
//             transactionType: v.optional(v.string()),
//             rawData: v.any(),
//         })),
//         duplicates: v.array(v.object({
//             existingId: v.id("transactions"),
//             newTransaction: v.object({
//                 date: v.number(),
//                 amount: v.number(),
//                 description: v.string(),
//                 transactionType: v.optional(v.string()),
//                 rawData: v.any(),
//             }),
//         })),
//         errors: v.array(v.object({
//             rowIndex: v.number(),
//             message: v.string(),
//         })),
//         summary: v.object({
//             inserted: v.number(),
//             skipped: v.number(),
//             totalErrors: v.number(),
//         }),
//     },
//     handler: async (ctx, args) => {
//         const sessionId = await ctx.db.insert("import_sessions", {
//             sessionId: args.sessionId,
//             userId: args.userId,
//             accountId: args.accountId,
//             importId: args.importId,
//             pendingTransactions: args.pendingTransactions,
//             duplicates: args.duplicates,
//             errors: args.errors,
//             summary: args.summary,
//             createdAt: Date.now(),
//             status: args.duplicates.length > 0 ? "awaiting_review" : "completed",
//         });

//         return { sessionId };
//     },
// });

export const updateImportStatus = mutation({
    args: {
        importId: v.id("imports"),
        status: v.union(
            v.literal("uploaded"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed")
        ),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: Record<string, unknown> = {
            status: args.status,
            updatedAt: Date.now(),
        };

        if (args.error) {
            updates.error = args.error;
        }

        if (args.status === "completed" || args.status === "failed") {
            updates.processedAt = Date.now();
        }

        await ctx.db.patch(args.importId, updates);
    },
});


// ✅ Get complete import history for a user
export const getImportHistory = query({
    args: {
        userId: v.id("users"),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        const accountId = args.accountId;
        let imports;

        if (accountId !== undefined) {
            // Query by account
            imports = await ctx.db
                .query("imports")
                .withIndex("by_account", (q) => q.eq("accountId", accountId))
                .order("desc")
                .collect();
        } else {
            // Query by user
            imports = await ctx.db
                .query("imports")
                .withIndex("by_user", (q) => q.eq("userId", args.userId))
                .order("desc")
                .collect();
        }

        // Enrich with session info
        const enrichedImports = await Promise.all(
            imports.map(async (importRecord) => {
                const session = await ctx.db
                    .query("import_sessions")
                    .withIndex("by_import", (q) => q.eq("importId", importRecord._id))
                    .unique();

                return {
                    ...importRecord,
                    session: session ? {
                        status: session.status,
                        hasDuplicates: session.duplicates.length > 0,
                        duplicateCount: session.duplicates.length,
                        errorCount: session.errors.length,
                        resolvedAt: session.resolvedAt,
                    } : null,
                };
            })
        );

        return enrichedImports;
    },
});

// ✅ Get detailed import with all related data
export const getImportDetails = query({
    args: {
        importId: v.id("imports"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const importRecord = await ctx.db.get(args.importId);

        if (!importRecord || importRecord.userId !== args.userId) {
            throw new Error("Import not found or unauthorized");
        }

        // Get session
        const session = await ctx.db
            .query("import_sessions")
            .withIndex("by_import", (q) => q.eq("importId", args.importId))
            .unique();

        // Get transactions created by this import
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_import", (q) => q.eq("importId", args.importId))
            .collect();

        // Get duplicate resolutions
        const resolutions = await ctx.db
            .query("import_duplicate_resolutions")
            .withIndex("by_import", (q) => q.eq("importId", args.importId))
            .collect();

        // Enrich resolutions with transaction details
        const enrichedResolutions = await Promise.all(
            resolutions.map(async (resolution) => {
                const existingTransaction = resolution.existingTransactionId
                    ? await ctx.db.get(resolution.existingTransactionId)
                    : null;
                const newTransaction = resolution.newTransactionId
                    ? await ctx.db.get(resolution.newTransactionId)
                    : null;

                return {
                    ...resolution,
                    existingTransaction,
                    newTransaction,
                };
            })
        );

        return {
            import: importRecord,
            session: session || null,
            transactions,
            resolutions: enrichedResolutions,
            stats: {
                totalTransactions: transactions.length,
                totalResolutions: resolutions.length,
                skipped: resolutions.filter(r => r.action === "skip").length,
                imported: resolutions.filter(r => r.action === "import").length,
            },
        };
    },
});

// ✅ Get active import sessions (awaiting review)
export const getActiveImportSessions = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("import_sessions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("status"), "awaiting_review"))
            .collect();

        // Enrich with import file info
        const enrichedSessions = await Promise.all(
            sessions.map(async (session) => {
                const importRecord = await ctx.db.get(session.importId);
                const account = await ctx.db.get(session.accountId);

                return {
                    ...session,
                    fileName: importRecord?.fileName,
                    accountName: account?.name,
                    uploadedAt: importRecord?.uploadedAt,
                };
            })
        );

        return enrichedSessions;
    },
});

// ✅ Load session for duplicate review
// export const loadImportSession = query({
//     args: {
//         sessionId: v.string(),
//         userId: v.id("users"),
//     },
//     handler: async (ctx, args) => {
//         const session = await ctx.db
//             .query("import_sessions")
//             .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
//             .unique();

//         if (!session || session.userId !== args.userId) {
//             return null;
//         }

//         // Get import file info
//         const importRecord = await ctx.db.get(session.importId);

//         return {
//             ...session,
//             fileName: importRecord?.fileName,
//             uploadedAt: importRecord?.uploadedAt,
//         };
//     },
// });

// ✅ Get import statistics for dashboard
export const getImportStats = query({
    args: {
        userId: v.id("users"),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        const accountId = args.accountId;
        let imports;

        if (accountId !== undefined) {
            // Query by account
            imports = await ctx.db
                .query("imports")
                .withIndex("by_account", (q) => q.eq("accountId", accountId))
                .collect();
        } else {
            // Query by user
            imports = await ctx.db
                .query("imports")
                .withIndex("by_user", (q) => q.eq("userId", args.userId))
                .collect();
        }

        const stats = {
            totalImports: imports.length,
            completedImports: imports.filter(i => i.status === "completed").length,
            failedImports: imports.filter(i => i.status === "failed").length,
            processingImports: imports.filter(i => i.status === "processing").length,
            totalTransactionsImported: imports.reduce((sum, i) => sum + (i.importedCount || 0), 0),
            totalTransactionsSkipped: imports.reduce((sum, i) => sum + (i.skippedCount || 0), 0),
            totalErrors: imports.reduce((sum, i) => sum + (i.errorCount || 0), 0),
        };

        return stats;
    },
});