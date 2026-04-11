// src/app/api/telegram/parser.ts
// Pure function — no side effects, no I/O. Safe to unit test directly.

export type ParsedCommand =
    | { intent: "help" }
    | { intent: "balance" }
    | { intent: "recent" }
    | { intent: "summary" }
    | { intent: "add_expense"; amount: number; description: string }
    | { intent: "add_income"; amount: number; description: string }
    | { intent: "invalid_command"; command: string; error: string; usage: string }
    | { intent: "unknown_intent"; raw: string };

const USAGE = {
    expense: "/expense <amount> <description>\nExample: /expense 24.90 uber",
    income:  "/income <amount> <description>\nExample: /income 850 side gig",
};

function parseAmount(raw: string): number | null {
    // Accept formats: 24.90  $24.90  24,90
    const cleaned = raw.replace(/[$,]/g, "");
    const n = parseFloat(cleaned);
    if (isNaN(n) || n <= 0) return null;
    return n;
}

export function parseCommand(text: string): ParsedCommand {
    const trimmed = text.trim();

    if (!trimmed.startsWith("/")) {
        return { intent: "unknown_intent", raw: trimmed };
    }

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();

    switch (command) {
        case "/help":
        case "/start":
            return { intent: "help" };

        case "/balance":
            return { intent: "balance" };

        case "/recent":
            return { intent: "recent" };

        case "/summary":
            return { intent: "summary" };

        case "/expense": {
            if (parts.length < 2) {
                return { intent: "invalid_command", command, error: "missing_amount", usage: USAGE.expense };
            }
            const amount = parseAmount(parts[1]);
            if (amount === null) {
                return { intent: "invalid_command", command, error: "invalid_amount", usage: USAGE.expense };
            }
            if (parts.length < 3) {
                return { intent: "invalid_command", command, error: "missing_description", usage: USAGE.expense };
            }
            return { intent: "add_expense", amount, description: parts.slice(2).join(" ") };
        }

        case "/income": {
            if (parts.length < 2) {
                return { intent: "invalid_command", command, error: "missing_amount", usage: USAGE.income };
            }
            const amount = parseAmount(parts[1]);
            if (amount === null) {
                return { intent: "invalid_command", command, error: "invalid_amount", usage: USAGE.income };
            }
            if (parts.length < 3) {
                return { intent: "invalid_command", command, error: "missing_description", usage: USAGE.income };
            }
            return { intent: "add_income", amount, description: parts.slice(2).join(" ") };
        }

        default:
            return { intent: "unknown_intent", raw: trimmed };
    }
}
