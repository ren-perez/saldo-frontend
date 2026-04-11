// convex/telegram.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Helpers ───────────────────────────────────────────────

function generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable chars (0,O,1,I)
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// ── Web app mutations (called from React with Clerk auth) ─

export const generatePairingCode = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const now = Date.now();

        // Invalidate any existing active codes for this user
        const existingCodes = await ctx.db
            .query("telegram_pairing_codes")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        for (const c of existingCodes) {
            if (!c.usedAt && c.expiresAt > now) {
                await ctx.db.patch(c._id, { usedAt: now });
            }
        }

        const code = generateCode();
        const expiresAt = now + 10 * 60 * 1000; // 10 minutes

        await ctx.db.insert("telegram_pairing_codes", {
            userId,
            code,
            expiresAt,
            createdAt: now,
        });

        console.log("[TELEGRAM_AUDIT] code_generated", {
            userId,
            timestamp: new Date(now).toISOString(),
        });

        return { code, expiresAt };
    },
});

export const getPendingCode = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const now = Date.now();
        const codes = await ctx.db
            .query("telegram_pairing_codes")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return codes.find((c) => !c.usedAt && c.expiresAt > now) ?? null;
    },
});

export const getConnectionStatus = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const connections = await ctx.db
            .query("telegram_connections")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return connections.find((c) => c.isActive) ?? null;
    },
});

export const unlinkTelegram = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const connections = await ctx.db
            .query("telegram_connections")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        for (const conn of connections.filter((c) => c.isActive)) {
            await ctx.db.patch(conn._id, { isActive: false });
        }

        console.log("[TELEGRAM_AUDIT] unlink_performed", {
            userId,
            timestamp: new Date().toISOString(),
        });
    },
});

// ── Bot mutations (called from webhook — no Clerk auth) ───

export const linkFromBot = mutation({
    args: {
        code: v.string(),
        telegramUserId: v.string(),
        telegramChatId: v.string(),
        telegramUsername: v.optional(v.string()),
        telegramFirstName: v.optional(v.string()),
        telegramLastName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // Validate code
        const pairingCode = await ctx.db
            .query("telegram_pairing_codes")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .unique();

        if (!pairingCode) {
            console.log("[TELEGRAM_AUDIT] invalid_link_attempt", {
                code: args.code,
                telegramUserId: args.telegramUserId,
                reason: "code_not_found",
                timestamp: new Date(now).toISOString(),
            });
            return { success: false, error: "invalid_code" as const };
        }

        if (pairingCode.usedAt) {
            console.log("[TELEGRAM_AUDIT] invalid_link_attempt", {
                code: args.code,
                telegramUserId: args.telegramUserId,
                reason: "code_already_used",
                timestamp: new Date(now).toISOString(),
            });
            return { success: false, error: "code_already_used" as const };
        }

        if (pairingCode.expiresAt <= now) {
            console.log("[TELEGRAM_AUDIT] code_expired", {
                code: args.code,
                telegramUserId: args.telegramUserId,
                timestamp: new Date(now).toISOString(),
            });
            return { success: false, error: "code_expired" as const };
        }

        // Check for duplicate/conflicting links
        const existingConns = await ctx.db
            .query("telegram_connections")
            .withIndex("by_telegram_user", (q) =>
                q.eq("telegramUserId", args.telegramUserId)
            )
            .collect();

        const activeConn = existingConns.find((c) => c.isActive);
        if (activeConn) {
            if (activeConn.userId === pairingCode.userId) {
                return { success: false, error: "already_linked_to_you" as const };
            }
            console.log("[TELEGRAM_AUDIT] invalid_link_attempt", {
                telegramUserId: args.telegramUserId,
                reason: "already_linked_to_other_user",
                timestamp: new Date(now).toISOString(),
            });
            return { success: false, error: "already_linked_to_other" as const };
        }

        // Create connection
        await ctx.db.insert("telegram_connections", {
            userId: pairingCode.userId,
            telegramUserId: args.telegramUserId,
            telegramChatId: args.telegramChatId,
            telegramUsername: args.telegramUsername,
            telegramFirstName: args.telegramFirstName,
            telegramLastName: args.telegramLastName,
            linkedAt: now,
            isActive: true,
        });

        // Mark code as used
        await ctx.db.patch(pairingCode._id, { usedAt: now });

        console.log("[TELEGRAM_AUDIT] link_created", {
            userId: pairingCode.userId,
            telegramUserId: args.telegramUserId,
            timestamp: new Date(now).toISOString(),
        });

        return { success: true };
    },
});

export const getConnectionByTelegramId = query({
    args: { telegramUserId: v.string() },
    handler: async (ctx, { telegramUserId }) => {
        const connections = await ctx.db
            .query("telegram_connections")
            .withIndex("by_telegram_user", (q) =>
                q.eq("telegramUserId", telegramUserId)
            )
            .collect();

        return connections.find((c) => c.isActive) ?? null;
    },
});
