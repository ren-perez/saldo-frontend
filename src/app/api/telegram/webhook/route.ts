import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { parseCommand } from "../parser";
import {
    formatCurrency,
    formatRecentList,
    formatWriteConfirmation,
    formatSummary,
    formatHint,
} from "../formatters";
import { callGemini } from "../../../../lib/ai/gemini";
import { log } from "../../../../lib/logger";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// ── Rate limiting (Epic 7, Story 4) ──────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

// ── Quick-reply hints (Epic 8, Story 10) ─────────────────
const HINTS = {
    afterBalance: "Try: /recent  or  /summary",
    afterExpense: "Try: /recent  or  ask 'how much did I spend this week?'",
    afterIncome:  "Try: /summary  to see the month so far",
    afterRecent:  "Ask naturally: 'delete that last one' or 'how much on food this week?'",
    afterSummary: "Ask: 'what did I spend on dining this month?'",
};

const HELP_TEXT = [
    "Here's what I can do:",
    "",
    "/balance   — account balances",
    "/recent    — last 5 transactions",
    "/summary   — this month's income, expenses, net",
    "/expense <amount> <description>",
    "/income  <amount> <description>",
    "",
    "Or just type naturally:",
    "  'I spent $12 on lunch'",
    "  'How much did I spend this week?'",
    "  'Delete that last transaction'",
    "",
    "Examples:",
    "  /expense 24.90 uber",
    "  /income 850 side gig",
].join("\n");

// ── Telegram send ─────────────────────────────────────────

async function sendMessage(chatId: number, text: string): Promise<string | undefined> {
    try {
        const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
        const data = (await res.json()) as { result?: { message_id?: number } };
        return data.result?.message_id != null ? String(data.result.message_id) : undefined;
    } catch (err) {
        log.error("telegram.send_failed", { error: String(err) });
        return undefined;
    }
}

async function reply(params: {
    numericChatId: number;
    chatId: string;
    text: string;
    userId?: Id<"users">;
    connectionId?: Id<"telegram_connections">;
}): Promise<void> {
    const tgMsgId = await sendMessage(params.numericChatId, params.text);
    await convex.mutation(api.chatHistory.saveOutboundMessage, {
        userId: params.userId,
        telegramConnectionId: params.connectionId,
        telegramChatId: params.chatId,
        telegramMessageId: tgMsgId,
        text: params.text,
    });
}

// ── Main handler ──────────────────────────────────────────

export async function POST(req: Request) {
    // ── Epic 7, Story 13: Webhook secret ─────────────────
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
        const provided = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (provided !== webhookSecret) {
            log.warn("telegram.webhook_secret_mismatch");
            return new Response("Unauthorized", { status: 401 });
        }
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return new Response("ok");
    }

    const update = body as Record<string, unknown>;
    const msg = update.message as Record<string, unknown> | undefined;

    if (!msg) return new Response("ok");

    // ── Non-text messages ─────────────────────────────────
    if (!msg.text) {
        const numericChatId = (msg.chat as Record<string, unknown>)?.id as number;
        const from = msg.from as Record<string, unknown> | undefined;
        const telegramUserId = String(from?.id as number);
        const connection = await convex.query(api.telegram.getConnectionByTelegramId, { telegramUserId });
        const actionId = await convex.mutation(api.chatHistory.createAction, {
            userId: connection?.userId,
            channel: "telegram",
            actionType: "unsupported_message_type",
            inputJson: { updateType: Object.keys(update).join(",") },
        });
        await reply({
            numericChatId,
            chatId: String(numericChatId),
            text: "I can only handle text messages for now.",
            userId: connection?.userId,
            connectionId: connection?._id,
        });
        await convex.mutation(api.chatHistory.completeAction, { actionId, resultJson: { handled: true } });
        return new Response("ok");
    }

    // ── Extract fields ────────────────────────────────────
    const text = (msg.text as string).trim();
    const from = msg.from as Record<string, unknown> | undefined;
    const chat = msg.chat as Record<string, unknown> | undefined;
    const telegramUserId = String(from?.id as number);
    const numericChatId = chat?.id as number;
    const chatId = String(numericChatId);
    const telegramMessageId = String(msg.message_id as number);
    const firstName = (from?.first_name as string | undefined) ?? "";

    log.info("telegram.message_received", { telegramUserId, chatId, telegramMessageId, textLen: text.length });

    // ── Resolve connection ────────────────────────────────
    const connection = await convex.query(api.telegram.getConnectionByTelegramId, { telegramUserId });
    const userId = connection?.userId;
    const connectionId = connection?._id;

    // ── Epic 7, Story 4: Rate limiting ────────────────────
    const recentCount = await convex.query(api.chatHistory.getRecentInboundCount, {
        telegramChatId: chatId,
        since: Date.now() - RATE_LIMIT_WINDOW_MS,
    });
    if (recentCount >= RATE_LIMIT_MAX) {
        log.warn("telegram.rate_limit_hit", { chatId, recentCount });
        await sendMessage(numericChatId, "You're sending messages too fast. Please wait a moment.");
        return new Response("ok");
    }

    // ── Persist inbound (deduped) ─────────────────────────
    let inboundMsgId: Id<"messages">;
    try {
        inboundMsgId = await convex.mutation(api.chatHistory.saveInboundMessage, {
            userId,
            telegramConnectionId: connectionId,
            telegramChatId: chatId,
            telegramMessageId,
            messageType: "text",
            text,
            rawPayload: msg,
        });
    } catch (err) {
        log.error("telegram.save_inbound_failed", { error: String(err) });
        inboundMsgId = undefined as unknown as Id<"messages">;
    }

    const ctx = { numericChatId, chatId, userId, connectionId };
    async function replyCtx(replyText: string) { await reply({ ...ctx, text: replyText }); }

    // ── /link <code> (pre-auth) ───────────────────────────
    if (text.startsWith("/link")) {
        const parts = text.split(/\s+/);
        const code = parts[1]?.toUpperCase();

        if (!code) {
            const actionId = await convex.mutation(api.chatHistory.createAction, {
                userId, messageId: inboundMsgId, channel: "telegram",
                actionType: "pair_account",
                inputJson: { command: "/link", error: "missing_code" },
            });
            await replyCtx("Please include your code.\nExample: /link ABC123\n\nGenerate one in Saldo — Settings — Connect Telegram.");
            await convex.mutation(api.chatHistory.failAction, { actionId, errorText: "missing_code" });
            return new Response("ok");
        }

        if (!/^[A-Z0-9]{6}$/.test(code)) {
            const actionId = await convex.mutation(api.chatHistory.createAction, {
                userId, messageId: inboundMsgId, channel: "telegram",
                actionType: "pair_account",
                inputJson: { command: "/link", code, error: "invalid_format" },
            });
            await replyCtx("That code doesn't look right. Codes are 6 characters (letters and numbers).\nExample: /link ABC123");
            await convex.mutation(api.chatHistory.failAction, { actionId, errorText: "invalid_code_format" });
            return new Response("ok");
        }

        const actionId = await convex.mutation(api.chatHistory.createAction, {
            userId, messageId: inboundMsgId, channel: "telegram",
            actionType: "pair_account",
            inputJson: { command: "/link", code },
        });

        let linkResult: { success: boolean; error?: string };
        try {
            linkResult = await convex.mutation(api.telegram.linkFromBot, {
                code,
                telegramUserId,
                telegramChatId: chatId,
                telegramUsername: from?.username as string | undefined,
                telegramFirstName: from?.first_name as string | undefined,
                telegramLastName: from?.last_name as string | undefined,
            });
        } catch (err) {
            const errorText = err instanceof Error ? err.message : "unknown_error";
            log.error("telegram.link_failed", { error: errorText });
            await convex.mutation(api.chatHistory.failAction, { actionId, errorText });
            await replyCtx("Something went wrong while linking. Please try again.");
            return new Response("ok");
        }

        const linkErrors: Record<string, string> = {
            invalid_code:         "That code is not valid. Generate a new one in Saldo — Settings — Connect Telegram.",
            code_already_used:    "That code has already been used. Generate a new one in Saldo — Settings.",
            code_expired:         "That code has expired (codes are valid for 10 minutes). Generate a new one in Saldo — Settings.",
            already_linked_to_you:   "Your Telegram account is already linked to this Saldo account.",
            already_linked_to_other: "This Telegram account is already linked to a different Saldo account. Disconnect it first.",
        };

        const replyText = linkResult.success
            ? `Linked${firstName ? `, ${firstName}` : ""}! Your Telegram account is now connected to Saldo.\n\nSend /help to see what I can do.`
            : (linkErrors[linkResult.error ?? ""] ?? "Something went wrong. Please try again.");

        await replyCtx(replyText);
        if (linkResult.success) {
            await convex.mutation(api.chatHistory.completeAction, { actionId, resultJson: { linked: true } });
        } else {
            await convex.mutation(api.chatHistory.failAction, { actionId, errorText: linkResult.error ?? "unknown_error" });
        }
        return new Response("ok");
    }

    // ── Parse command ─────────────────────────────────────
    const parsed = parseCommand(text);

    // ── /help ─────────────────────────────────────────────
    if (parsed.intent === "help") {
        const actionId = await convex.mutation(api.chatHistory.createAction, {
            userId, messageId: inboundMsgId, channel: "telegram",
            actionType: "help_command",
            inputJson: { command: text },
        });
        const helpText = connection
            ? HELP_TEXT
            : HELP_TEXT + "\n\nLink your account first:\n1. Open Saldo — Settings — Connect Telegram\n2. Send /link YOURCODE";
        await replyCtx(helpText);
        await convex.mutation(api.chatHistory.completeAction, { actionId, resultJson: { replied: true } });
        return new Response("ok");
    }

    // ── Pairing gate ──────────────────────────────────────
    if (!connection) {
        const actionId = await convex.mutation(api.chatHistory.createAction, {
            userId: undefined, messageId: inboundMsgId, channel: "telegram",
            actionType: "unlinked_user_message",
            inputJson: { text },
        });
        await replyCtx(
            "Link your Saldo account first.\n\n" +
            "1. Open Saldo — Settings — Connect Telegram\n" +
            "2. Send /link YOURCODE\n\n" +
            "Send /help to see what I can do."
        );
        await convex.mutation(api.chatHistory.completeAction, { actionId, resultJson: { prompted_to_link: true } });
        return new Response("ok");
    }

    // ── Epic 7, Story 2: Pending confirmation check ───────
    const pendingConfirmation = await convex.query(api.chatTools.getActivePendingConfirmation, {
        telegramChatId: chatId,
    });

    if (pendingConfirmation) {
        const lower = text.toLowerCase().trim();
        const isYes = ["yes", "y", "si", "sí", "confirm"].includes(lower);
        const isNo  = ["no", "n", "cancel"].includes(lower);

        if (isYes) {
            const actionId = await convex.mutation(api.chatHistory.createAction, {
                userId, messageId: inboundMsgId, channel: "telegram",
                actionType: "confirm_pending_action",
                inputJson: { telegramUserId, chatId },
            });
            try {
                const result = await convex.mutation(api.chatTools.executePendingConfirmation, {
                    telegramUserId,
                    telegramChatId: chatId,
                });
                await replyCtx(result.success ? result.message : result.message);
                if (result.success) {
                    await convex.mutation(api.chatHistory.completeAction, { actionId, resultJson: result });
                } else {
                    await convex.mutation(api.chatHistory.failAction, { actionId, errorText: result.code });
                }
            } catch (err) {
                log.error("telegram.confirm_action_failed", { error: String(err) });
                await convex.mutation(api.chatHistory.failAction, { actionId, errorText: String(err) });
                await replyCtx("Something went wrong. Please try again.");
            }
            return new Response("ok");
        }

        if (isNo) {
            const actionId = await convex.mutation(api.chatHistory.createAction, {
                userId, messageId: inboundMsgId, channel: "telegram",
                actionType: "cancel_pending_action",
                inputJson: { telegramUserId, chatId },
            });
            try {
                await convex.mutation(api.chatTools.cancelPendingConfirmation, { telegramUserId, telegramChatId: chatId });
                await replyCtx("Action cancelled.");
                await convex.mutation(api.chatHistory.completeAction, { actionId, resultJson: { cancelled: true } });
            } catch (err) {
                log.error("telegram.cancel_action_failed", { error: String(err) });
                await convex.mutation(api.chatHistory.failAction, { actionId, errorText: String(err) });
            }
            return new Response("ok");
        }
        // Not yes/no — fall through (pending stays active)
    }

    // ── Finance commands ──────────────────────────────────

    const actionTypeMap: Record<string, string> = {
        balance: "request_balance",
        recent: "list_recent_transactions",
        summary: "request_summary",
        add_expense: "add_expense_command",
        add_income: "add_income_command",
        invalid_command: "invalid_command",
        unknown_intent: "unknown_intent",
    };

    const actionType = actionTypeMap[parsed.intent] ?? "unknown_intent";
    const actionId = await convex.mutation(api.chatHistory.createAction, {
        userId, messageId: inboundMsgId, channel: "telegram",
        actionType,
        inputJson: { parsed },
    });

    try {
        let resultJson: unknown;

        // ── /balance ──────────────────────────────────────
        if (parsed.intent === "balance") {
            const result = await convex.query(api.chatTools.getBalance, { telegramUserId });
            if (!result.success) {
                await replyCtx(friendlyError(result.code, result.message));
                await convex.mutation(api.chatHistory.failAction, { actionId, errorText: result.code });
                return new Response("ok");
            }
            const { accounts, totalKnownBalance, hasPartialData } = result.data;
            const lines = accounts.map((a) =>
                a.balance !== null
                    ? `${a.name} (${a.bank}): ${formatCurrency(a.balance)}`
                    : `${a.name} (${a.bank}): no balance on file`
            );
            const caveat = hasPartialData ? "\n(some accounts have no stored balance)" : "";
            const greeting = firstName ? `${firstName}, here are your balances:\n\n` : "Your balances:\n\n";
            await replyCtx(greeting + lines.join("\n") + "\n\nTotal: " + formatCurrency(totalKnownBalance) + caveat + formatHint(HINTS.afterBalance));
            resultJson = { totalKnownBalance, accountCount: accounts.length };
        }

        // ── /recent ───────────────────────────────────────
        else if (parsed.intent === "recent") {
            const result = await convex.query(api.chatTools.listTransactionsForChat, { telegramUserId, limit: 5 });
            if (!result.success) {
                await replyCtx(friendlyError(result.code, result.message));
                await convex.mutation(api.chatHistory.failAction, { actionId, errorText: result.code });
                return new Response("ok");
            }
            await replyCtx(formatRecentList(result.data) + formatHint(HINTS.afterRecent));
            resultJson = { count: result.data.length };
        }

        // ── /summary ──────────────────────────────────────
        else if (parsed.intent === "summary") {
            const result = await convex.query(api.chatTools.getSummaryForChat, { telegramUserId });
            if (!result.success) {
                await replyCtx(friendlyError(result.code, result.message));
                await convex.mutation(api.chatHistory.failAction, { actionId, errorText: result.code });
                return new Response("ok");
            }
            await replyCtx(formatSummary(result.data) + formatHint(HINTS.afterSummary));
            resultJson = result.data;
        }

        // ── /expense ──────────────────────────────────────
        else if (parsed.intent === "add_expense") {
            const result = await convex.mutation(api.chatTools.createTransactionFromChat, {
                telegramUserId,
                telegramChatId: chatId,
                amount: -Math.abs(parsed.amount),
                date: Date.now(),
                description: parsed.description,
                transactionType: "expense",
                sourceTelegramMessageId: telegramMessageId,
            });
            if (!result.success) {
                await replyCtx(friendlyError(result.code, result.message));
                await convex.mutation(api.chatHistory.failAction, { actionId, errorText: result.code });
                return new Response("ok");
            }

            const { weeklyInsight } = result.data;
            const confirmation = formatWriteConfirmation("expense", parsed.amount, parsed.description);
            const insight = buildInsight(weeklyInsight);
            await replyCtx(confirmation + insight + formatHint(HINTS.afterExpense));
            resultJson = result.data;
        }

        // ── /income ───────────────────────────────────────
        else if (parsed.intent === "add_income") {
            const result = await convex.mutation(api.chatTools.createTransactionFromChat, {
                telegramUserId,
                telegramChatId: chatId,
                amount: Math.abs(parsed.amount),
                date: Date.now(),
                description: parsed.description,
                transactionType: "income",
                sourceTelegramMessageId: telegramMessageId,
            });
            if (!result.success) {
                await replyCtx(friendlyError(result.code, result.message));
                await convex.mutation(api.chatHistory.failAction, { actionId, errorText: result.code });
                return new Response("ok");
            }
            const confirmation = formatWriteConfirmation("income", parsed.amount, parsed.description);
            await replyCtx(confirmation + formatHint(HINTS.afterIncome));
            resultJson = result.data;
        }

        // ── Invalid argument format ────────────────────────
        else if (parsed.intent === "invalid_command") {
            await replyCtx(`That didn't quite work. Try:\n${parsed.usage}`);
            resultJson = { error: parsed.error };
        }

        // ── Natural language → Gemini ─────────────────────
        else if (parsed.intent === "unknown_intent" && !text.startsWith("/")) {
            try {
                const geminiReply = await callGemini(text, telegramUserId, chatId, convex);
                await replyCtx(geminiReply);
                resultJson = { gemini: true, reply: geminiReply };
            } catch (geminiErr) {
                const errMsg = geminiErr instanceof Error ? geminiErr.message : "unknown";
                const isTimeout = errMsg === "GEMINI_TIMEOUT";
                log.error("telegram.gemini_failed", { error: errMsg, isTimeout });
                await replyCtx(
                    isTimeout
                        ? "Taking too long to respond. Try a slash command:\n\n" + HELP_TEXT
                        : "Could not process that right now. Try a slash command:\n\n" + HELP_TEXT
                );
                resultJson = { gemini: false, error: errMsg };
            }
        }

        // ── Unknown slash command ─────────────────────────
        else {
            const who = firstName ? `${firstName}, ` : "";
            await replyCtx(`${who}I don't recognize that command.\n\n` + HELP_TEXT);
            resultJson = { raw: text };
        }

        await convex.mutation(api.chatHistory.completeAction, { actionId, resultJson });
        log.info("telegram.action_completed", { actionType, chatId });
    } catch (err) {
        const errorText = err instanceof Error ? err.message : "unknown_error";
        log.error("telegram.handler_error", { error: errorText, actionType, chatId });
        await convex.mutation(api.chatHistory.failAction, { actionId, errorText });
        await replyCtx("Something went wrong. Please try again.");
    }

    return new Response("ok");
}

// ── Helpers ───────────────────────────────────────────────

/**
 * Story 9: Map error codes to helpful, actionable messages.
 */
function friendlyError(code: string, fallback: string): string {
    const map: Record<string, string> = {
        USER_NOT_LINKED:       "Your account isn't linked. Send /link YOURCODE.",
        NO_ACCOUNTS:           "No accounts found. Add one in the Saldo app first.",
        ACCOUNT_REQUIRED:      fallback + "\n\nTip: say which account, e.g. 'to Checking'.",
        DUPLICATE_TRANSACTION: "That looks like a duplicate — already logged in the last 60 seconds.\nSend /recent to check.",
        INVALID_AMOUNT:        "The amount didn't look right. Use a number, e.g. /expense 12.50 lunch.",
        INVALID_DESCRIPTION:   "Description is too long (max 255 characters).",
        NO_LAST_TRANSACTION:   "No recent transaction to update. Log one first, then correct it.",
        TRANSACTION_NOT_FOUND: "That transaction wasn't found.",
        CONFIRMATION_EXPIRED:  "The confirmation window expired. Try again.",
    };
    return map[code] ?? fallback;
}

/**
 * Story 7: Format a proactive weekly spending insight.
 * Only shown when there are 3+ transactions in the same category this week.
 */
function buildInsight(
    weeklyInsight: { categoryName: string; weeklyTotal: number; count: number } | null | undefined
): string {
    if (!weeklyInsight) return "";
    const { categoryName, weeklyTotal, count } = weeklyInsight;
    return `\n\n${count} ${categoryName} transactions this week — ${formatCurrency(weeklyTotal)} total.`;
}
