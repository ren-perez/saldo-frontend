// src/app/api/infer-preset/route.ts
// Server-side Gemini call for CSV column mapping inference.
// Keeps GEMINI_API_KEY out of the browser bundle.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.0-flash";

export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const { headers, sampleRows } = await req.json() as {
        headers: string[];
        sampleRows: Record<string, string>[];
    };

    if (!headers?.length) {
        return NextResponse.json({ error: "No headers provided" }, { status: 400 });
    }

    const prompt = `You are a CSV schema analyst. Given the following CSV headers and sample rows, identify which column maps to each field.

Headers: ${JSON.stringify(headers)}
Sample rows (first 3): ${JSON.stringify(sampleRows)}

Return a JSON object with ONLY these keys (use null if a column cannot be identified):
{
  "dateColumn": "<exact header name for transaction date>",
  "descriptionColumn": "<exact header name for transaction description/payee>",
  "amountColumn": "<exact header name for amount, if single column>",
  "debitColumn": "<exact header name for debit/withdrawal amount, if separate>",
  "creditColumn": "<exact header name for credit/deposit amount, if separate>",
  "accountColumn": "<exact header name for account name/number, or null>",
  "categoryColumn": "<exact header name for category, or null>",
  "categoryGroupColumn": "<exact header name for category group, or null>",
  "transactionTypeColumn": "<exact header name for transaction type, or null>",
  "transferPairIdColumn": "<exact header name for transfer pair ID, or null>",
  "dateFormat": "<one of: %m/%d/%y, %m/%d/%Y, %Y-%m-%d, %d/%m/%Y, %m-%d-%Y, %Y/%m/%d>",
  "delimiter": "<one of: comma, semicolon, tab, pipe>"
}

Rules:
- Use exact header names from the provided list.
- If amount is in a single column, set amountColumn and leave debitColumn/creditColumn null.
- If amount is split into debit/credit columns, set both and leave amountColumn null.
- Return ONLY valid JSON, no markdown, no explanation.`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const tokenCount = result.response.usageMetadata?.totalTokenCount;

        // Strip markdown code fences if present
        const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        const parsed = JSON.parse(json);

        // Build amountProcessing from Gemini output
        let amountProcessing: Record<string, unknown> = {};
        let amountColumns: string[] = [];

        if (parsed.amountColumn) {
            amountColumns = [parsed.amountColumn];
            amountProcessing = { amount_column: parsed.amountColumn, amount_multiplier: 1 };
        } else if (parsed.debitColumn && parsed.creditColumn) {
            amountColumns = [parsed.debitColumn, parsed.creditColumn];
            amountProcessing = {
                debit_column: parsed.debitColumn,
                credit_column: parsed.creditColumn,
                debit_multiplier: -1,
                credit_multiplier: 1,
            };
        }

        const delimiterMap: Record<string, string> = {
            comma: ",", semicolon: ";", tab: "\t", pipe: "|",
        };

        const config = {
            delimiter: delimiterMap[parsed.delimiter] ?? ",",
            hasHeader: true,
            skipRows: 0,
            amountMultiplier: 1,
            dateColumn: parsed.dateColumn ?? undefined,
            dateFormat: parsed.dateFormat ?? "%Y-%m-%d",
            descriptionColumn: parsed.descriptionColumn ?? undefined,
            accountColumn: parsed.accountColumn ?? undefined,
            categoryColumn: parsed.categoryColumn ?? undefined,
            categoryGroupColumn: parsed.categoryGroupColumn ?? undefined,
            transactionTypeColumn: parsed.transactionTypeColumn ?? undefined,
            transferPairIdColumn: parsed.transferPairIdColumn ?? undefined,
            amountColumns,
            amountProcessing,
        };

        return NextResponse.json({ config, tokenCount });
    } catch (err) {
        console.error("[infer-preset] Gemini error:", err);
        return NextResponse.json({ error: "AI inference failed" }, { status: 500 });
    }
}
