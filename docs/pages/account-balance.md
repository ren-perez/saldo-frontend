# Account Balance: Computed Model

## Why this exists

The previous approach stored `balance` directly on the account and delta-patched it on every transaction insert (`balance += tx.amount`). This was fragile — editing or deleting a transaction did not correct the balance, and the field would drift from reality.

The new model removes all delta patches and computes balance on read.

---

## How it works

**Account balance** = `starting_balance` (manual anchor) + `sum(all transactions for account)`

- Computed fresh on every query — no stored running total
- `starting_balance` is the one manually settable field (set via account settings)
- `balance` returned from queries is always the computed value

**Goal balance (LINKED_ACCOUNT goals)** = linked account's computed balance
**Goal balance (MANUAL goals)** = sum of `goal_contributions` records (unchanged)

---

## Schema

```
accounts: {
    balance: optional<number>          // legacy — no longer written; kept for backward compat
    starting_balance: optional<number> // manual anchor; default 0 if not set
}
```

---

## Where balance is computed

| Location | Notes |
|---|---|
| `convex/accounts.ts` — `listAccounts` | Main UI query; returns `balance: starting_balance + txSum` and `starting_balance` separately |
| `convex/goals.ts` — `calculateCurrentAmount` | LINKED_ACCOUNT goals branch: computes from account's txns |
| `convex/goals.ts` — `getGoalAccounts` | Previously returned `balance: 0`; now returns real computed balance |
| `convex/contributions.ts` — `getGoalsForAllocation` | LINKED_ACCOUNT goals branch: computes from account's txns |
| `convex/chatTools.ts` — `getBalance` | Telegram /balance command; always has a balance now |

---

## What no longer happens

The following `db.patch` calls were removed from `convex/transactions.ts`:

- `importTransactions` — no longer patches `balance` after insert
- `addAsNewTransaction` — no longer patches `balance` after insert
- `createManualTransaction` — no longer patches `balance` after insert

Deleting or editing a transaction now automatically reflects in the computed balance with no extra code.

---

## Migration note

Existing accounts have `balance` set (legacy) and `starting_balance` undefined. After this change, their computed balance = `0 + sum(transactions)`. Users should go to account settings and set `starting_balance` to anchor the balance correctly. This is the same manual step that was already part of the recommended post-import workflow.

---

## Setting starting balance

In the UI: **Accounts → Edit account → Starting balance field**

This sets `starting_balance` on the account document. The displayed balance is always `starting_balance + sum(transactions)` — the edit field only stores the anchor, not the computed total.

Via mutation directly:
```typescript
updateAccount({ accountId, starting_balance: 1500 })
```

---

## Known limitations

- Balance is recomputed by loading all transactions for an account on every query. For accounts with very large transaction histories this may be slow. A future optimization could store a running aggregate. For current usage this is not a concern.
- The `balance` field remains in the schema and on old documents. It is safe to ignore — no code writes to it anymore.
