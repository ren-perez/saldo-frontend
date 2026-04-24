# Income Page — Feature Reference

**File:** `src/app/income/page.tsx`
**Route:** `/income`

---

## Page Structure

- Wrapped in `AppLayout` + `InitUser`
- Header: `DollarSign` icon + "Income" h1 + `Info` tooltip
- Action bar (below header)
- `IncomeTimeline` always rendered (no tabs)
- `AllocationsView` rendered as a Dialog
- `UnmatchedIncomeModal` + `MatchTransactionDialog` inline at bottom

---

## Action Bar

| Button | Visible when | Action |
|---|---|---|
| "Match Your Income" (`Inbox`, amber) | `unmatchedCount > 0` | Opens `UnmatchedIncomeModal` (only opens, never closes) |
| "Allocation Rules" (`SlidersHorizontal`) | Always | Opens `AllocationsView` dialog |
| "Add Income" (`Plus`) | Always | Opens `IncomeFormDialog` (create mode) |

`IncomeTimeline` receives `externalFormOpen` + `onExternalFormOpenChange` props from the page.

---

## Timeline — `IncomeTimeline`

**File:** `src/components/wealth/income-timeline.tsx`

- States: loading spinner / empty card / month-grouped `IncomePlanCard` list
- Sorted by `expected_date` descending, grouped by `YYYY-MM`
- Sticky month headers: month label + `MonthSummary` (received, pending, missed counts)
- Tracks `preSelectedTxId`: when card "Suggested Match" clicked, `handleMatchClick(plan, txId)` forwards pre-selection to `MatchIncomeDialog`

---

## Income Plan Card — `IncomePlanCard`

**File:** `src/components/wealth/income-plan-card.tsx`

### Status Model

| Status | Notes |
|---|---|
| `planned` | Default; forecast allocations active |
| `matched` | Transaction linked; allocations reserved |
| `completed` | **Derived UI-only** — matched + all allocations verified; not stored in DB |
| `missed` | Manually set; allocations deleted |

`completed` derived as: `status === "matched" && allocations.every(a => a.verification_status === "verified")`

### Suggested Match Button
`getSuggestedMatches` queried for planned plans (14-day window). Button shown if `amountDiff / expected_amount < 0.05` and not already matched. Opens `MatchIncomeDialog` with pre-selected tx.

### 3-Dot Action Menu

**Planned:** Match → `MatchIncomeDialog` | Edit → `IncomeFormDialog` | Mark missed (`window.confirm`, deletes allocations)

**Matched:** Unmatch (reverses goal contributions, re-runs allocations) | Edit

**Missed:** Mark as planned (restores status + re-runs allocations)

**Always:** Delete plan (`window.confirm`, cascades to allocations + goal contributions)

### Allocation Panel (expandable)

Uses `AllocationRows` component for both `planned` and `matched` plan states:
- **Planned:** editable amounts on blur, Add dropdown, Reset to rules button
- **Matched:** read-only amounts, verification badge per row ("Reserved" / "Verified" with shield icon)
- **Missed:** hidden
- **No allocations:** "Run allocations" button

Progress bar: segmented by allocation, forecast at 50% opacity.

---

## Match Income Dialog — `MatchIncomeDialog`

**File:** `src/components/wealth/match-income-dialog.tsx`

- Entry: plan card menu or Suggested Match button (plan-first flow)
- Optional `preSelectedTxId` auto-selected via `useEffect` on open
- Queries `getSuggestedMatches` (14-day window, top 5) and `getAllocationsForPlan`
- Already-matched transactions disabled at 50% opacity
- **Diff Resolver:** if selected transaction amount differs from expected by > $0.01:
  - Shows amber banner with mismatch warning
  - Displays editable allocation list pre-filled with proportionally scaled amounts
  - Running total indicator; Confirm disabled until total equals actual amount
  - "Distribute evenly" shortcut button
- On confirm: `matchIncomePlan` (with optional `customAllocations`) → fire-and-forget `verifyAllocations`

---

## Unmatched Income Modal

**File:** `src/app/income/page.tsx` (inline component)

- Queries skipped when closed (`"skip"` pattern); `limit: 200, incomeOnly: true`
- `PAGE_SIZE = 20`, "Show N more" pagination (no hard cap)
- **Two tabs:** Unmatched | Recently Matched

**Unmatched tab:** account filter → transaction list → suggestion (14d, <20% diff) → click opens `MatchTransactionDialog`

**Recently Matched tab:** last 20 matched plans sorted by `date_received` desc; Undo = `window.confirm` → `unmatchIncomePlan` + `runAllocationsForPlan`

---

## Match Transaction → Plan Dialog — `MatchTransactionDialog`

**File:** `src/components/wealth/match-transaction-dialog.tsx`

- Entry: Unmatched Income Modal (transaction-first flow)
- Queries `getPlansForTransaction` (14-day window, top 10 planned plans)
- Confirm: `matchIncomePlan` → `verifyAllocations` (fire-and-forget)

---

## Income Form Dialog — `IncomeFormDialog`

**File:** `src/components/wealth/income-form-dialog.tsx`

| Field | Default |
|---|---|
| Label | `""` |
| Expected Date | Today |
| Expected Amount | `""` (min 0, step 100) |
| Recurrence | `monthly` |
| Schedule days | `""` (optional, only shown for monthly) |
| Notes | `""` (optional) |

**Schedule days field:** comma-separated day numbers 1–28 (e.g. "5, 20"). Only shown when recurrence = monthly. When set, creates `schedule_pattern: { type: "monthly_dates", days: [...] }`. This enables JIT recurrence — matching the plan auto-creates the next occurrence.

- Form resets via `useEffect` on `open`/`plan` change
- Validation: label, date, amount > 0 required; schedule days validated as 1–28 integers
- Edit hint (planned): "Saving will re-run allocation rules with the updated amount."
- Create: `createIncomePlan` → `runAllocationsForPlan` → close
- Edit: `updateIncomePlan` → `runAllocationsForPlan` (planned only) → close

> **TODO (enforced only by comment):** `IncomeFormDialog` must not be used for Goal Withdrawals.

---

## Data Model

### `income_plans` — active

| Field | Type | Notes |
|---|---|---|
| `userId` | `id("users")` | indexed |
| `expected_date` | `string` | YYYY-MM-DD |
| `expected_amount` | `number` | |
| `label` | `string` | |
| `recurrence` | `string` | display only unless schedule_pattern set |
| `status` | `string` | `"planned"` \| `"matched"` \| `"missed"` |
| `notes` | `string?` | |
| `matched_transaction_id` | `id("transactions")?` | set on match |
| `actual_amount` | `number?` | set from tx on match |
| `date_received` | `string?` | set from tx on match |
| `schedule_pattern` | `{ type: string, days: number[] }?` | enables JIT recurrence |
| `createdAt` | `number` | |

### `allocation_records` — active

| Field | Type | Notes |
|---|---|---|
| `income_plan_id` | `id("income_plans")` | |
| `accountId` | `id("accounts")` | |
| `rule_id` | `id("allocation_rules")` | required |
| `amount` | `number` | editable |
| `category` | `string` | denormalized from rule |
| `is_forecast` | `boolean` | `true` = planned, `false` = matched |
| `verification_status` | `string?` | `"pending"` \| `"reserved"` \| `"verified"` |
| `transfer_transaction_id` | `id("transactions")?` | set passively by `verifyAllocations` |
| `createdAt` | `number` | |

### `goal_contributions` — relevant fields added

| Field | Notes |
|---|---|
| `income_plan_id` | links contribution to income plan; used for idempotent reversal on unmatch/delete |
| `source` | `"income_allocation"` when created from income match |

### `allocation_rules` — active

`percent` or `fixed` rules per account/category. Drives `runAllocationsForPlan`.

**Rule scope (new type distinction):**

| Type | Description | Verification |
|---|---|---|
| `transfer` | Move money to a different account (Goal, Debt) | System watches for matching bank transaction inflow |
| `refill` | Stay in the income account (Spending / Cash-in-Hand) | Auto-verified when target account == income receiving account |

Rules are **execution engine instructions**, not just calculators. On match, they fire automatically — no manual "Mark as Transferred" step needed.

### ~~`allocation_transaction_matches`~~ — **DELETED**

Removed. Allocation-to-transaction matching is no longer a feature.

---

## Backend Surface

### `convex/incomePlans.ts`

| Export | Type | Purpose |
|---|---|---|
| `listIncomePlans` | query | All plans for user, sorted by date desc |
| `createIncomePlan` | mutation | Insert with `status: "planned"`, supports `schedule_pattern` |
| `updateIncomePlan` | mutation | Patch provided fields, supports `schedule_pattern` |
| `deleteIncomePlan` | mutation | Reverse goal contributions if matched → delete records → delete plan |
| `matchIncomePlan` | mutation | Reserve allocations (scale if diff), update goal balances (idempotent), JIT recurrence |
| `unmatchIncomePlan` | mutation | Reverse goal contributions, revert plan + allocations to planned/pending state |
| `markMissed` | mutation | Reverse goal contributions if matched, set missed, delete allocation records |
| `markPlanned` | mutation | Restore to planned, re-run allocations from rules |
| `getSuggestedMatches` | query | 14-day window, top 5 by amount diff, marks already-matched txs |
| `getPlansForTransaction` | query | 14-day window, top 10 planned plans by amount diff |
| `getIncomeSummary` | query | This-month stats + upcoming 5 + `avgMonthlyIncome` (per distinct month, not per plan) |

### `convex/allocations.ts`

| Export | Type | Purpose |
|---|---|---|
| `runAllocationsForPlan` | mutation | Delete + recreate forecast records from rules; called on create/edit/restore |
| `previewAllocation` | query | Preview without persisting |
| `updateAllocationAmount` | mutation | Edit single record amount |
| `getAllocationsForPlan` | query | Enriched with accountName, goalName, goalEmoji |
| `getMonthlyForecast` | query | 3-month forecast by category |
| `addAllocationRecord` | mutation | Add single record to plan |
| `deleteAllocationRecord` | mutation | Delete single record |
| `verifyAllocations` | mutation | Passive scan: links transfer transactions to allocations; fire-and-forget after match |

---

## Safe to Spend Auto-Verification

If an allocation's `accountId` is the **same** as the income plan's receiving account, the system auto-verifies it on match without waiting for a transfer. This creates a "Safe to Spend" pool immediately.

**Rule:** `allocation.accountId === income_receiving_account → verification_status = "verified"` (on match)

This is the mechanism for `refill`-type rules. The money never moves — it's already there.

---

## Budget Architecture (Decoupled from Income)

Expenses are **not** tracked per income plan. The model is:

- **Income → fills "Safe to Spend" pool** via `refill` allocations (auto-verified on match)
- **Monthly targets → track the drain** independently of which paycheck funded it

Chosen approach: **burn rate gauge** (single "Safe to Spend" pool for the month, not strict per-category limits).

```
Income arrives ($2,000)
  ├── Transfer rules → Reserved → Observer waits for bank confirmation
  └── Refill rules  → Auto-Verified → Safe to Spend pool charges up

Monthly expenses → categorized → drain the Safe to Spend gauge
  (no link back to a specific paycheck)
```

Budget engine is a **future feature** — this section documents the intended architecture so allocation rule design decisions are made correctly now.

---

## Match Flow (New Model)

```
User selects transaction in MatchIncomeDialog
  └── if amountDiff > 0: show Diff Resolver
       - pre-fill allocations scaled to actual_amount
       - user adjusts until total == actual
  └── Confirm →

matchIncomePlan (Convex mutation)
  1. Patch plan: status=matched, actual_amount, date_received, matched_transaction_id
  2. Patch allocations: is_forecast=false, verification_status="reserved", amounts (scaled or custom)
  3. Create goal_contributions for each allocation linked to a goal (idempotent guard)
  4. If schedule_pattern: generate ONE next plan with same label/amount/allocation structure

verifyAllocations (fire-and-forget after match)
  - For each "reserved" allocation:
    - Scan inflows to allocation.accountId within 10 days
    - Gold standard: also verify matching outflow from income account
    - If found: set verification_status="verified", transfer_transaction_id
```

## Unmatch Flow

```
unmatchIncomePlan
  1. Delete goal_contributions where income_plan_id = planId
  2. Patch plan: status=planned, clear matched fields
  3. Patch allocations: is_forecast=true, verification_status="pending", clear transfer_transaction_id

runAllocationsForPlan (called from UI after unmatch)
  - Deletes + recreates forecast records from expected_amount + rules
```

## JIT Recurrence

- Triggered inside `matchIncomePlan` when `plan.schedule_pattern` exists
- Only `type: "monthly_dates"` supported
- Computes next date from `days` array after `date_received`
- Creates ONE new plan (same label, expected_amount, allocation structure)
- Deduplication: skips creation if a plan with same label+date already exists

---

## Data Flow

```
Page load
  └── useUnmatchedIncomeCount  → drives "Match Your Income" badge

IncomeTimeline (always rendered)
  └── listIncomePlans → IncomePlanCard
      ├── getAllocationsForPlan
      └── getSuggestedMatches  (planned only)

UnmatchedIncomeModal (when open)
  ├── getUnallocatedTransactions  (limit 200, incomeOnly)
  ├── getGoalAccounts
  └── listIncomePlans             (suggestions + recently matched tab)

MatchTransactionDialog  → getPlansForTransaction
MatchIncomeDialog       → getSuggestedMatches + getAllocationsForPlan
```

---

## Dead Code (removed)

- ~~`src/components/wealth/income-view.tsx`~~ — deleted (701-line old table UI)
- ~~`src/components/wealth/distribution-checklist.tsx`~~ — deleted
- ~~`src/components/wealth/allocation-match-dialog.tsx`~~ — deleted
- ~~`convex/allocations.ts: getDistributionChecklist, matchAllocationTransaction, unmatchAllocationTransaction, markAllocationComplete, unmarkAllocationComplete, getSuggestedTransactionsForAllocation, getActiveDistributions`~~ — deleted

---

## Known Gaps (Remaining)

- No success toast after matching
- No bulk-match or bulk-dismiss for unmatched transactions
- Missed plans must "Mark as planned" before they can be matched directly
- No date range filter or search on the Timeline
- `rule_id` in `allocation_records` is required — manually added records need a best-match rule

---

## Changelog

### 2026-04-23 (Architecture: Rules + Budget Decoupling)
- **[Architecture]** Allocation rules promoted to execution engine instructions (not just calculators)
- **[Architecture]** Defined two rule scopes: `transfer` (waits for bank verification) and `refill` (auto-verifies when target == receiving account)
- **[Architecture]** Safe to Spend auto-verification: `refill` allocations whose target account == income receiving account get `verified` on match — no transfer needed
- **[Architecture]** Budget decoupled from income: income fills a monthly Safe to Spend pool; expenses drain it without linking to a specific paycheck
- **[Architecture]** Chosen budgeting approach: burn rate gauge (not per-category limits)
- **[Planned cleanup]** Remove manual verification UI from allocation rules (no "Mark as Transferred" buttons)
- **[Planned cleanup]** Remove redundant `is_active` / complex status flags from `allocation_rules` once rule `type` field is added

### 2026-04-22 (MVP Refactor)
- **[Model]** New core model: Plan → Match (1-click) → System executes allocations → passive verification → JIT next plan
- **[Schema]** Added `schedule_pattern` to `income_plans`; added `verification_status` + `transfer_transaction_id` to `allocation_records`; added `income_plan_id` to `goal_contributions`; deleted `allocation_transaction_matches` table
- **[Backend]** Rewrote `matchIncomePlan`: auto-reserves allocations, scales for diffs, creates goal contributions (idempotent), JIT recurrence
- **[Backend]** Fixed `markMissed`: reverses goal contributions if plan was matched
- **[Backend]** Fixed `markPlanned`: re-runs allocations from rules (was no-op before)
- **[Backend]** Fixed `unmatchIncomePlan`: reverses goal contributions, resets verification state
- **[Backend]** Fixed `getIncomeSummary.avgMonthlyIncome`: now divides by distinct month count, not plan count
- **[Backend]** Added `verifyAllocations` mutation: passive transfer detection (gold standard: checks both inflow to goal account + outflow from income account)
- **[Frontend]** Deleted `distribution-checklist.tsx`, `allocation-match-dialog.tsx`, `income-view.tsx`
- **[Frontend]** `IncomePlanCard`: replaced distribution checklist with unified `AllocationRows` component; verification badges ("Reserved" / "Verified") on matched plans
- **[Frontend]** `MatchIncomeDialog`: added Diff Resolver inline state; removed separate `runAllocations` call (match now handles it); fires `verifyAllocations` after match
- **[Frontend]** `IncomeFormDialog`: added "Schedule days" field for monthly recurrence → sets `schedule_pattern`
- **[Frontend]** `income-shared.ts`: updated `AllocationRecord` type (added `verification_status`, removed checklist fields); `IncomePlan` type (added `schedule_pattern`); renamed `distributed` → `completed` in `statusConfig`

### 2026-04-22 (Audit)
- Confirmed page has no Tabs — `IncomeTimeline` always rendered, `AllocationsView` is a Dialog.
- Confirmed `income-view.tsx` (701 lines) was dead code.
- Documented `markMissed` orphan bug, `markPlanned` allocation gap, `avgMonthlyIncome` calculation bug, dual unmatched-count signal mismatch.

### 2026-04-13
- **[Step 1]** Unified matching date window to 14 days.
- **[Step 2]** `IncomePlanCard` Suggested Match button with `< 5%` threshold.
- **[Step 3]** `UnmatchedIncomeModal`: open-only toggle fix; Recently Matched tab; pagination.
- **[Step 4]** `IncomeFormDialog`: `useEffect` form reset; per-field validation.
- **[Step 5]** TODO comment re: Goal Withdrawals.
