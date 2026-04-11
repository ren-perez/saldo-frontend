// convex/rulesEngine.ts
// Pure utility — no DB access, safe to call from any mutation/query.

import { Id } from "./_generated/dataModel";

export type CategoryRule = {
    _id: Id<"category_rules">;
    pattern: string;
    categoryId: Id<"categories">;
    priority: number;
    isActive: boolean;
};

// Common noise prefixes seen in bank feeds (order matters — longer first)
const NOISE_PREFIXES = [
    /^RECURRING\s+PAYMENT\s*/i,
    /^POS\s+PURCHASE\s*/i,
    /^ACH\s+DEBIT\s*/i,
    /^DEBIT\s+PURCHASE\s*/i,
    /^CHECKCARD\s*/i,
    /^VNDR\s*\*\s*/i,
    /^ONLINE\s+PAYMENT\s*/i,
    /^PURCHASE\s+AT\s*/i,
    /^PYMT\s+/i,
    /^PMT\s+/i,
];

// Inline date patterns: "04/11", "APR 11", "APR11"
const INLINE_DATE_RE = [
    /\b\d{2}\/\d{2}(\/\d{2,4})?\b/g,
    /\b(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{1,2}\b/gi,
];

// Trailing transaction IDs / reference numbers: "123456", "#ABC123", "TXN-0042"
const TRAILING_ID_RE = [
    /\s+#?\w*\d{4,}\s*$/g,
    /\s+TXN[-\s]?\w+\s*$/gi,
];

/**
 * Smart normalizer for financial transaction descriptions.
 * Strips noise prefixes, inline dates, and trailing IDs before matching.
 */
export function normalizeForMatching(description: string): string {
    let d = description;

    // Strip noise prefixes (apply all in sequence)
    for (const re of NOISE_PREFIXES) {
        d = d.replace(re, "");
    }

    // Remove inline dates
    for (const re of INLINE_DATE_RE) {
        d = d.replace(re, "");
    }

    // Remove trailing IDs
    for (const re of TRAILING_ID_RE) {
        d = d.replace(re, "");
    }

    return d.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Returns the highest-priority matching rule for a description, or null.
 */
export function matchDescriptionWithRule(
    description: string,
    rules: CategoryRule[]
): { categoryId: Id<"categories">; ruleId: Id<"category_rules"> } | null {
    const normalized = normalizeForMatching(description);

    const sorted = rules
        .filter((r) => r.isActive)
        .sort((a, b) => b.priority - a.priority);

    for (const rule of sorted) {
        if (normalized.includes(rule.pattern.toLowerCase())) {
            return { categoryId: rule.categoryId, ruleId: rule._id };
        }
    }

    return null;
}

/**
 * Convenience wrapper — returns only the categoryId, or null.
 * Kept for backwards compatibility with callers that don't need the ruleId.
 */
export function matchDescription(
    description: string,
    rules: CategoryRule[]
): Id<"categories"> | null {
    return matchDescriptionWithRule(description, rules)?.categoryId ?? null;
}
