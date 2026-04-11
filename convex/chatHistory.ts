// convex/chatHistory.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ── Inbound messages ───────────────────────────────────────

export const saveInboundMessage = mutation({
    args: {
        userId: v.optional(v.id("users")),
        telegramConnectionId: v.optional(v.id("telegram_connections")),
        telegramChatId: v.string(),
        telegramMessageId: v.string(),
        messageType: v.string(),
        text: v.string(),
        rawPayload: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Idempotency guard — skip duplicate webhook deliveries
        const existing = await ctx.db
            .query("messages")
            .withIndex("by_telegram_message", (q) =>
                q.eq("telegramMessageId", args.telegramMessageId).eq("direction", "inbound")
            )
            .unique();

        if (existing) {
            console.log("[CHAT_HISTORY] duplicate inbound, skipping", args.telegramMessageId);
            return existing._id;
        }

        return await ctx.db.insert("messages", {
            userId: args.userId,
            telegramConnectionId: args.telegramConnectionId,
            channel: "telegram",
            direction: "inbound",
            messageType: args.messageType,
            text: args.text,
            rawPayload: args.rawPayload,
            telegramMessageId: args.telegramMessageId,
            telegramChatId: args.telegramChatId,
            createdAt: Date.now(),
        });
    },
});

// ── Outbound messages ──────────────────────────────────────

export const saveOutboundMessage = mutation({
    args: {
        userId: v.optional(v.id("users")),
        telegramConnectionId: v.optional(v.id("telegram_connections")),
        telegramChatId: v.string(),
        telegramMessageId: v.optional(v.string()),
        text: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("messages", {
            userId: args.userId,
            telegramConnectionId: args.telegramConnectionId,
            channel: "telegram",
            direction: "outbound",
            messageType: "text",
            text: args.text,
            telegramMessageId: args.telegramMessageId,
            telegramChatId: args.telegramChatId,
            createdAt: Date.now(),
        });
    },
});

// ── Actions ────────────────────────────────────────────────

export const createAction = mutation({
    args: {
        userId: v.optional(v.id("users")),
        messageId: v.optional(v.id("messages")),
        channel: v.string(),
        actionType: v.string(),
        inputJson: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("actions", {
            userId: args.userId,
            messageId: args.messageId,
            channel: args.channel,
            actionType: args.actionType,
            status: "pending",
            inputJson: args.inputJson,
            createdAt: Date.now(),
        });
    },
});

export const completeAction = mutation({
    args: {
        actionId: v.id("actions"),
        resultJson: v.optional(v.any()),
    },
    handler: async (ctx, { actionId, resultJson }) => {
        await ctx.db.patch(actionId, {
            status: "completed",
            resultJson,
            completedAt: Date.now(),
        });
    },
});

export const failAction = mutation({
    args: {
        actionId: v.id("actions"),
        errorText: v.string(),
    },
    handler: async (ctx, { actionId, errorText }) => {
        await ctx.db.patch(actionId, {
            status: "failed",
            errorText,
            completedAt: Date.now(),
        });
    },
});

// ── Rate limiting ──────────────────────────────────────────

/**
 * Count inbound messages from a chat since a given timestamp.
 * Used by the webhook to enforce per-chat rate limits (Story 4).
 */
export const getRecentInboundCount = query({
    args: {
        telegramChatId: v.string(),
        since: v.number(), // unix ms
    },
    handler: async (ctx, { telegramChatId, since }) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chat_and_created", (q) =>
                q.eq("telegramChatId", telegramChatId).gte("createdAt", since)
            )
            .filter((q) => q.eq(q.field("direction"), "inbound"))
            .collect();
        return messages.length;
    },
});

// ── History queries (for web app UI) ──────────────────────

export const getMessageHistory = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("messages")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(100);
    },
});

export const getActionHistory = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("actions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(50);
    },
});
