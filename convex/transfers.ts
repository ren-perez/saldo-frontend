// convex/transfers.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const pairTransfers = mutation({
    args: {
        userId: v.id("users"),
        outgoingTransactionId: v.id("transactions"),
        incomingTransactionId: v.id("transactions"),
    },
    handler: async (ctx, args) => {
        const { userId, outgoingTransactionId, incomingTransactionId } = args;

        // Get both transactions
        const outgoingTx = await ctx.db.get(outgoingTransactionId);
        const incomingTx = await ctx.db.get(incomingTransactionId);

        if (!outgoingTx || !incomingTx) {
            throw new Error("One or both transactions not found");
        }

        // Verify they belong to the user
        if (outgoingTx.userId !== userId || incomingTx.userId !== userId) {
            throw new Error("Transactions not owned by user");
        }

        // Verify they're not already paired
        if (outgoingTx.transfer_pair_id || incomingTx.transfer_pair_id) {
            throw new Error("One or both transactions are already paired");
        }

        // Verify they're different accounts
        if (outgoingTx.accountId === incomingTx.accountId) {
            throw new Error("Transfers must be between different accounts");
        }

        // Verify amounts have opposite signs
        if ((outgoingTx.amount >= 0) || (incomingTx.amount <= 0)) {
            throw new Error("Invalid transfer pair: expecting outgoing (negative) and incoming (positive) transactions");
        }

        // Generate a unique pair ID
        const transferPairId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Update both transactions
        await ctx.db.replace(outgoingTransactionId, {
            ...outgoingTx,
            transfer_pair_id: transferPairId,
            transactionType: "transfer",
            updatedAt: Date.now(),
        });

        await ctx.db.replace(incomingTransactionId, {
            ...incomingTx,
            transfer_pair_id: transferPairId,
            transactionType: "transfer",
            updatedAt: Date.now(),
        });

        return {
            success: true,
            transferPairId,
        };
    },
});

export const unpairTransfers = mutation({
    args: {
        userId: v.id("users"),
        transferPairId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId, transferPairId } = args;

        // Find all transactions with this pair ID
        const pairedTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_transfer_pair", (q) => q.eq("transfer_pair_id", transferPairId))
            .collect();

        // Verify they belong to the user
        for (const tx of pairedTransactions) {
            if (tx.userId !== userId) {
                throw new Error("Transfer pair contains transactions not owned by user");
            }
        }

        // Remove the pair ID from all transactions
        for (const tx of pairedTransactions) {
            await ctx.db.replace(tx._id, {
                ...tx,
                transfer_pair_id: undefined,
                transactionType: undefined,
                updatedAt: Date.now(),
            });
        }

        return {
            success: true,
            unpairedCount: pairedTransactions.length,
        };
    },
});

export const listTransferPairs = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Get all paired transactions
        const pairedTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.neq(q.field("transfer_pair_id"), undefined))
            .collect();

        // Group by transfer pair ID
        const pairs = new Map<string, typeof pairedTransactions>();
        for (const tx of pairedTransactions) {
            const pairId = tx.transfer_pair_id!;
            if (!pairs.has(pairId)) {
                pairs.set(pairId, []);
            }
            pairs.get(pairId)!.push(tx);
        }

        // Format the pairs
        const transferPairs = Array.from(pairs.entries()).map(([pairId, transactions]) => {
            const outgoing = transactions.find(tx => tx.amount < 0);
            const incoming = transactions.find(tx => tx.amount > 0);

            return {
                transferPairId: pairId,
                outgoingTransaction: outgoing,
                incomingTransaction: incoming,
                createdAt: Math.min(...transactions.map(tx => tx.updatedAt || tx.createdAt || 0)),
            };
        });

        // Sort by creation date (newest first)
        transferPairs.sort((a, b) => b.createdAt - a.createdAt);

        return transferPairs;
    },
});

export const getPotentialTransfers = query({
    args: {
        userId: v.id("users"),
        maxDaysDifference: v.optional(v.number()),
        maxAmountDifferenceRatio: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, maxDaysDifference = 2, maxAmountDifferenceRatio = 0.05 } = args;

        // Get all unpaired transactions
        const allTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("transfer_pair_id"), undefined))
            .collect();

        // Get accounts for reference
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Get ignored pairs
        const ignoredPairs = await ctx.db
            .query("ignored_transfer_pairs")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const ignoredPairsSet = new Set(
            ignoredPairs.map(pair => `${pair.outgoingTransactionId}-${pair.incomingTransactionId}`)
        );

        const accountMap = new Map(accounts.map(acc => [acc._id, acc]));

        const outgoingTxns = allTransactions.filter(t => t.amount < 0);
        const incomingTxns = allTransactions.filter(t => t.amount > 0);

        const potentialTransfers = [];

        for (const outgoing of outgoingTxns) {
            const outgoingAccount = accountMap.get(outgoing.accountId);
            if (!outgoingAccount) continue;

            for (const incoming of incomingTxns) {
                const incomingAccount = accountMap.get(incoming.accountId);
                if (!incomingAccount || outgoing.accountId === incoming.accountId) continue;

                const amountDifference = Math.abs(Math.abs(outgoing.amount) - incoming.amount);
                const amountRatio = amountDifference / Math.abs(outgoing.amount);
                const daysDifference = Math.abs((incoming.date - outgoing.date) / (1000 * 60 * 60 * 24));

                if (daysDifference <= maxDaysDifference && amountRatio <= maxAmountDifferenceRatio) {
                    // Skip if this pair has been ignored
                    const pairKey = `${outgoing._id}-${incoming._id}`;
                    if (ignoredPairsSet.has(pairKey)) {
                        continue;
                    }

                    let matchType: 'exact' | 'close' | 'loose' = 'loose';
                    let confidence: 'high' | 'medium' | 'low' = 'low';
                    let matchScore = 0;

                    if (amountDifference < 0.01) {
                        matchType = 'exact';
                        confidence = 'high';
                        matchScore = 100 - (daysDifference * 5);
                    } else if (amountRatio <= 0.02) {
                        matchType = 'close';
                        confidence = daysDifference <= 1 ? 'high' : 'medium';
                        matchScore = 80 - (daysDifference * 5) - (amountRatio * 100);
                    } else {
                        matchType = 'loose';
                        confidence = 'medium';
                        matchScore = 60 - (daysDifference * 10) - (amountRatio * 200);
                    }

                    potentialTransfers.push({
                        id: `${outgoing._id}-${incoming._id}`,
                        outgoingTransaction: outgoing,
                        incomingTransaction: incoming,
                        outgoingAccount,
                        incomingAccount,
                        matchScore,
                        matchType,
                        daysDifference,
                        amountDifference,
                        confidence
                    });
                }
            }
        }

        // Sort by match score (highest first)
        potentialTransfers.sort((a, b) => b.matchScore - a.matchScore);

        return potentialTransfers;
    },
});

export const ignoreTransferSuggestion = mutation({
    args: {
        userId: v.id("users"),
        outgoingTransactionId: v.id("transactions"),
        incomingTransactionId: v.id("transactions"),
    },
    handler: async (ctx, args) => {
        const { userId, outgoingTransactionId, incomingTransactionId } = args;

        const outgoingTx = await ctx.db.get(outgoingTransactionId);
        const incomingTx = await ctx.db.get(incomingTransactionId);

        if (!outgoingTx || !incomingTx) {
            throw new Error("One or both transactions not found");
        }

        if (outgoingTx.userId !== userId || incomingTx.userId !== userId) {
            throw new Error("Transactions not owned by user");
        }

        // Check if this pair is already ignored
        const existingIgnored = await ctx.db
            .query("ignored_transfer_pairs")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.and(
                q.eq(q.field("outgoingTransactionId"), outgoingTransactionId),
                q.eq(q.field("incomingTransactionId"), incomingTransactionId)
            ))
            .first();

        if (existingIgnored) {
            return {
                success: true,
                message: "Transfer pair already ignored"
            };
        }

        // Store the ignored pair
        await ctx.db.insert("ignored_transfer_pairs", {
            userId,
            outgoingTransactionId,
            incomingTransactionId,
            createdAt: Date.now(),
        });

        return {
            success: true,
            message: "Transfer suggestion ignored"
        };
    },
});

export const unignoreTransferSuggestion = mutation({
    args: {
        userId: v.id("users"),
        outgoingTransactionId: v.id("transactions"),
        incomingTransactionId: v.id("transactions"),
    },
    handler: async (ctx, args) => {
        const { userId, outgoingTransactionId, incomingTransactionId } = args;

        // Find and delete the ignored pair
        const ignoredPair = await ctx.db
            .query("ignored_transfer_pairs")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.and(
                q.eq(q.field("outgoingTransactionId"), outgoingTransactionId),
                q.eq(q.field("incomingTransactionId"), incomingTransactionId)
            ))
            .first();

        if (ignoredPair) {
            await ctx.db.delete(ignoredPair._id);
        }

        return {
            success: true,
            message: "Transfer suggestion restored"
        };
    },
});

export const listIgnoredTransferPairs = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const ignoredPairs = await ctx.db
            .query("ignored_transfer_pairs")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Get transaction and account details
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const accountMap = new Map(accounts.map(acc => [acc._id, acc]));

        const detailedIgnoredPairs = [];
        for (const pair of ignoredPairs) {
            const outgoingTx = await ctx.db.get(pair.outgoingTransactionId);
            const incomingTx = await ctx.db.get(pair.incomingTransactionId);

            if (outgoingTx && incomingTx) {
                detailedIgnoredPairs.push({
                    id: pair._id,
                    outgoingTransaction: outgoingTx,
                    incomingTransaction: incomingTx,
                    outgoingAccount: accountMap.get(outgoingTx.accountId),
                    incomingAccount: accountMap.get(incomingTx.accountId),
                    ignoredAt: pair.createdAt,
                });
            }
        }

        return detailedIgnoredPairs.sort((a, b) => b.ignoredAt - a.ignoredAt);
    },
});