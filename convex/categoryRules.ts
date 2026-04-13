// convex/categoryRules.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { CategoryRule, normalizeForMatching } from "./rulesEngine";

// ─── Queries ──────────────────────────────────────────────────────────────────

// List all rules for a user, sorted by priority descending
export const listRules = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const rules = await ctx.db
            .query("category_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        return rules.sort((a, b) => b.priority - a.priority);
    },
});

/**
 * Returns a map of { [ruleId]: count } for every rule that has at least one
 * transaction linked via appliedRuleId. Used to show "Matched N transactions"
 * on each rule row.
 */
export const getMatchCountForRules = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        // Fetch only transactions for this user that have an appliedRuleId set.
        // We use by_user and filter in-memory — appliedRuleId is sparse so the
        // by_applied_rule index isn't ideal here (null entries complicate it).
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const counts: Record<string, number> = {};
        for (const t of transactions) {
            if (t.appliedRuleId) {
                const key = t.appliedRuleId as string;
                counts[key] = (counts[key] ?? 0) + 1;
            }
        }
        return counts;
    },
});

/**
 * Live preview: how many of the user's transactions would a given pattern match?
 * Returns count + up to 5 sample descriptions for immediate feedback in the UI.
 * The pattern is matched the same way the rules engine does (smart normalizer).
 */
export const previewRulePattern = query({
    args: {
        userId: v.id("users"),
        pattern: v.string(),
    },
    handler: async (ctx, { userId, pattern }) => {
        const trimmed = pattern.trim();
        if (!trimmed) return { count: 0, samples: [] as string[] };

        const normalizedPattern = trimmed.toLowerCase();

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        const matches = transactions.filter((t) =>
            normalizeForMatching(t.description).includes(normalizedPattern)
        );

        return {
            count: matches.length,
            samples: matches.slice(0, 5).map((t) => t.description),
        };
    },
});

/**
 * Rich preview for the Rule Preview/Edit dialog.
 *
 * Groups matching transactions into four buckets so the user can see exactly
 * what "Apply" will do before committing:
 *
 *  - alreadyLinked  : already categorized by this specific rule (edit mode)
 *  - wouldCategorize: currently uncategorized — would gain a category
 *  - wouldUpdate    : auto-categorized by a *different* rule — would be updated
 *  - skippedCount   : human overrides (has updatedAt + no isAutoCategorized) — never touched
 *
 * Capped at 25 rows per bucket to keep query weight reasonable.
 */
export const getTransactionsForRulePreview = query({
    args: {
        userId: v.id("users"),
        pattern: v.string(),
        ruleId: v.optional(v.id("category_rules")),
    },
    handler: async (ctx, { userId, pattern, ruleId }) => {
        const trimmed = pattern.trim();
        if (!trimmed) {
            return { alreadyLinked: [], wouldCategorize: [], wouldUpdate: [], skippedCount: 0, totalWouldAffect: 0 };
        }

        const normalizedPattern = trimmed.toLowerCase();

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        // Collect all unique categoryIds we'll need to look up
        const catIdsNeeded = new Set<string>();

        const alreadyLinked: typeof transactions = [];
        const wouldCategorize: typeof transactions = [];
        const wouldUpdate: typeof transactions = [];
        let skippedCount = 0;

        for (const t of transactions) {
            if (!normalizeForMatching(t.description).includes(normalizedPattern)) continue;

            // Bucket: already linked to THIS rule (only relevant in edit mode)
            if (ruleId && t.appliedRuleId === ruleId) {
                alreadyLinked.push(t);
                if (t.categoryId) catIdsNeeded.add(t.categoryId as string);
                continue;
            }

            // Bucket: human override — skip silently
            if (!t.isAutoCategorized && t.updatedAt !== undefined) {
                skippedCount++;
                continue;
            }

            // Bucket: would gain a category (uncategorized)
            if (!t.categoryId) {
                wouldCategorize.push(t);
                continue;
            }

            // Bucket: would be updated (auto-categorized by a different rule)
            if (t.isAutoCategorized === true) {
                wouldUpdate.push(t);
                if (t.categoryId) catIdsNeeded.add(t.categoryId as string);
                continue;
            }

            // Old data: has categoryId, no isAutoCategorized, no updatedAt — treat as re-categorizable
            wouldCategorize.push(t);
            if (t.categoryId) catIdsNeeded.add(t.categoryId as string);
        }

        // Resolve category names
        const categoryMap: Record<string, string> = {};
        for (const catId of catIdsNeeded) {
            const cat = await ctx.db.get(catId as Id<"categories">);
            if (cat) categoryMap[catId] = cat.name;
        }

        const LIMIT = 25;
        const serialize = (t: typeof transactions[0]) => ({
            _id: t._id as string,
            description: t.description,
            date: t.date,
            amount: t.amount,
            currentCategoryName: t.categoryId ? (categoryMap[t.categoryId as string] ?? null) : null,
            isAutoCategorized: t.isAutoCategorized ?? false,
        });

        return {
            alreadyLinked: alreadyLinked.slice(0, LIMIT).map(serialize),
            wouldCategorize: wouldCategorize.slice(0, LIMIT).map(serialize),
            wouldUpdate: wouldUpdate.slice(0, LIMIT).map(serialize),
            skippedCount,
            totalWouldAffect: wouldCategorize.length + wouldUpdate.length,
            // Overflow indicators
            alreadyLinkedTotal: alreadyLinked.length,
            wouldCategorizeTotal: wouldCategorize.length,
            wouldUpdateTotal: wouldUpdate.length,
        };
    },
});

/**
 * Analyse the user's manually-categorized transactions and surface patterns
 * that appear 3+ times but don't yet have a rule.
 */
export const getRuleSuggestions = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        // 1. Fetch last ~500 manually-categorized transactions
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(500);

        const manual = transactions.filter(
            (t) => t.categoryId && !t.isAutoCategorized
        );

        // 2. Group by normalizedDescription + categoryId
        const groups = new Map<string, { description: string; categoryId: string; count: number }>();
        for (const t of manual) {
            const normalized = normalizeForMatching(t.description);
            const key = `${normalized}::${t.categoryId}`;
            if (!groups.has(key)) {
                groups.set(key, { description: t.description, categoryId: t.categoryId as string, count: 0 });
            }
            groups.get(key)!.count++;
        }

        // 3. Keep only combos that appear 3+ times
        const candidates = [...groups.values()].filter((g) => g.count >= 3);

        if (candidates.length === 0) return [];

        // 4. Fetch existing rules to filter out already-covered patterns
        const existingRules = await ctx.db
            .query("category_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect() as CategoryRule[];

        const covered = new Set(existingRules.map((r) => r.pattern.toLowerCase()));

        // 5. Return suggestions not already covered by a rule
        return candidates
            .filter((c) => {
                const norm = normalizeForMatching(c.description);
                return !existingRules.some((r) => norm.includes(r.pattern.toLowerCase()));
            })
            .map((c) => ({
                description: c.description,
                normalizedDescription: normalizeForMatching(c.description),
                categoryId: c.categoryId,
                count: c.count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20); // cap at 20 suggestions
    },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

// Create a rule — rejects duplicates (same userId + pattern)
export const createRule = mutation({
    args: {
        userId: v.id("users"),
        pattern: v.string(),
        categoryId: v.id("categories"),
        priority: v.number(),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const normalizedPattern = args.pattern.toLowerCase().trim();

        // Check for existing rule with same pattern for this user
        const existing = await ctx.db
            .query("category_rules")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const duplicate = existing.find(
            (r) => r.pattern.toLowerCase() === normalizedPattern
        );
        if (duplicate) {
            throw new Error(`A rule for "${args.pattern}" already exists.`);
        }

        const ruleId = await ctx.db.insert("category_rules", {
            userId: args.userId,
            pattern: normalizedPattern,
            categoryId: args.categoryId,
            priority: args.priority,
            isActive: args.isActive ?? true,
            createdAt: Date.now(),
        });

        return ruleId;
    },
});

// Update an existing rule (toggle active, change category, adjust priority)
export const updateRule = mutation({
    args: {
        ruleId: v.id("category_rules"),
        updates: v.object({
            pattern: v.optional(v.string()),
            categoryId: v.optional(v.id("categories")),
            priority: v.optional(v.number()),
            isActive: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, { ruleId, updates }) => {
        const rule = await ctx.db.get(ruleId);
        if (!rule) throw new Error("Rule not found");

        const patch: Record<string, unknown> = {};
        if (updates.pattern !== undefined) patch.pattern = updates.pattern.toLowerCase().trim();
        if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId;
        if (updates.priority !== undefined) patch.priority = updates.priority;
        if (updates.isActive !== undefined) patch.isActive = updates.isActive;

        await ctx.db.patch(ruleId, patch);
        return ruleId;
    },
});

/**
 * Delete a rule.
 * Transactions that were categorized by this rule keep their category (user
 * shouldn't suddenly lose data) but lose the appliedRuleId reference so the
 * "Auto" badge is removed and the rule audit count goes to zero.
 */
export const deleteRule = mutation({
    args: { ruleId: v.id("category_rules") },
    handler: async (ctx, { ruleId }) => {
        const rule = await ctx.db.get(ruleId);
        if (!rule) throw new Error("Rule not found");

        // Clear appliedRuleId from all linked transactions (keep category, drop badge)
        const linked = await ctx.db
            .query("transactions")
            .withIndex("by_applied_rule", (q) => q.eq("appliedRuleId", ruleId))
            .collect();

        for (const t of linked) {
            await ctx.db.patch(t._id, { appliedRuleId: undefined });
        }

        await ctx.db.delete(ruleId);
        return ruleId;
    },
});

/**
 * Apply a rule retroactively to all matching transactions.
 * Only touches uncategorized or previously auto-categorized transactions —
 * human decisions (isAutoCategorized: undefined/false + updatedAt set) are
 * never overwritten.
 *
 * Chunks in batches of 500 to stay within Convex mutation limits.
 */
export const applyRuleRetroactively = mutation({
    args: {
        ruleId: v.id("category_rules"),
        userId: v.id("users"),
    },
    handler: async (ctx, { ruleId, userId }) => {
        const rule = await ctx.db.get(ruleId);
        if (!rule) throw new Error("Rule not found");
        if (rule.userId !== userId) throw new Error("Unauthorized");

        // Look up the rule's category once to inherit transactionType
        const ruleCategory = await ctx.db.get(rule.categoryId);

        const allTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Safe targets: uncategorized OR previously auto-categorized
        // (isAutoCategorized === true means a rule set it, so we can update)
        const targets = allTransactions.filter((t) => {
            const normalized = normalizeForMatching(t.description);
            if (!normalized.includes(rule.pattern.toLowerCase())) return false;
            // Never overwrite a human decision
            if (t.isAutoCategorized === undefined && t.updatedAt !== undefined) return false;
            return !t.categoryId || t.isAutoCategorized === true;
        });

        // Chunk in groups of 500
        const CHUNK = 500;
        let patched = 0;
        for (let i = 0; i < targets.length; i += CHUNK) {
            const chunk = targets.slice(i, i + CHUNK);
            for (const t of chunk) {
                await ctx.db.patch(t._id, {
                    categoryId: rule.categoryId,
                    isAutoCategorized: true,
                    appliedRuleId: ruleId,
                    ...(ruleCategory?.transactionType ? { transactionType: ruleCategory.transactionType } : {}),
                });
            }
            patched += chunk.length;
        }

        return { patched };
    },
});

/**
 * Batch-update rule priorities in one call.
 * Called by the drag-and-drop handler after a reorder.
 */
export const updateRulePriorities = mutation({
    args: {
        updates: v.array(v.object({
            ruleId: v.id("category_rules"),
            priority: v.number(),
        })),
    },
    handler: async (ctx, { updates }) => {
        for (const { ruleId, priority } of updates) {
            const rule = await ctx.db.get(ruleId);
            if (rule) {
                await ctx.db.patch(ruleId, { priority });
            }
        }
        return { updated: updates.length };
    },
});
