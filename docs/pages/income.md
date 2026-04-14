# Income Page — Feature Reference

**File:** `src/app/income/page.tsx`
**Route:** `/income`

---

## Page Structure

- Wrapped in `AppLayout` (shared nav/shell) + `InitUser` (Convex user bootstrap on mount)
- Top-level flex column, 24px gap/padding
- Header: `DollarSign` icon + "Income" h1 + `Info` tooltip ("Track and allocate your income across accounts.")
- Below header: full-width **Tabs** component

---

## Tabs

| Tab key | Label | Component |
|---|---|---|
| `timeline` | Timeline | `IncomeTimeline` |
| `allocations` | Allocation Rules | `AllocationsView` |

Tab state is local (`activeTab`, default `"timeline"`).

---

## Header Action Bar (right of tab list)

Three conditionally rendered buttons:

| Button | Visible when | Action |
|---|---|---|
| "Match Your Income" (`Inbox` icon, amber) | `unmatchedCount > 0` | **Only opens** `UnmatchedIncomeModal` (never toggles closed) |
| "Add Income" (`Plus` icon) | `activeTab === "timeline"` | Opens `IncomeFormDialog` (create mode) |
| "Add Rule" (`Plus` icon, smaller) | `activeTab === "allocations"` | Opens allocation rule form |

Responsive: full labels on `sm+`, abbreviated on mobile.

---

## Timeline Tab — `IncomeTimeline`

**File:** `src/components/wealth/income-timeline.tsx`

### States
- **Loading:** Spinner + "Loading income plans..."
- **Empty:** Card with icon + "No income planned" + "Add Income" button
- **Populated:** Month-grouped `IncomePlanCard` list

### Grouping
- Sorted by `expected_date` descending (newest first)
- Grouped by `YYYY-MM`
- Sticky month headers (`top-16`, blurred bg) show: month label, divider, `MonthSummary`, total expected

### Month Summary
Shows contextual stats for the month:
- Emerald: total received (matched plans only)
- Neutral: pending count
- Red: missed count

### Smart Match Pre-selection
`IncomeTimeline` tracks `preSelectedTxId` state. When a card's "Suggested Match" button is clicked, `handleMatchClick(plan, txId)` sets both `matchingPlan` and `preSelectedTxId`, which is forwarded to `MatchIncomeDialog`.

---

## Income Plan Card — `IncomePlanCard`

**File:** `src/components/wealth/income-plan-card.tsx`

### Status Model

| Status | Icon | Color | Notes |
|---|---|---|---|
| `planned` | `Clock` | Muted/neutral | Default state |
| `matched` | `CircleDashed` | Sky blue | Transaction linked |
| `distributed` | `PartyPopper` | Emerald | Derived: matched + checklist complete |
| `missed` | `AlertTriangle` | Red/destructive | Manually set |

`distributed` is derived — not stored in DB.

### Main Row
- Status dot (animated bounce when distributed)
- Plan label, status badge, recurrence badge (hidden if `once`)
- Expected date, received date (if differs), amount diff vs expected
- Display amount (`actual_amount` if present, else `expected_amount`); strikethrough of expected when diff exists
- **Suggested Match button** (planned plans only — see below)
- 3-dot action menu

### Suggested Match Button
For `planned` plans, `getSuggestedMatches` is queried (14-day window). If a result has `amountDiff / expected_amount < 0.05` and is not already matched, a `Sparkles` button labelled "Suggested Match" appears in the action row. Clicking it calls `onMatchClick(plan, tx._id)`, opening `MatchIncomeDialog` with that transaction pre-selected.

### 3-Dot Action Menu (context-sensitive)

**Planned:**
- Match to transaction → `MatchIncomeDialog`
- Edit plan → `IncomeFormDialog`
- **Mark as missed** — requires `window.confirm` before executing (destructive: deletes allocations)

**Matched:**
- Unmatch transaction → `unmatch` + `runAllocations`
- Edit plan

**Missed:**
- Mark as planned

**Always:**
- **Delete plan** — requires `window.confirm` before executing (permanent)

### Progress Bar
- Shown only when allocations exist
- Segmented bar: one segment per allocation, colored from `allocColors` palette
- Forecast allocations rendered at 50% opacity
- Click to toggle allocation detail panel (animated grid expand)
- Shows: "{X} of {Y} allocated" + amber "{Z} unallocated" + chevron

### Allocation Detail Panel (expandable)

| Plan Status | Panel Content |
|---|---|
| `planned` | `EditableAllocationRows` |
| `matched` | `DistributionChecklist` |
| `missed` | Nothing |
| No allocations | "No allocations yet" + "Run allocations" button |

---

## Editable Allocation Rows (Planned plans)

**File:** `src/components/wealth/income-plan-card.tsx` (inline component)

- Per row: color dot, account name (goal name prepended if linked), category label, amount input, delete button (hover-reveal)
- Amount input: saves on `blur` only if changed → `updateAllocationAmount`
- Delete: `deleteAllocationRecord`
- Footer:
  - "Add" dropdown: accounts not already in list, shows goal emoji+name if linked; adds with `amount: 0`, category `savings`
  - "Reset to rules" → `runAllocationsForPlan`

---

## Distribution Checklist (Matched plans)

**File:** `src/components/wealth/distribution-checklist.tsx`

- Header: `{completed}/{total} distributed` + optional amber "extra" amount + "Add" account dropdown
- Completion banner (emerald, `PartyPopper`) when all items done

### Per Allocation Row
- Toggle complete button (circle → filled check with bounce animation)
  - Mark complete: `markAllocationComplete`
  - Unmark: removes all matched transactions + `unmarkAllocationComplete`
- Color dot, display name (goal + account), category label
- Amount display:
  - Partial: `matchedAmount / plannedAmount` in amber
  - Complete with diff: actual in emerald + strikethrough planned
  - Click to edit inline (`EditableAmount`): Enter/Escape/blur to commit
- Hover-reveal `Link2` → `AllocationMatchDialog` (match this item to a specific tx)
- Hover-reveal `Trash2` → delete record

### Matched Transactions Section
Shown below a separator if any allocation has matches:
- Per match: description, account + date, amount, X button to unmatch

---

## Unmatched Income Modal — `UnmatchedIncomeModal`

**File:** `src/app/income/page.tsx` (inline component)

- Rendered only when `userId` exists; queries skipped when closed (`"skip"` pattern)
- `sm:max-w-md` dialog with amber gradient header
- Summary: amber badge (count), emerald total
- **Two tabs:** "Unmatched" and "Recently Matched" (tab switcher in header)

### Unmatched Tab
- Account filter Select (re-queries with `accountId` when changed)
- Transaction list with **pagination** (`PAGE_SIZE = 20`; "Show N more (K remaining)" button — no hard cap)
- Per row: amount, description, date, account badge
- Suggestion: finds planned plans within 14 days and <20% amount diff; shows plan label with `ArrowRight`
- Hover-reveal "Match" with `Link2` (suggestion exists) or `DollarSign` (no suggestion)
- Click → closes modal, opens `MatchTransactionDialog`
- Empty state: "No unmatched income found."

### Recently Matched Tab
- Lists last 20 income plans with `status === "matched"`, sorted by `date_received` descending
- Per row: amount, plan label, received date, **Undo** button
- Undo: `window.confirm` → `unmatchIncomePlan` + `runAllocationsForPlan`
- Empty state: "No recently matched income."

---

## Match Transaction → Plan Dialog — `MatchTransactionDialog`

**File:** `src/components/wealth/match-transaction-dialog.tsx`

- Entry point: Unmatched Income Modal (transaction-first flow)
- Shows selected transaction summary card
- Loads plans via `getPlansForTransaction` (**14-day window**)
- Plan list: label, date, recurrence, days apart, expected amount, amount diff
- Selection: `border-primary bg-primary/5`
- On confirm: `matchIncomePlan` → `runAllocationsForPlan` → close + clear state

---

## Match Plan → Transaction Dialog — `MatchIncomeDialog`

**File:** `src/components/wealth/match-income-dialog.tsx`

- Entry point: plan card 3-dot menu or "Suggested Match" button (plan-first flow)
- Accepts optional `preSelectedTxId?: Id<"transactions">` — when set, the matching transaction is auto-selected via `useEffect` on open
- Description shows plan label, expected amount/date
- Loads suggestions via `getSuggestedMatches` (**14-day window**)
- Already-matched transactions: 50% opacity, disabled, "Already matched" label
- On confirm: same mutation chain as above

---

## Income Form Dialog — `IncomeFormDialog`

**File:** `src/components/wealth/income-form-dialog.tsx`

Dual-mode: Add and Edit.

| Field | Type | Default |
|---|---|---|
| Label | Text | `""` |
| Expected Date | `date` | Today |
| Expected Amount | `number` (min 0, step 100) | `""` |
| Recurrence | Select | `monthly` |
| Notes | Textarea (optional, 3 rows) | `""` |

**Recurrence options:** Once, Weekly, Bi-weekly, Monthly, Quarterly, Annually

- Form state resets via `useEffect` on `open` / `plan` changes (previously used `useMemo` incorrectly for side effects)
- **Validation:** Label, date, and amount (> 0) are required. Invalid fields show a red border + inline error message. Errors clear per-field on change.
- Edit mode hint shown for planned plans: "Saving will re-run allocation rules with the updated amount."
- Create: `createIncomePlan` → `runAllocationsForPlan` → close
- Edit: `updateIncomePlan` → `runAllocationsForPlan` (planned only) → close
- Button label: "Create & Allocate" | "Save Changes"

> **NOTE (Goal Withdrawal):** `IncomeFormDialog` must not be used for Goal Withdrawals. A TODO comment is present at the top of the file. Goal withdrawals must be handled via a dedicated Goal UI mutation, completely decoupled from the `income_plans` table.

---

## Data Model — `IncomePlan`

**File:** `src/components/wealth/income-shared.ts`

```ts
{
  _id: Id<"income_plans">
  userId: Id<"users">
  label: string
  expected_date: string       // YYYY-MM-DD
  expected_amount: number
  actual_amount?: number      // set when matched
  status: "planned" | "matched" | "missed"
  recurrence: string
  notes?: string
  matched_transaction_id?: Id<"transactions">
  date_received?: string
}
```

---

## Data Flow

```
Page load
  └── useUnmatchedIncomeCount  → always live, drives button badge

Timeline tab
  └── listIncomePlans          → grouped by month
      └── IncomePlanCard
          ├── getAllocationsForPlan
          ├── getDistributionChecklist  (matched plans only)
          └── getSuggestedMatches       (planned plans only — for smart match button)

UnmatchedIncomeModal (when open)
  ├── getUnallocatedTransactions  (filtered by account, limit 200)
  ├── getGoalAccounts
  └── listIncomePlans             (for suggestion matching + recently matched tab)

MatchTransactionDialog (when open)
  └── getPlansForTransaction      (14-day window)

MatchIncomeDialog (when open)
  └── getSuggestedMatches         (14-day window)
```

---

## Known Issues & Gaps (Remaining)

### UX Gaps
- No success toast after matching
- No bulk-match or bulk-dismiss for unmatched transactions
- Missed plans cannot be matched directly — must first "Mark as planned"
- No date range filter or search on the Timeline
- Recurrence field is informational only — does not auto-generate future plans
- Unmatch + re-run allocations overwrites manually edited allocation amounts without warning

### Accessibility
- Progress bar toggle button missing `aria-expanded` / `aria-controls`
- Hover-reveal "Match" text not triggered by keyboard focus
- `EditableAmount` mode switch has no `aria-live` announcement
- Account filter Select missing `aria-label`

---

## Changelog

### 2026-04-13
- **[Step 1]** Unified matching date window to **14 days** in both `getSuggestedMatches` and `getPlansForTransaction` Convex queries; updated UI text in `MatchTransactionDialog` ("30d" → "14d") and `MatchIncomeDialog` ("7d" → "14d").
- **[Step 2]** `IncomePlanCard` now queries `getSuggestedMatches` for planned plans and surfaces a "Suggested Match" (`Sparkles`) button when a transaction within 14 days has <5% amount variance. Clicking pre-selects that transaction in `MatchIncomeDialog` via a new `preSelectedTxId` prop (auto-selected via `useEffect`).
- **[Step 3]** `UnmatchedIncomeModal`: fixed toggle bug (button now only opens, never closes the modal); added "Recently Matched" tab (last 20 matched plans, sortable by `date_received`, with Undo action); removed 15-item hard cap and replaced with "Show more" pagination (`PAGE_SIZE = 20`).
- **[Step 4]** `IncomeFormDialog`: replaced `useMemo` side-effect with proper `useEffect` for form reset; added per-field validation (label, date, amount) with red border + inline error messages, clearing on change; state now fully resets on dialog open. `IncomePlanCard`: `markMissed` and `deletePlan` now require `window.confirm` before executing.
- **[Step 5]** Added `TODO` comment in `IncomeFormDialog` prohibiting use of `income_plans` for Goal Withdrawals; no withdrawal-specific UI text was found in income components.
