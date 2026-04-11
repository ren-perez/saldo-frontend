import { describe, it, expect } from "vitest";
import { parseCommand } from "../parser";

// Story 15 — test matrix

describe("parseCommand", () => {

    // ── Valid commands ────────────────────────────────────

    it("parses /help", () => {
        expect(parseCommand("/help")).toEqual({ intent: "help" });
    });

    it("parses /start as help", () => {
        expect(parseCommand("/start")).toEqual({ intent: "help" });
    });

    it("parses /balance", () => {
        expect(parseCommand("/balance")).toEqual({ intent: "balance" });
    });

    it("parses /recent", () => {
        expect(parseCommand("/recent")).toEqual({ intent: "recent" });
    });

    it("parses /expense with integer amount", () => {
        expect(parseCommand("/expense 12 lunch")).toEqual({
            intent: "add_expense",
            amount: 12,
            description: "lunch",
        });
    });

    it("parses /expense with decimal amount", () => {
        expect(parseCommand("/expense 24.90 uber")).toEqual({
            intent: "add_expense",
            amount: 24.9,
            description: "uber",
        });
    });

    it("parses /expense with multi-word description", () => {
        expect(parseCommand("/expense 18.50 coffee and croissant")).toEqual({
            intent: "add_expense",
            amount: 18.5,
            description: "coffee and croissant",
        });
    });

    it("parses /income with integer amount", () => {
        expect(parseCommand("/income 500 paycheck")).toEqual({
            intent: "add_income",
            amount: 500,
            description: "paycheck",
        });
    });

    it("parses /income with multi-word description", () => {
        expect(parseCommand("/income 850 side gig april")).toEqual({
            intent: "add_income",
            amount: 850,
            description: "side gig april",
        });
    });

    // ── Invalid arguments ─────────────────────────────────

    it("rejects /expense with no args", () => {
        const result = parseCommand("/expense");
        expect(result.intent).toBe("invalid_command");
        if (result.intent === "invalid_command") {
            expect(result.error).toBe("missing_amount");
        }
    });

    it("rejects /expense with amount only (missing description)", () => {
        const result = parseCommand("/expense 15");
        expect(result.intent).toBe("invalid_command");
        if (result.intent === "invalid_command") {
            expect(result.error).toBe("missing_description");
        }
    });

    it("rejects /expense with non-numeric amount", () => {
        const result = parseCommand("/expense abc lunch");
        expect(result.intent).toBe("invalid_command");
        if (result.intent === "invalid_command") {
            expect(result.error).toBe("invalid_amount");
        }
    });

    it("rejects /expense with negative amount", () => {
        const result = parseCommand("/expense -10 coffee");
        expect(result.intent).toBe("invalid_command");
        if (result.intent === "invalid_command") {
            expect(result.error).toBe("invalid_amount");
        }
    });

    it("rejects /expense with zero amount", () => {
        const result = parseCommand("/expense 0 coffee");
        expect(result.intent).toBe("invalid_command");
        if (result.intent === "invalid_command") {
            expect(result.error).toBe("invalid_amount");
        }
    });

    it("rejects /income with no args", () => {
        const result = parseCommand("/income");
        expect(result.intent).toBe("invalid_command");
        if (result.intent === "invalid_command") {
            expect(result.error).toBe("missing_amount");
        }
    });

    it("rejects /income with missing description", () => {
        const result = parseCommand("/income 1000");
        expect(result.intent).toBe("invalid_command");
        if (result.intent === "invalid_command") {
            expect(result.error).toBe("missing_description");
        }
    });

    it("rejects /income with invalid amount", () => {
        const result = parseCommand("/income xyz salary");
        expect(result.intent).toBe("invalid_command");
        if (result.intent === "invalid_command") {
            expect(result.error).toBe("invalid_amount");
        }
    });

    // ── Unknown commands ──────────────────────────────────

    it("returns unknown_intent for unrecognized slash command", () => {
        const result = parseCommand("/delete everything");
        expect(result.intent).toBe("unknown_intent");
    });

    it("returns unknown_intent for plain text (no slash)", () => {
        const result = parseCommand("hello bot");
        expect(result.intent).toBe("unknown_intent");
    });

    it("returns unknown_intent for empty-ish input", () => {
        const result = parseCommand("  ");
        expect(result.intent).toBe("unknown_intent");
    });

    // ── Edge cases ────────────────────────────────────────

    it("is case-insensitive for the command part", () => {
        expect(parseCommand("/BALANCE")).toEqual({ intent: "balance" });
        expect(parseCommand("/Expense 10 coffee")).toEqual({
            intent: "add_expense",
            amount: 10,
            description: "coffee",
        });
    });

    it("trims surrounding whitespace", () => {
        expect(parseCommand("  /balance  ")).toEqual({ intent: "balance" });
    });

});
