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

/**
 * Given a transaction description and the user's active rules, returns the
 * first matching categoryId (sorted by priority descending), or null if no
 * rule matches.
 *
 * Matching is case-insensitive substring search — no regex, no magic.
 */
export function matchDescription(
    description: string,
    rules: CategoryRule[]
): Id<"categories"> | null {
    const normalized = description.toLowerCase();

    const sorted = rules
        .filter((r) => r.isActive)
        .sort((a, b) => b.priority - a.priority);

    for (const rule of sorted) {
        if (normalized.includes(rule.pattern.toLowerCase())) {
            return rule.categoryId;
        }
    }

    return null;
}
