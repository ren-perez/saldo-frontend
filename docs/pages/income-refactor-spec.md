# Income Planning — MVP Refactor Spec

**Purpose:** Implementation guide for Claude Code. Code is source of truth; `docs/pages/income.md` is the current-state map.

---

## Core Product Model

> "Plan how each paycheck funds your goals. Confirm once. Everything else happens automatically."

| Phase | Who acts | What happens |
|---|---|---|
| Plan | User | Creates income plan, distributes to goals |
| Match | User (1 click) | Confirms system-suggested transaction link |
| Execute | System | Funds goals, handles diff, generates next plan |
| Verify *(optional)* | System (passive) | Detects physical transfers to goal accounts |

**Planning = user decisions. Execution = system responsibility.**

---

## Goal Balance Model (Critical Design Decision)

Two types of users must be supported:

**Type A — Conceptual budgeters:** Don't physically move money. Goals are mental buckets. Income match = goal is funded.

**Type B — Physical movers (Renato's model):** Move money from income checking account → goal savings accounts. The transfer transaction is the proof of funding.

**Resolution — two-tier funding:**

1. **Reserved** (automatic): When income is matched, all allocations become `reserved`. Goal balances update immediately (conceptual funding). This satisfies Type A users completely.

2. **Verified** (passive, optional): System scans for a transfer from any account → the allocation's target account, within ~7 days of income date, with similar amount. If found, marks allocation as `verified` and links the transfer transaction. No user action required. This satisfies Type B users without adding bookkeeping UX.

Goal contribution is recorded at **Reserved** state. Verified is a confirmation layer, not a requirement.

---

## What to Delete

| Item | Location | Reason |
|---|---|---|
| `distribution-checklist.tsx` | `src/components/wealth/` | Replaced by auto-execute model |
| `allocation_transaction_matches` table | `convex/schema.ts` | No longer match allocations to txs manually |
| `markAllocationComplete` mutation | `convex/allocations.ts` | No longer needed |
| `unmarkAllocationComplete` mutation | `convex/allocations.ts` | No longer needed |
| `getDistributionChecklist` query | `convex/allocations.ts` | No longer needed |
| `AllocationMatchDialog` | wherever it lives | Per-allocation matching removed |
| `income-view.tsx` | `src/components/wealth/` | 701-line dead code, never imported |
| Checklist UI in `IncomePlanCard` allocation panel | `income-plan-card.tsx` | Replaced by simple list |

---

## New Data Model

### `income_plans` — keep existing fields, add `schedule_pattern`

```ts
{
  // existing — keep
  _id, userId, label, expected_date, expected_amount,
  actual_amount?, date_received?, notes?,
  matched_transaction_id?,
  status: "planned" | "matched" | "missed",
  recurrence,     // keep for display; logic moves to schedule_pattern
  createdAt,

  // ADD
  schedule_pattern?: {
    type: "monthly_dates",
    days: number[]    // e.g. [5, 20]
  }
}
```

### `allocation_records` — simplified

Remove: `status`, `matched_amount`, `label` (checklist fields)
Add: `verification_status`, `transfer_transaction_id`

```ts
{
  // keep
  _id, income_plan_id, accountId, amount, category,
  is_forecast, rule_id, createdAt,

  // REMOVE: status, matched_amount, label

  // ADD
  verification_status: "pending" | "reserved" | "verified",
  transfer_transaction_id?: Id<"transactions">   // passive auto-link only
}
```

### `allocation_transaction_matches` — DELETE entire table

---

## New Flows

### Create Plan
1. User fills `IncomeFormDialog` (label, date, amount, recurrence, optional notes)
2. `createIncomePlan` → `status: "planned"`
3. `runAllocationsForPlan` creates forecast `allocation_records` with `is_forecast: true`, `verification_status: "pending"`
4. No change to existing create UX

### Match Flow (CRITICAL — rewrite `matchIncomePlan`)

On confirm:
```
1. Set plan: status = "matched", actual_amount, date_received, matched_transaction_id
2. Set allocations: is_forecast = false, verification_status = "reserved"
   - Scale amounts proportionally if actual_amount != expected_amount
   - If diff exists: surface diff resolver UI before confirming (see UI section)
3. Update goal balances: for each allocation, goal.balance += allocation.amount
   - **Idempotent guard:** only apply if plan was NOT previously matched (check prior status before update). Unmatch reverses; re-match re-applies. Never double-count.
4. JIT recurrence: IF schedule_pattern exists
   - Compute next date from pattern
   - Create next income_plan with same expected_amount + copied allocation structure
   - Do NOT copy status, matched fields
5. Trigger passive verification scan (background, non-blocking)
```

### Diff Resolver (new UI state, not a new dialog)

Triggered when `actual_amount != expected_amount` at match confirmation:

- Show: "You received $X less/more than planned"
- Display allocation list with editable amounts
- Show running total vs actual_amount
- Require balance = $0 before Confirm enabled
- "Distribute evenly" shortcut button

### Unmatch
- Revert `status = "planned"`
- Set `is_forecast = true`, `verification_status = "pending"` on records
- Clear `matched_transaction_id`, `actual_amount`, `date_received`
- Reverse goal balance updates (subtract allocation amounts)
- Do NOT delete allocation_records

### Mark Missed
- Set `status = "missed"`
- Delete `allocation_records` (no `allocation_transaction_matches` exist anymore to worry about)
- Reverse any goal balance contributions if plan was previously matched

### Mark Planned (restore from missed)
- Set `status = "planned"`
- **Run `runAllocationsForPlan`** to recreate forecast records (fix existing bug)

### Delete Plan
- Delete `allocation_records` for plan
- Delete plan
- Reverse goal contributions if plan was matched

### Passive Verification (background helper, runs after match)

For each `allocation_record` where `verification_status = "reserved"`:
- **Gold standard (Type B):** Find a transaction pair — outflow from the income plan's matched account AND inflow to `allocation.accountId` — same amount (within 5%), within 7 days of `date_received`. Both legs must exist to avoid false positives (e.g., a $500 gift deposit matching a $500 allocation).
- **Fallback (Type A / single-account):** If outflow check is not possible (no income account context), match inflow to `allocation.accountId` only, amount within 5%, within 7 days.
- If match found: set `verification_status = "verified"`, `transfer_transaction_id = tx._id` (the inflow tx)
- No user action required; status shown in UI passively

### JIT Recurrence Rules

```ts
schedule_pattern = { type: "monthly_dates", days: [5, 20] }
```

On match:
- Find next upcoming date from `days` array after `date_received`
- If none in current month, take first day of next month from list
- Create new plan with same `label`, `expected_amount`, same allocation amounts
- New plan starts with fresh forecast allocations

Only ONE future plan generated per match. Never generate multiple ahead.

---

## UI Changes

### `IncomePlanCard`

**Status display:**

| Status | Label | Color |
|---|---|---|
| `planned` | Planned | Neutral |
| `matched` | Matched | Sky blue |
| `completed` *(derived)* | Completed | Emerald — when matched + all allocations verified |
| `missed` | Missed | Red |

`completed` is derived: `status === "matched" && allocations.every(a => a.verification_status === "verified")`

**Allocation panel (replace checklist):**

Show simple list for all plan states (planned and matched):
- Color dot, account name (goal name if linked), amount
- For matched plans: show `verification_status` badge per row ("Reserved" / "Verified")
- No toggle buttons, no transaction matching UI
- Keep "Add" dropdown and "Reset to rules" footer (planned only)
- Keep editable amounts on blur (planned only)

**Action menu:**
- Remove all allocation-matching actions
- Keep: Match / Unmatch / Edit / Mark missed / Mark planned / Delete

**Suggested Match button:** Keep as-is (`< 5%` threshold, pre-selects tx in dialog)

### `MatchIncomeDialog`

- Keep current layout
- **Add Diff Resolver state**: after selecting a transaction, if `amountDiff > 0`, show inline diff resolver (allocation list + running total) before Confirm becomes active
- "Distribute evenly" button in diff resolver

### `UnmatchedIncomeModal`

- Keep current structure (Unmatched + Recently Matched tabs)
- Keep suggestion logic and pagination
- No changes needed

### `IncomeFormDialog`

- Keep as-is
- Optionally add `schedule_pattern` editor below recurrence select (MVP: only `monthly_dates` type, multi-select day picker)
- `schedule_pattern` is optional; when set, replaces decorative recurrence behavior with actual JIT generation

---

## Bugs to Fix (during refactor)

These are fixed as a side effect of the new flows:

| Bug | Fix |
|---|---|
| `markMissed` orphan rows | Removed — `allocation_transaction_matches` table deleted |
| `markPlanned` no allocation restore | Fixed — `runAllocationsForPlan` called in `markPlanned` |
| `runAllocationsForPlan` silent overwrite | Partially mitigated — only called on planned plans; matched allocations no longer re-run on edit |
| `avgMonthlyIncome` wrong divisor | Fix: divide by distinct month count, not plan count |
| Divergent unmatched count signals | Defer — not part of this refactor |

---

## Implementation Order

1. **Schema migration**: remove checklist fields from `allocation_records`, add `verification_status` + `transfer_transaction_id`, delete `allocation_transaction_matches` table, add `schedule_pattern` to `income_plans`
2. **Delete dead code**: `income-view.tsx`, `distribution-checklist.tsx`, `AllocationMatchDialog`, checklist mutations/queries
3. **Rewrite `matchIncomePlan`**: auto-reserve allocations, update goal balances, JIT recurrence
4. **Fix `markMissed`** + **`markPlanned`**
5. **Build passive verification helper** (new Convex action/mutation, runs after match)
6. **Update `IncomePlanCard`** allocation panel: replace checklist with simple list + verification badges
7. **Add Diff Resolver** inline state in `MatchIncomeDialog`
8. **Add `schedule_pattern` field** to `IncomeFormDialog` (optional, day-picker UI)
9. **Fix `avgMonthlyIncome`** calculation
10. **Update `docs/pages/income.md`** to reflect new model

---

## Out of Scope (MVP)

- Bulk match / bulk dismiss
- Date range filter on timeline
- Success toasts (nice to have, add at end)
- `rule_id` optionality enforcement
- Full multi-type recurrence (weekly, biweekly) — only `monthly_dates` for now
- Forecasting / budgeting system
- Cron-based plan generation
