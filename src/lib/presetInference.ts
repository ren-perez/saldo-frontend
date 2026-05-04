// src/lib/presetInference.ts
// Heuristic (layer 1) + Gemini (layer 2) CSV schema inference.

import { parseDate } from "@/utils/etl";

export interface InferenceResult {
    config: {
        delimiter: string;
        hasHeader: boolean;
        skipRows: number;
        amountMultiplier: number;
        dateColumn?: string;
        dateFormat?: string;
        descriptionColumn?: string;
        accountColumn?: string;
        categoryColumn?: string;
        categoryGroupColumn?: string;
        transactionTypeColumn?: string;
        transferPairIdColumn?: string;
        amountColumns: string[];
        amountProcessing: Record<string, unknown>;
    };
    confidence: "high" | "medium" | "low";
    usedAI: boolean;
    tokenCount?: number;
    unmapped: string[];
}

// ── Heuristic patterns ────────────────────────────────────────────────────────

const PATTERNS: Record<string, string[]> = {
    dateColumn: ["date", "trans date", "posted date", "transaction date", "posting date", "effective date", "value date"],
    descriptionColumn: ["description", "memo", "payee", "narrative", "transaction description", "details", "merchant name", "merchant"],
    accountColumn: ["account", "account name", "account number", "account id", "account #"],
    categoryColumn: ["category", "category name"],
    categoryGroupColumn: ["group", "category group", "category type", "group name"],
    transactionTypeColumn: ["type", "transaction type", "debit/credit", "dr/cr", "credit/debit"],
    transferPairIdColumn: ["transfer pair id", "pair id", "transfer id", "transfer_pair_id", "link id"],
    amountColumn: ["amount", "transaction amount", "net amount", "debit amount", "credit amount", "value"],
    debitColumn: ["debit", "withdrawals", "withdrawal amount", "debit amount", "out"],
    creditColumn: ["credit", "deposits", "deposit amount", "credit amount", "in"],
};

const DATE_FORMATS = [
    { pattern: /^\d{1,2}\/\d{1,2}\/\d{2}$/, format: "%m/%d/%y" },
    { pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/, format: "%m/%d/%Y" },
    { pattern: /^\d{4}-\d{2}-\d{2}$/, format: "%Y-%m-%d" },
    { pattern: /^\d{2}\/\d{2}\/\d{4}$/, format: "%d/%m/%Y" },
    { pattern: /^\d{2}-\d{2}-\d{4}$/, format: "%m-%d-%Y" },
    { pattern: /^\d{4}\/\d{2}\/\d{2}$/, format: "%Y/%m/%d" },
];

function matchColumn(header: string, patterns: string[]): boolean {
    const h = header.toLowerCase().trim();
    return patterns.some((p) => h === p || h.includes(p));
}

function inferDateFormat(sampleValues: string[]): string {
    for (const val of sampleValues) {
        if (!val || val.trim() === "") continue;
        for (const { pattern, format } of DATE_FORMATS) {
            if (pattern.test(val.trim()) && parseDate(val.trim(), format)) {
                return format;
            }
        }
    }
    return "%Y-%m-%d";
}

function detectDelimiter(rawLine: string): string {
    const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
    for (const char of rawLine) {
        if (char in counts) counts[char]++;
    }
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return winner[1] > 0 ? winner[0] : ",";
}

// ── Main inference entry point ────────────────────────────────────────────────

export async function inferPresetFromCSV(
    headers: string[],
    sampleRows: Record<string, string>[],
    rawFirstLine?: string
): Promise<InferenceResult> {
    const unmapped: string[] = [];
    const delimiter = rawFirstLine ? detectDelimiter(rawFirstLine) : ",";

    // Heuristic pass — find best match per slot
    function findColumn(key: keyof typeof PATTERNS): string | undefined {
        const matches = headers.filter((h) => matchColumn(h, PATTERNS[key]));
        return matches[0]; // first match wins
    }

    const dateColumn = findColumn("dateColumn");
    const descriptionColumn = findColumn("descriptionColumn");
    const accountColumn = findColumn("accountColumn");
    const categoryColumn = findColumn("categoryColumn");
    const categoryGroupColumn = findColumn("categoryGroupColumn");
    const transactionTypeColumn = findColumn("transactionTypeColumn");
    const transferPairIdColumn = findColumn("transferPairIdColumn");

    // Amount: prefer a single "Amount" column; fall back to debit/credit pair
    let amountProcessing: Record<string, unknown> = {};
    let amountColumns: string[] = [];
    const amountCol = findColumn("amountColumn");
    const debitCol = findColumn("debitColumn");
    const creditCol = findColumn("creditColumn");

    if (amountCol && amountCol !== debitCol && amountCol !== creditCol) {
        amountColumns = [amountCol];
        amountProcessing = { amount_column: amountCol, amount_multiplier: 1 };
    } else if (debitCol && creditCol) {
        amountColumns = [debitCol, creditCol];
        amountProcessing = {
            debit_column: debitCol,
            credit_column: creditCol,
            debit_multiplier: -1,
            credit_multiplier: 1,
        };
    } else if (amountCol) {
        amountColumns = [amountCol];
        amountProcessing = { amount_column: amountCol, amount_multiplier: 1 };
    }

    // Date format from sample values
    const dateValues = dateColumn
        ? sampleRows.map((r) => r[dateColumn] ?? "").filter(Boolean)
        : [];
    const dateFormat = inferDateFormat(dateValues);

    // Assess what's missing from required fields
    const requiredMissing: string[] = [];
    if (!dateColumn) requiredMissing.push("date");
    if (!descriptionColumn) requiredMissing.push("description");
    if (amountColumns.length === 0) requiredMissing.push("amount");

    // Track truly unmapped headers (not assigned to any slot)
    const assignedHeaders = new Set([
        dateColumn, descriptionColumn, accountColumn, categoryColumn,
        categoryGroupColumn, transactionTypeColumn, transferPairIdColumn,
        ...amountColumns,
    ].filter(Boolean) as string[]);
    headers.forEach((h) => { if (!assignedHeaders.has(h)) unmapped.push(h); });

    const heuristicConfig = {
        delimiter,
        hasHeader: true,
        skipRows: 0,
        amountMultiplier: 1,
        dateColumn,
        dateFormat,
        descriptionColumn,
        accountColumn,
        categoryColumn,
        categoryGroupColumn,
        transactionTypeColumn,
        transferPairIdColumn,
        amountColumns,
        amountProcessing,
    };

    // If all required fields resolved heuristically → done (high/medium confidence)
    if (requiredMissing.length === 0) {
        const confidence = unmapped.length === 0 ? "high" : "medium";
        return { config: heuristicConfig, confidence, usedAI: false, unmapped };
    }

    // ── Layer 2: Gemini fallback ──────────────────────────────────────────────
    try {
        const geminiResult = await callGeminiForPresetInference(headers, sampleRows);
        if (geminiResult) {
            // Merge: heuristic results take priority, Gemini fills missing required fields
            const merged = { ...geminiResult.config, ...Object.fromEntries(
                Object.entries(heuristicConfig).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
            ) };
            return {
                config: merged as InferenceResult["config"],
                confidence: "medium",
                usedAI: true,
                tokenCount: geminiResult.tokenCount,
                unmapped: [],
            };
        }
    } catch {
        // Gemini failed — fall through to low-confidence heuristic result
    }

    return { config: heuristicConfig, confidence: "low", usedAI: false, unmapped };
}

// ── Gemini API route call ─────────────────────────────────────────────────────

interface GeminiInferenceResult {
    config: InferenceResult["config"];
    tokenCount?: number;
}

async function callGeminiForPresetInference(
    headers: string[],
    sampleRows: Record<string, string>[]
): Promise<GeminiInferenceResult | null> {
    const response = await fetch("/api/infer-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, sampleRows: sampleRows.slice(0, 3) }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data as GeminiInferenceResult;
}
