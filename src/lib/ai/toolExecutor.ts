/**
 * Tool executor — bridges Gemini function call requests and Saldo's chatTools layer.
 *
 * Gemini output is NEVER trusted directly:
 *   - Unknown tool names are rejected (allowlist check).
 *   - All arguments are validated before being passed to chatTools.
 *   - chatTools enforces ownership and business rules — this is a second layer of safety.
 *
 * Risk classification (Epic 7, Story 1):
 *   LOW:    get_balance, list_recent_transactions, get_summary
 *   MEDIUM: create_transaction, update_last_transaction
 *   HIGH:   delete_transaction — routes to requestDeleteTransaction (confirmation required)
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// ─── Constants (Epic 7, Story 5) ─────────────────────────────────────────────

const MAX_AMOUNT = 1_000_000;
const MAX_DESCRIPTION_LENGTH = 255;

// ─── Allowlist ────────────────────────────────────────────────────────────────

const ALLOWED_TOOLS = new Set([
    "get_balance",
    "list_recent_transactions",
    "get_summary",
    "create_transaction",
    "update_last_transaction",
    "delete_transaction",
]);

type ToolResult = Record<string, unknown>;

// ─── Executor ────────────────────────────────────────────────────────────────

/**
 * Execute a single Gemini tool call request.
 * Never throws — errors are returned as { success: false, error: "..." }.
 */
export async function executeToolCall(
    toolName: string,
    args: Record<string, unknown>,
    telegramUserId: string,
    telegramChatId: string,
    convex: ConvexHttpClient
): Promise<ToolResult> {
    if (!ALLOWED_TOOLS.has(toolName)) {
        return { success: false, error: `Tool not available: ${toolName}` };
    }

    try {
        switch (toolName) {
            // ── LOW RISK ─────────────────────────────────────────────────────

            case "get_balance": {
                return (await convex.query(api.chatTools.getBalance, { telegramUserId })) as ToolResult;
            }

            case "list_recent_transactions": {
                const rawLimit = args.limit;
                const limit =
                    typeof rawLimit === "number" && rawLimit > 0
                        ? Math.min(Math.floor(rawLimit), 10)
                        : 5;
                return (await convex.query(api.chatTools.listTransactionsForChat, { telegramUserId, limit })) as ToolResult;
            }

            case "get_summary": {
                return (await convex.query(api.chatTools.getSummaryForChat, { telegramUserId })) as ToolResult;
            }

            // ── MEDIUM RISK ───────────────────────────────────────────────────

            case "create_transaction": {
                const { amount, description, transactionType } = args;

                if (typeof amount !== "number" || amount <= 0 || !isFinite(amount)) {
                    return { success: false, error: "INVALID_AMOUNT: must be a positive finite number." };
                }
                if (amount > MAX_AMOUNT) {
                    return { success: false, error: `INVALID_AMOUNT: exceeds maximum of ${MAX_AMOUNT}.` };
                }
                if (typeof description !== "string" || description.trim().length === 0) {
                    return { success: false, error: "INVALID_DESCRIPTION: must be a non-empty string." };
                }
                if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
                    return { success: false, error: `INVALID_DESCRIPTION: too long (max ${MAX_DESCRIPTION_LENGTH} chars).` };
                }
                if (transactionType !== "expense" && transactionType !== "income") {
                    return { success: false, error: "INVALID_TYPE: must be 'expense' or 'income'." };
                }

                const signedAmount =
                    transactionType === "expense" ? -Math.abs(amount) : Math.abs(amount);

                return (await convex.mutation(api.chatTools.createTransactionFromChat, {
                    telegramUserId,
                    telegramChatId,
                    amount: signedAmount,
                    date: Date.now(),
                    description: description.trim(),
                    transactionType,
                })) as ToolResult;
            }

            case "update_last_transaction": {
                const { newAmount, newDescription } = args;

                if (newAmount === undefined && newDescription === undefined) {
                    return { success: false, error: "INVALID_ARGS: provide newAmount or newDescription." };
                }
                if (newAmount !== undefined) {
                    if (typeof newAmount !== "number" || newAmount <= 0 || !isFinite(newAmount)) {
                        return { success: false, error: "INVALID_AMOUNT: newAmount must be a positive finite number." };
                    }
                    if (newAmount > MAX_AMOUNT) {
                        return { success: false, error: `INVALID_AMOUNT: exceeds maximum of ${MAX_AMOUNT}.` };
                    }
                }
                if (newDescription !== undefined) {
                    if (typeof newDescription !== "string" || newDescription.trim().length === 0) {
                        return { success: false, error: "INVALID_DESCRIPTION: newDescription must be non-empty." };
                    }
                }

                return (await convex.mutation(api.chatTools.updateLastTransaction, {
                    telegramUserId,
                    telegramChatId,
                    newAmount: typeof newAmount === "number" ? newAmount : undefined,
                    newDescription: typeof newDescription === "string" ? newDescription : undefined,
                })) as ToolResult;
            }

            // ── HIGH RISK — confirmation required ─────────────────────────────

            case "delete_transaction": {
                const { transactionId } = args;

                if (typeof transactionId !== "string" || transactionId.trim().length === 0) {
                    return { success: false, error: "INVALID_ID: transactionId must be a non-empty string." };
                }

                return (await convex.mutation(api.chatTools.requestDeleteTransaction, {
                    telegramUserId,
                    telegramChatId,
                    transactionId: transactionId as Id<"transactions">,
                })) as ToolResult;
            }

            default:
                return { success: false, error: `Unhandled tool: ${toolName}` };
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[GEMINI_TOOL] ${toolName} failed:`, err);
        return { success: false, error: `INTERNAL_ERROR: ${message}` };
    }
}
