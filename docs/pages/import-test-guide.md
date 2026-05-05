# Multi-Account Import: Testing Guide

## Context

This guide covers how the multi-account import process interacts with account balances, goal contributions, and planned incomes. Written for the 2026 setup scenario: importing 2026 transaction data into a fresh Saldo account.

---

## 1. Account Balances

**How it works:** `balance` on the accounts table is a **manual field** — it is NOT computed from transaction history. Importing transactions does not touch it.

**For the 2026 scenario:** Import 2026 transactions first, then manually update each account's balance to the current real-world value. The mutation `updateAccount({ accountId, balance })` in `convex/accounts.ts` handles this.

**Gap to know:** There is no "update balance" step built into the import flow UI. After import completes and you land on `/transactions`, go to account settings to manually set each account's balance.

**What to test:**
- After multi-account import completes, go to each account and set `balance` to the current real-world value.
- Verify the balance appears correctly in the dashboard/accounts list.

---

## 2. Goal Balances & Contributions

**How it works:** Goal balance = sum of all records in `goal_contributions` table. It is computed, not stored. Import alone does **NOT** create goal contributions.

**The only automatic path to goal contributions is via income plan matching:**
- User matches an income plan to a transaction
- System creates `goal_contributions` with `source: "income_allocation"` for linked goal accounts
- This is idempotent and handles the "actual ≠ expected" diff case

**The import → goal gap:**
- Importing transactions (even into an account linked to a goal) does NOT auto-contribute to the goal.
- Creating a goal AFTER import does NOT backfill contributions from existing transactions.
- If you import first, then create a goal and link it to an account, the goal balance starts at $0 until a contribution is manually added or an income plan is matched.

**Test scenarios:**

| Scenario | Expected Behavior |
|---|---|
| Import → create goal (linked account) → check balance | Balance = $0; no auto-backfill |
| Create income plan → match transaction → check linked goal | Contribution auto-created ✅ |
| Create income plan → match transaction → verify transfer to goal account | Allocation verified automatically ✅ |
| Import happens, THEN create goal, THEN match income plan | Contribution created from match point forward ✅ |

**Recommended approach for 2026 setup:** Create goals first (or alongside import). Then when you match income plans to imported 2026 transactions, goal contributions auto-create.

---

## 3. Planned Incomes

**How it works:** Income plans are independent of import — they don't auto-match.

**What fires automatically after import:**
- `verifyAccountAllocations` runs on any account that received new transactions
- This scans for **already-matched** income plans with **pending allocation records** for that account
- If a matching inflow/outflow is found, allocation record → "verified"
- If ALL allocations verified → plan auto-completes

**What does NOT happen automatically:**
- Pending (unmatched) income plans do NOT auto-match to imported transactions
- User must manually match via `MatchIncomeDialog`

**Test scenarios:**

| Scenario | Expected Behavior |
|---|---|
| Import income transactions → open income plans | Plans still show "pending"; no auto-match |
| Manually match plan to imported transaction | Allocations reserved, goal contributions created ✅ |
| Import transfer transactions to linked goal account (AFTER plan matched) | `verifyAccountAllocations` auto-marks allocation "verified" ✅ |
| All allocations verified → plan status | Auto-completes ✅ |
| Recurring plan → match → next occurrence | Next plan auto-generated via JIT ✅ |

---

## 4. What Happens Automatically During/After Import

| Feature | Auto on Import? | Trigger |
|---|---|---|
| Transaction insertion + dedup | ✅ | Import process |
| Category resolution (CSV → rules → uncategorized) | ✅ | Import process |
| Transfer pairing (cross-account) | ✅ | `autoLinkTransferPairs` post-import |
| Allocation verification for already-matched plans | ✅ | `verifyAccountAllocations` scheduler |
| Account balance update | ❌ | Manual via `updateAccount()` |
| Goal contribution creation | ❌ | Manual or income plan match |
| Income plan matching | ❌ | Manual via MatchIncomeDialog |

---

## 5. Recommended Testing Sequence

1. **Import** — Run multi-account import with 2026 CSV data.
2. **Review** — Check `/transactions`: duplicates resolved, transfers paired, categories assigned.
3. **Balance** — Go to each account's settings and manually set balance to current real-world value.
4. **Goals** — Create goals and link to relevant accounts (or verify existing ones are linked).
5. **Income plans** — Match each imported income transaction to its income plan manually.
6. **Verify allocations** — After matching, check that allocation records move to "verified" and goal contributions appear.
7. **Recurring plans** — Confirm next plan occurrence was auto-generated.

---

## 6. Known Gaps

- **No "update balance" step in import UI** — must go to account settings post-import.
- **Goal contributions don't backfill** — importing transactions into a goal-linked account does nothing to goal balance; contributions only flow through manual entry or income plan matching.
- **Income plans don't auto-match** — informational tagging via `getImportAllocationStatus()` hints at which plans could match, but user must confirm manually.
