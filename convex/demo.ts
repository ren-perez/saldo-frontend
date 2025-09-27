// convex/demo.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const cloneUserData = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (ctx, { fromUserId, toUserId }) => {
    const accountIdMap = new Map();
    const groupIdMap = new Map();
    const categoryIdMap = new Map();
    const goalIdMap = new Map();
    const txIdMap = new Map(); // for proper transfer pair linking

    // --- 1. Category Groups ---
    const groups = await ctx.db.query("category_groups")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    for (const g of groups) {
      const { _id, _creationTime, userId, ...rest } = g;
      const newId = await ctx.db.insert("category_groups", { ...rest, userId: toUserId });
      groupIdMap.set(_id, newId);
    }

    // --- 2. Categories ---
    const categories = await ctx.db.query("categories")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    for (const c of categories) {
      const { _id, _creationTime, userId, groupId, ...rest } = c;
      const newId = await ctx.db.insert("categories", {
        ...rest,
        userId: toUserId,
        groupId: groupId ? groupIdMap.get(groupId) : undefined,
      });
      categoryIdMap.set(_id, newId);
    }

    // --- 3. Accounts ---
    const accounts = await ctx.db.query("accounts")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    for (const a of accounts) {
      const { _id, _creationTime, userId, ...rest } = a;
      const newId = await ctx.db.insert("accounts", { ...rest, userId: toUserId });
      accountIdMap.set(_id, newId);
    }

    // --- 4. Goals ---
    const goals = await ctx.db.query("goals")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    for (const g of goals) {
      const { _id, _creationTime, userId, linked_account_id, ...rest } = g;
      const newId = await ctx.db.insert("goals", {
        ...rest,
        userId: toUserId,
        linked_account_id: linked_account_id ? accountIdMap.get(linked_account_id) : undefined,
      });
      goalIdMap.set(_id, newId);
    }

    // --- 5. Transactions ---
    const txs = await ctx.db.query("transactions")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    for (const t of txs) {
      const { _id, _creationTime, userId, accountId, categoryId, ...rest } = t;
      const newTxId = await ctx.db.insert("transactions", {
        ...rest,
        userId: toUserId,
        accountId: accountIdMap.get(accountId),
        categoryId: categoryId ? categoryIdMap.get(categoryId) : undefined,
      });
      txIdMap.set(_id, newTxId);
    }

    // --- 6. Goal Contributions ---
    const contribs = await ctx.db.query("goal_contributions")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    for (const c of contribs) {
      const { _id, _creationTime, userId, goalId, ...rest } = c;
      await ctx.db.insert("goal_contributions", {
        ...rest,
        userId: toUserId,
        goalId: goalIdMap.get(goalId),
      });
    }

    // --- 7. Goal Monthly Plans ---
    const gplans = await ctx.db.query("goal_monthly_plans")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    for (const g of gplans) {
      const { _id, _creationTime, userId, goalId, ...rest } = g;
      await ctx.db.insert("goal_monthly_plans", {
        ...rest,
        userId: toUserId,
        goalId: goalIdMap.get(goalId),
      });
    }

    // --- 8. Presets ---
    const presets = await ctx.db.query("presets")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    const presetIdMap = new Map();
    for (const p of presets) {
      const { _id, _creationTime, userId, ...rest } = p;
      const newId = await ctx.db.insert("presets", { ...rest, userId: toUserId });
      presetIdMap.set(_id, newId);
    }

    // --- 9. PresetAccounts ---
    const pAccounts = await ctx.db.query("presetAccounts").collect();
    for (const pa of pAccounts) {
      if (!presetIdMap.has(pa.presetId)) continue;
      const { _id, presetId, accountId } = pa;
      await ctx.db.insert("presetAccounts", {
        presetId: presetIdMap.get(presetId),
        accountId: accountIdMap.get(accountId),
      });
    }

    // --- 10. Ignored Transfer Pairs ---
    const ig = await ctx.db.query("ignored_transfer_pairs")
      .filter(q => q.eq(q.field("userId"), fromUserId))
      .collect();
    for (const i of ig) {
      const { _id, _creationTime, userId, outgoingTransactionId, incomingTransactionId, ...rest } = i;
      await ctx.db.insert("ignored_transfer_pairs", {
        ...rest,
        userId: toUserId,
        outgoingTransactionId: txIdMap.get(outgoingTransactionId) || outgoingTransactionId,
        incomingTransactionId: txIdMap.get(incomingTransactionId) || incomingTransactionId,
      });
    }

    return { ok: true };
  },
});
