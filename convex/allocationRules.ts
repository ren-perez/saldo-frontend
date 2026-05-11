// convex/allocationRules.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listRules = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const rules = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        return rules.sort((a, b) => a.priority - b.priority);
    },
});

export const createRule = mutation({
    args: {
        userId: v.id("users"),
        accountId: v.id("accounts"),
        label: v.optional(v.string()),
        category: v.string(),
        ruleType: v.string(),
        value: v.number(),
        priority: v.number(),
        active: v.boolean(),
        scope: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("allocation_rules", {
            ...args,
            scope: args.scope ?? "transfer",
            createdAt: Date.now(),
        });
    },
});

export const updateRule = mutation({
    args: {
        ruleId: v.id("allocation_rules"),
        label: v.optional(v.string()),
        category: v.optional(v.string()),
        ruleType: v.optional(v.string()),
        value: v.optional(v.number()),
        priority: v.optional(v.number()),
        active: v.optional(v.boolean()),
        scope: v.optional(v.string()),
    },
    handler: async (ctx, { ruleId, ...updates }) => {
        const cleaned = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );
        await ctx.db.patch(ruleId, cleaned);
    },
});

export const deleteRule = mutation({
    args: { ruleId: v.id("allocation_rules") },
    handler: async (ctx, { ruleId }) => {
        // Delete associated allocation records
        const records = await ctx.db
            .query("allocation_records")
            .filter((q) => q.eq(q.field("rule_id"), ruleId))
            .collect();
        for (const record of records) {
            await ctx.db.delete(record._id);
        }
        await ctx.db.delete(ruleId);
    },
});

export const reorderRules = mutation({
    args: {
        ruleIds: v.array(v.id("allocation_rules")),
    },
    handler: async (ctx, { ruleIds }) => {
        for (let i = 0; i < ruleIds.length; i++) {
            await ctx.db.patch(ruleIds[i], { priority: i });
        }
    },
});

export const getPreviewIncome = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const user = await ctx.db.get(userId);
        return user?.previewIncome ?? null;
    },
});

export const setPreviewIncome = mutation({
    args: { userId: v.id("users"), amount: v.number() },
    handler: async (ctx, { userId, amount }) => {
        await ctx.db.patch(userId, { previewIncome: amount });
    },
});

// List all users — run with no args to find the userId and email for seeding
export const listUsers = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        return users.map((u) => ({ _id: u._id, email: u.email, clerkId: u.clerkId }));
    },
});

// List all accounts for a user — used to inspect IDs before running seedAllocationRules
export const listAccountsForSetup = query({
    args: { userEmail: v.string() },
    handler: async (ctx, { userEmail }) => {
        const users = await ctx.db.query("users").collect();
        const user = users.find((u) => u.email.toLowerCase().includes(userEmail.toLowerCase()));
        if (!user) return { error: "User not found", availableEmails: users.map((u) => u.email), accounts: [] };
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();
        return {
            userId: user._id,
            accounts: accounts.map((a) => ({ _id: a._id, name: a.name, number: a.number, type: a.type, bank: a.bank })),
        };
    },
});

// Replace all allocation rules for the user based on the canonical budget structure.
// Matches accounts by last-4 of account number; falls back to name match for Fidelity.
// Run via: npx convex run allocationRules:seedAllocationRules '{"userEmail":"resepego@gmail.com"}'
export const seedAllocationRules = mutation({
    args: { userEmail: v.string() },
    handler: async (ctx, { userEmail }) => {
        const users = await ctx.db.query("users").collect();
        const user = users.find((u) => u.email.toLowerCase().includes(userEmail.toLowerCase()));
        if (!user) throw new Error("User not found for email: " + userEmail + ". Available: " + users.map((u) => u.email).join(", "));
        const userId = user._id;

        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        function findBySuffix(suffix: string) {
            return accounts.find((a) => a.number && a.number.replace(/\D/g, "").endsWith(suffix));
        }
        function findByNameOrBank(fragment: string) {
            const f = fragment.toLowerCase();
            return accounts.find((a) =>
                a.name.toLowerCase().includes(f) || a.bank.toLowerCase().includes(f)
            );
        }

        const acc7729 = findBySuffix("7729");
        const acc5440 = findBySuffix("5440");
        const acc2823 = findBySuffix("2823");
        const acc2836 = findBySuffix("2836");
        const accFidelity = findByNameOrBank("fidelity");
        const acc0244 = findBySuffix("0244");

        const missing: string[] = [];
        if (!acc7729) missing.push("360 Checking (...7729)");
        if (!acc5440) missing.push("360 Checking (...5440)");
        if (!acc2823) missing.push("360 Checking (...2823)");
        if (!acc2836) missing.push("360 Savings (...2836)");
        if (!accFidelity) missing.push("Fidelity");
        if (!acc0244) missing.push("360 Savings (...0244)");
        if (missing.length > 0) throw new Error("Could not find accounts: " + missing.join(", "));

        // Delete all existing rules
        const existing = await ctx.db
            .query("allocation_rules")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        for (const rule of existing) {
            await ctx.db.delete(rule._id);
        }

        const now = Date.now();
        const rules = [
            // Fundamentals (order 1) — fixed costs, target income account
            { label: "Survival Costs (Fixed/Variable)", category: "savings", accountId: acc7729!._id, value: 1500, priority: 0, scope: "refill" },
            { label: "Subscriptions (SaaS/Tools)",      category: "savings", accountId: acc7729!._id, value: 50,   priority: 1, scope: "refill" },
            // Discretionary (order 2) — spending envelopes to separate checking accounts
            { label: "Lifestyle & Fun",                 category: "spending", accountId: acc5440!._id, value: 500,  priority: 2, scope: "transfer" },
            { label: "Sinking Funds (Travel/Xmas)",     category: "spending", accountId: acc2823!._id, value: 600,  priority: 3, scope: "transfer" },
            // Wealth / Goals (order 3) — savings & investment transfers
            { label: "Emergency Fund (Goal: $20k)",     category: "investing", accountId: acc2836!._id,    value: 1750, priority: 4, scope: "transfer" },
            { label: "Investment Strategy (Roth/Brokerage)", category: "investing", accountId: accFidelity!._id, value: 1500, priority: 5, scope: "transfer" },
            { label: "House Savings (Goal: $50k)",      category: "investing", accountId: acc0244!._id,    value: 2500, priority: 6, scope: "transfer" },
        ];

        for (const rule of rules) {
            await ctx.db.insert("allocation_rules", {
                userId,
                accountId: rule.accountId,
                label: rule.label,
                category: rule.category,
                ruleType: "fixed",
                value: rule.value,
                priority: rule.priority,
                active: true,
                scope: rule.scope,
                createdAt: now,
            });
        }

        return { created: rules.length, userId };
    },
});
