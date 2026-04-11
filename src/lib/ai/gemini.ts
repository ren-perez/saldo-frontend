/**
 * Gemini adapter — isolates all Google AI SDK interaction.
 *
 * Responsibilities:
 *   - API client setup
 *   - System prompt
 *   - Tool definitions (Saldo tool contract)
 *   - Request + response parsing
 *   - One round-trip tool execution loop
 *   - Hard timeout on each Gemini call (Story 11)
 *
 * Gemini must NOT write to Convex directly.
 * All tool calls go through toolExecutor → chatTools.
 */

import {
    GoogleGenerativeAI,
    FunctionDeclaration,
    SchemaType,
    Part,
} from "@google/generative-ai";
import { ConvexHttpClient } from "convex/browser";
import { executeToolCall } from "./toolExecutor";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

// ─── Timeout (Epic 7, Story 11) ──────────────────────────────────────────────

const GEMINI_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), ms)
        ),
    ]);
}

// ─── System Instruction ───────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are Saldo, a personal finance assistant in a Telegram bot.

Rules:
- Never invent, guess, or assume financial data (balances, amounts, account names, categories).
- Always use the available tools to read or write finance data.
- If a required field is missing (e.g. amount or description), ask one short follow-up question — do not guess.
- Do not log any action without all required fields confirmed.
- Be concise — 1–3 lines maximum per reply.
- Respond in the same language the user writes in.
- Never confirm an action you have not executed via a tool call.
- Do not make up transaction IDs, account IDs, or category names.
- No emojis — plain text only.

Correction flow:
- If the user says "actually", "I meant", "make it X", or similar right after logging a transaction, call update_last_transaction with the corrected value.
- Only call update_last_transaction if there is clearly a recent transaction to fix.

Supported actions:
- Check account balance → get_balance
- Show recent transactions → list_recent_transactions
- Monthly summary → get_summary
- Log an expense → create_transaction (transactionType "expense")
- Log income → create_transaction (transactionType "income")
- Correct last transaction → update_last_transaction
- Delete a transaction → delete_transaction (shows confirmation prompt — nothing deleted immediately)

For anything outside this scope, politely say you cannot help with that yet.`;

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const SALDO_TOOL_DECLARATIONS: FunctionDeclaration[] = [
    {
        name: "get_balance",
        description:
            "Get the current balance of all the user's accounts. Use when the user asks about their balance, how much money they have, account totals, or net worth.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: "list_recent_transactions",
        description:
            "List the user's recent transactions. Use when the user asks to see recent spending, their transaction history, what they've bought, or wants to review expenses.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                limit: {
                    type: SchemaType.NUMBER,
                    description: "Number of transactions to fetch. Default 5, max 10.",
                },
            },
        },
    },
    {
        name: "get_summary",
        description:
            "Get the current month's financial summary: total income, total expenses, net, and top spending category. Use when the user asks for a summary, overview, how the month is going, or their spending breakdown.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
        },
    },
    {
        name: "create_transaction",
        description:
            "Create a new expense or income transaction. Use when the user says they spent money, bought something, paid for something, received money, got paid, or earned income.",
        parameters: {
            type: SchemaType.OBJECT,
            required: ["amount", "description", "transactionType"],
            properties: {
                amount: {
                    type: SchemaType.NUMBER,
                    description: "The transaction amount as a positive number. Do not apply a sign — transactionType handles direction.",
                },
                description: {
                    type: SchemaType.STRING,
                    description: "Short description (e.g. 'coffee', 'uber', 'monthly salary'). Use the user's own words.",
                },
                transactionType: {
                    type: SchemaType.STRING,
                    format: "enum",
                    description: "'expense' when money was spent, 'income' when money was received.",
                    enum: ["expense", "income"],
                },
            },
        },
    },
    {
        name: "update_last_transaction",
        description:
            "Correct the most recently logged transaction. Use ONLY when the user immediately corrects a just-logged transaction (e.g. 'actually $25', 'I meant groceries'). Do not use this to edit old transactions.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                newAmount: {
                    type: SchemaType.NUMBER,
                    description: "The corrected amount as a positive number. Omit if only fixing the description.",
                },
                newDescription: {
                    type: SchemaType.STRING,
                    description: "The corrected description. Omit if only fixing the amount.",
                },
            },
        },
    },
    {
        name: "delete_transaction",
        description:
            "Request deletion of a transaction. ONLY use when the user explicitly asks to delete or remove a specific transaction. This asks for confirmation — nothing is deleted immediately. Requires a transactionId from a prior list_recent_transactions call.",
        parameters: {
            type: SchemaType.OBJECT,
            required: ["transactionId"],
            properties: {
                transactionId: {
                    type: SchemaType.STRING,
                    description: "The ID of the transaction to delete. Must come from a real list_recent_transactions result — never invent an ID.",
                },
            },
        },
    },
];

// ─── Main Gemini entry point ──────────────────────────────────────────────────

/**
 * Send a natural-language user message to Gemini and return a reply string.
 *
 * Flow:
 *   1. Send message + tool definitions to Gemini (with timeout).
 *   2. If Gemini requests a tool call: validate args → execute via toolExecutor → send result back.
 *   3. Return Gemini's final text response (with timeout).
 *
 * Only one tool-call round-trip is performed (Phase 1 scope).
 * The caller is responsible for audit logging and fallback handling.
 *
 * Throws "GEMINI_TIMEOUT" if either round-trip exceeds GEMINI_TIMEOUT_MS.
 * Throws on API or network failure — callers must catch and apply fallback.
 */
export async function callGemini(
    userMessage: string,
    telegramUserId: string,
    telegramChatId: string,
    convex: ConvexHttpClient
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: SALDO_TOOL_DECLARATIONS }],
    });

    const chat = model.startChat();

    // Round 1: user message → Gemini
    const response1 = await withTimeout(chat.sendMessage(userMessage), GEMINI_TIMEOUT_MS);
    const candidate1 = response1.response;
    const functionCalls = candidate1.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
        const text = candidate1.text().trim();
        return text || "I'm not sure how to help with that. Try /help to see what I can do.";
    }

    // Execute tool calls
    const toolResultParts: Part[] = await Promise.all(
        functionCalls.map(async (fc) => {
            const result = await executeToolCall(
                fc.name,
                (fc.args ?? {}) as Record<string, unknown>,
                telegramUserId,
                telegramChatId,
                convex
            );
            return {
                functionResponse: {
                    name: fc.name,
                    response: { result },
                },
            };
        })
    );

    // Round 2: tool results → Gemini → final reply
    const response2 = await withTimeout(chat.sendMessage(toolResultParts), GEMINI_TIMEOUT_MS);
    const finalText = response2.response.text().trim();
    return finalText || "Done. Check the app for details.";
}
