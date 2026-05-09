# Saldo Cashflow Engine — Implementation Specification
**Version:** 1.0  
**Status:** Authoritative implementation reference  
**Audience:** Claude Code, Saldo webapp contributors  
**Location in repo:** `/docs/cashflow-engine.md`

---

## 0. Purpose & Scope

This document specifies the **Saldo Cashflow Engine** — the server-side planning layer that transforms raw transaction history into forward-looking financial intelligence. It is the production successor to the standalone HTML playground and is the authoritative source of truth for all engine behavior, data models, and UI integration contracts.

The engine powers:
- The **Dashboard** (Command Center, Affordability card, Money Flow, Spending Rhythm)
- The **Bridge Planner** tab
- The **Paycheck Distribution** tab
- The **Goals** tab
- The **Dashboard Configuration** modal (Goal Links & Rules, Flow Mapping)

It integrates with the existing Saldo Convex backend (schema.ts), the Categories page, and the Goals system already in the codebase.

---

## 1. Core Mental Model: The Unified Timeline

The engine treats every financial event — past actuals and future plans — as a single ordered sequence of `LedgerEvent` objects. The only structural difference between a past event and a future one is where the "today cursor" (`T`) falls relative to the event's date.

```
Past ←——————————[T: today]——————————→ Future
  [cleared txns]                [planned income, recurring bills, goal transfers]
```

**Key invariants:**
1. The Safe-to-Spend (STS) calculation always reads from the same timeline regardless of time resolution (daily/weekly/monthly/yearly).
2. Account balances are derived from events, never stored as mutable state (except `starting_balance` anchors).
3. The engine never runs in the UI. The UI only consumes pre-computed `EngineSnapshot` objects served by Convex queries.

---

## 2. Architecture: Four Engines + One Projection Layer

### 2.1 Ledger Engine
Manages the unified event timeline. Every event has a type, date, amount, and source.

**Event types:**
| Type | Direction | Source |
|------|-----------|--------|
| `income_actual` | inbound | Cleared transaction (import) |
| `income_planned` | inbound | `income_plans` table |
| `expense_actual` | outbound | Cleared transaction (import) |
| `expense_recurring` | outbound | Allocation rule / recurring pattern |
| `expense_onetime` | outbound | User-entered soft reservation |
| `goal_transfer_actual` | outbound | `goal_contributions` with `source: "import"` |
| `goal_transfer_planned` | outbound | `allocation_rules` with `category: "savings"` or `"investing"` |
| `account_transfer` | neutral | Ignored transfer pairs (`ignored_transfer_pairs`) |

**Implementation note:** The Ledger Engine is a pure query over existing Convex tables. No new table is required. Events are assembled at query time by joining `transactions`, `income_plans`, `allocation_rules`, and `goal_contributions`.

---

### 2.2 Account Classification Layer *(gap filled from audit)*

Before any STS math runs, each account is classified. This classification determines whether balances enter the safe pool.

**Account types (extend `accounts.type` field):**

| Type value | STS contribution | Description |
|------------|-----------------|-------------|
| `operating` | ✅ Full | Primary checking — income lands here, expenses leave here |
| `goal_reserve` | ❌ None | Savings accounts mapped to a Goal (e.g., 360 Savings ...0244 → Emergency Fund) |
| `credit_liability` | ❌ Subtract | Credit cards — balance is a liability, not an asset |
| `investment` | ❌ None | Roth IRA, brokerage — illiquid or restricted |
| `secondary_operating` | ✅ Partial | Secondary checking used for specific purposes (configurable) |
| `buffer` | ✅ Optional | Savings not linked to a goal — user can opt in to STS inclusion |

**Convex schema change required:**

The existing `accounts.type` field (currently stores e.g. `"Checking"`, `"Savings"`, `"Credit"`) needs to be migrated to these semantic types, OR a parallel field `stsClassification` can be added without a migration:

```typescript
// In accounts table, add:
stsClassification: v.optional(v.string()), 
// "operating" | "goal_reserve" | "credit_liability" | "investment" | "secondary_operating" | "buffer"
```

**STS-eligible balance formula:**
```
STS_Capital = Σ(balance of operating accounts)
            + Σ(balance of secondary_operating accounts × inclusion_ratio)
            - Σ(balance of credit_liability accounts)  // only outstanding balance, not limit
            + Σ(balance of buffer accounts where user has opted in)
```

Goal reserve and investment accounts are **read by the Waterfall Router** for goal progress tracking but never enter the STS pool.

---

### 2.3 Waterfall Router

Intercepts planned income events before they reach the daily spending pool. Execution order is strict and non-negotiable:

```
Gross Income Event
       │
       ▼
1. COMMITMENT GOALS (hard deadlines, tax implications)
   └─ Roth IRA, HSA, 401k (fixed monthly amounts)
       │
       ▼
2. FIXED OBLIGATIONS (must-pay, date-certain)
   └─ Rent, insurance, phone, subscriptions
      (prorated to paycheck period, not calendar month)
       │
       ▼
3. SOFT RESERVATIONS (known one-times)
   └─ User-entered: "Pay Dallas $100 on the 15th"
       │
       ▼
4. ACCUMULATION GOALS (targets with no hard deadline)
   └─ Emergency fund, vacation, etc.
   └─ Applied as % of remaining disposable
       │
       ▼
5. SAFE POOL ← what flows to daily STS
```

**Why Commitment Goals come first:** A missed Roth IRA contribution is unrecoverable after Dec 31. A month without emergency fund progress can be caught up. The Waterfall enforces this asymmetry structurally.

**Paycheck Period (not calendar month):**

The atomic time unit for the Waterfall is the **paycheck period** — the interval from the day after the last confirmed income event to the expected date of the next income event.

```typescript
type PaycheckPeriod = {
  periodStart: string;       // ISO date: day after last paycheck cleared
  periodEnd: string;         // ISO date: expected next paycheck date
  daysRemaining: number;     // from today to periodEnd
  totalDays: number;         // full period length
  expectedIncome: number;    // from matched income_plan
  fixedObligations: number;  // sum of recurring expenses in period
  goalAllocations: number;   // sum of planned goal transfers in period
  safePool: number;          // expectedIncome - fixedObligations - goalAllocations
}
```

This is derived from `income_plans` (for the expected paycheck) and `allocation_rules` (for fixed obligations). The current month-based approach in the playground is a fallback for when no `income_plans` exist.

---

### 2.4 Safe-to-Spend (STS) Algorithm

**Master Formula:**

```
STS_SafePool = STS_Capital
             + Σ(planned income within current paycheck period)
             - Σ(fixed obligations within current paycheck period, not yet cleared)
             - Σ(soft reservations within current paycheck period)
             - Σ(goal allocations for current period)
             - Σ(actual flexible spend already cleared this period)
```

**Time-resolution math:**

```
DailyCap   = STS_SafePool ÷ daysRemaining
WeeklyCap  = DailyCap × 7
MonthlyCap = DailyCap × daysInCurrentMonth
```

**Edge case handling (audit gap filled):**

| Situation | Behavior |
|-----------|----------|
| Payday itself (`daysRemaining = periodLength`) | Cap resets to full period pool ÷ full period length. UI shows "Paycheck received" state. |
| Day before payday (`daysRemaining = 1`) | Cap = remaining pool ÷ 1. If pool is near zero, show "Almost payday" warning state, not just a low number. |
| Pool goes negative | DailyCap = 0. UI shows deficit amount explicitly: "You're $X over budget for this period." |
| No income_plan exists | Fall back to monthly mode using `MONTH_DATA`-style aggregation from transaction history. |

---

### 2.5 Aggregation Engine (Projection Layer)

The engine does not run in React components. All math runs in Convex queries/actions and returns a typed `EngineSnapshot` consumed by the UI.

```typescript
type EngineSnapshot = {
  // Identity
  generatedAt: number;           // unix ms
  periodLabel: string;           // "May 2026", "Week 1 · May 1–7", etc.
  granularity: "daily" | "weekly" | "monthly" | "yearly";

  // STS
  safePool: number;
  dailyCap: number;
  weeklyCap: number;
  daysRemaining: number;
  paydayDate: string | null;

  // Income
  totalIncome: number;
  salaryIncome: number;
  otherIncome: number;
  nextPaycheck: number | null;

  // Spend
  totalExpenses: number;
  fundamentalExpenses: number;
  flexibleExpenses: number;
  goalTransfers: number;
  unallocated: number;

  // Goals (see §4)
  goals: GoalSnapshot[];

  // Accounts (see §3)
  accounts: AccountSnapshot[];

  // Flow map (for Sankey + Waterfall UI)
  flowRows: FlowRow[];

  // Variance (see §5)
  variance: VarianceReport;

  // Period cashflow score (0–99)
  cashflowScore: number;
}
```

**Convex query location:** `convex/engine/snapshot.ts`  
This query is the single source of truth for the Dashboard. All Dashboard components receive props derived from this snapshot — nothing computes independently.

---

## 3. Account Classification — Full Spec

### 3.1 UI: Where users set classifications

The Account Classification is set on the **Accounts page** (or in an account detail drawer). Each account shows a "Role" selector:

- Operating (daily spending)
- Goal Reserve (linked to a goal)
- Credit (liability)
- Investment (hands-off)
- Buffer (optional STS inclusion)

When a user links an account to a goal (e.g., 360 Savings ...0244 → Emergency Fund goal), the classification **automatically becomes** `goal_reserve`. The link is stored via the existing `goals.linked_account_id` field.

### 3.2 AccountSnapshot (output of engine)

```typescript
type AccountSnapshot = {
  accountId: string;
  name: string;
  classification: string;
  currentBalance: number;
  stsEligible: boolean;
  periodOutflow: number;
  periodInflow: number;
  lastUpdated: string;
  linkedGoalId?: string;
  balanceSeries: { label: string; value: number }[];  // for sparklines
}
```

### 3.3 Credit liability handling

Outstanding credit card balances reduce net liquid position but do **not** reduce `STS_Capital` on a daily basis — the daily cap already accounts for spending. Instead:

- The **Net Liquid Position** displayed in Goals tab = liquid assets − credit balances
- The **Affordability card** shows credit exposure separately
- Interest charges (`Interest & Fees` category) post as actual flexible expenses and reduce the safe pool when cleared

---

## 4. Goal Engine — Two Subtypes

### 4.1 Commitment Goals

Hard deadline, regulatory or tax implications, non-recoverable if missed.

```typescript
type CommitmentGoal = {
  goalType: "commitment";
  hardDeadline: string;          // ISO date — Dec 31 for Roth IRA
  annualLimit: number;           // $7,000 for 2026 Roth
  currentContributed: number;    // from goal_contributions
  requiredMonthlyToMeetDeadline: number;  // recomputed each month
  onTrack: boolean;
  missedMonths: string[];        // months where contribution was $0
}
```

**Waterfall position:** Step 1 (highest priority)  
**Schema:** Uses existing `goals` table with `due_date` set to the hard deadline. A new field `goal_subtype: "commitment" | "accumulation"` should be added.

### 4.2 Accumulation Goals

Soft target, no hard deadline, recoverable.

```typescript
type AccumulationGoal = {
  goalType: "accumulation";
  targetAmount: number;
  currentAmount: number;         // from linked_account_id balance OR manual tracking
  monthlyContribution: number;   // from allocation_rules
  projectedCompletionDate: string;
  progressPct: number;
}
```

**Waterfall position:** Step 4 (after fixed obligations and soft reservations)

### 4.3 GoalSnapshot (output of engine)

```typescript
type GoalSnapshot = {
  goalId: string;
  name: string;
  goalSubtype: "commitment" | "accumulation";
  color: string;
  emoji: string;
  currentAmount: number;
  targetAmount: number;
  progressPct: number;
  periodContribution: number;    // what was added in this period
  monthlyTarget: number;
  onTrack: boolean;
  projectedDate: string | null;
  urgencyNote: string | null;    // e.g., "Missed April — need $694/mo to max out"
}
```

### 4.4 Schema changes for Goals

```typescript
// In goals table, add:
goal_subtype: v.optional(v.string()),  // "commitment" | "accumulation"
hard_deadline: v.optional(v.string()), // ISO date, for commitment goals
annual_limit: v.optional(v.number()),  // for contribution-limited goals (Roth)
```

---

## 5. Variance Tracker *(new — from audit recommendation)*

Every period, the engine compares actual spend against the STS plan and produces a `VarianceReport`. This closes the feedback loop between planning and reality.

```typescript
type VarianceReport = {
  periodLabel: string;
  overallVariance: number;       // actual spend − planned spend (positive = overspent)
  overallVariancePct: number;

  categoryVariances: {
    categoryName: string;
    flowType: "fundamental" | "flexible" | "wealth";
    planned: number;
    actual: number;
    variance: number;
    variancePct: number;
    signal: "on_track" | "watch" | "over" | "under";
  }[];

  habitDensity: {
    activeDays: number;
    totalTransactions: number;
    avgDailySpend: number;
    historicalAvgDailySpend: number;  // rolling 3-month average
    driftSignal: "nominal" | "elevated" | "high";
  };

  alerts: {
    severity: "info" | "warning" | "critical";
    message: string;
    category?: string;
  }[];
}
```

**Convex query location:** `convex/engine/variance.ts`  
The Variance Tracker feeds the **Actionable Insights** section of the Cashflow Command card and the **Spending Rhythm** heatmap color intensities.

---

## 6. Soft Reservations *(new — gap from audit)*

Soft Reservations are one-time future expenses the user knows about but that don't follow a recurrence rule. They reduce the STS Safe Pool immediately upon entry.

**Example:** "I need to pay Dallas $100 on the 15th."

### 6.1 Schema

Soft Reservations are stored as `income_plans`-style records but for expenses. Rather than a new table, they extend the existing concept by adding a new table:

```typescript
// NEW TABLE: soft_reservations
soft_reservations: defineTable({
  userId: v.id("users"),
  label: v.string(),              // "Pay Dallas", "Amazon order arriving"
  amount: v.number(),             // positive number (always an expense)
  expectedDate: v.string(),       // ISO date
  status: v.string(),             // "pending" | "cleared" | "cancelled"
  matchedTransactionId: v.optional(v.id("transactions")),
  note: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_date", ["expectedDate"]),
```

### 6.2 STS impact

When a soft reservation with `status: "pending"` exists within the current paycheck period, its `amount` is subtracted from `STS_SafePool`. The effect is distributed across remaining days:

```
DailyCap_adjusted = (STS_SafePool − Σ pending_soft_reservations) ÷ daysRemaining
```

When the matching transaction clears and is linked via `matchedTransactionId`, the reservation's impact is removed (the actual expense now reduces the pool directly as `expense_actual`).

### 6.3 UI entry point

The **Bridge Planner** tab already has the UX pattern for this. A "Add a planned expense" button adds a soft reservation. It also surfaces in the **Affordability card** under "Pacing & next hits."

---

## 7. Dashboard Integration Map

The following table maps each Dashboard UI section to the Saldo codebase page/feature it connects to when the user takes action.

| Dashboard component | Config modal section | Navigates to / connects to |
|--------------------|--------------------|---------------------------|
| Goal Progress rail (Spending Rhythm) | Goal Links & Rules | `/goals` page — existing Goals management |
| Money Flow Sankey (flow types) | Flow Mapping | `/categories` page — flow classification (fundamental/flexible/wealth) per category |
| Waterfall (fixed obligations) | Goal Links & Rules → allocation rules | `/settings/allocations` or inline allocation rule editor |
| Affordability card → Account rails | — | `/accounts` page — account classification setter |
| Cashflow Command → income | — | `/income` or `income_plans` management UI |
| Bridge Planner | — | Inline (no separate page needed) — writes `soft_reservations` |
| Paycheck Distribution | — | Inline + syncs with `allocation_rules` |
| Subscriptions inventory | Flow Mapping | `/categories` — Software & Tools category detail |

### 7.1 Dashboard Configuration modal (⚙ button in Time Toolbar)

The modal has two sections:

**Goal Links & Rules**  
- Reads from: `goals`, `allocation_rules`  
- Writes to: `goals` (target, monthly_contribution), `allocation_rules` (value, priority, active)  
- Convex mutations: `goals:update`, `allocation_rules:upsert`  
- This is the inline "quick edit" surface. Deep edits go to `/goals`.

**Flow Mapping**  
- Reads from: `categories`, `category_groups`  
- Writes to: a new `stsFlowType` field on `categories` (see §8)  
- Convex mutations: `categories:setFlowType`  
- Changes immediately affect the Sankey, Waterfall, and category ledger — this is the live reclassification surface. The link "Manage all categories →" goes to `/categories`.

---

## 8. Categories Page Integration

### 8.1 Flow type on categories

The playground's "flow mapping" (fundamental / flexible / wealth) needs to be persisted per user per category. This replaces the in-memory `flowOverrides` localStorage approach.

**Schema change:**

```typescript
// In categories table, add:
stsFlowType: v.optional(v.string()),  
// "fundamental" | "flexible" | "wealth" | null (null = unclassified, defaults to "flexible")
```

**Default classification logic** (applied when `stsFlowType` is null):

| Category name contains | Default flow type |
|------------------------|------------------|
| Rent, Insurance, Phone, Fuel, Transportation | `fundamental` |
| Roth IRA, HSA, investment-type | `wealth` |
| Everything else | `flexible` |

### 8.2 Category groups → Sankey groups

The existing `category_groups` table maps directly to the Sankey's "Groups" column (level 2 of the 4-column diagram). No schema change needed.

The engine assembles Sankey rows as:

```
Level 0: Source (total income)
Level 1: Flow type (fundamental / flexible / wealth)
Level 2: Category group (from category_groups.name)
Level 3: Category (from categories.name)
```

### 8.3 Flow type mutation

```typescript
// convex/categories.ts — add mutation:
export const setFlowType = mutation({
  args: { categoryId: v.id("categories"), flowType: v.string() },
  handler: async (ctx, { categoryId, flowType }) => {
    await ctx.db.patch(categoryId, { stsFlowType: flowType });
  }
});
```

---

## 9. Income Plans Integration

### 9.1 Paycheck period derivation

The engine derives the current paycheck period by:

1. Finding the most recent `income_plans` record with `status: "matched"` (a confirmed paycheck).
2. Finding the next `income_plans` record with `status: "planned"`.
3. Setting `periodStart = dateReceived of matched + 1 day`, `periodEnd = expectedDate of planned`.

If no `income_plans` exist, fall back to: `periodStart = first day of current month`, `periodEnd = last day of current month`.

### 9.2 Recurrence pattern

The existing `income_plans.recurrence` field handles `"biweekly"`. The engine should auto-generate future `income_plans` records up to 3 periods ahead when a user confirms their pay schedule.

```typescript
// convex/income_plans.ts — add action:
export const generateFuturePaychecks = action({
  args: { basePlanId: v.id("income_plans"), periodsAhead: v.number() },
  // Creates N future income_plan records with status: "planned"
});
```

---

## 10. Convex Engine Query Structure

### 10.1 File layout

```
convex/
  engine/
    snapshot.ts       ← Main EngineSnapshot query (§2.5)
    variance.ts       ← VarianceReport query (§5)
    waterfall.ts      ← Waterfall Router logic (§2.3)
    sts.ts            ← STS formula (§2.4)
    periods.ts        ← Paycheck period derivation (§9.1)
    ledger.ts         ← LedgerEvent assembly (§2.1)
    goals.ts          ← GoalSnapshot builder (§4.3)
    accounts.ts       ← AccountSnapshot builder (§3.2)
```

### 10.2 Primary query signature

```typescript
// convex/engine/snapshot.ts
export const getSnapshot = query({
  args: {
    userId: v.id("users"),
    granularity: v.string(),        // "daily" | "weekly" | "monthly" | "yearly"
    periodOffset: v.number(),       // 0 = current, -1 = previous, etc.
    referenceDate: v.optional(v.string()),  // ISO date, defaults to today
  },
  returns: v.any(), // typed as EngineSnapshot in TypeScript
  handler: async (ctx, args) => {
    // 1. Classify accounts
    // 2. Derive paycheck period
    // 3. Assemble ledger events
    // 4. Run waterfall
    // 5. Compute STS
    // 6. Build goal snapshots
    // 7. Build variance report
    // 8. Assemble and return EngineSnapshot
  }
});
```

### 10.3 Reactivity

Because the snapshot is a Convex `query` (not an `action`), it is **reactive** — any change to `transactions`, `goals`, `income_plans`, `allocation_rules`, or `soft_reservations` automatically invalidates and re-computes the snapshot for subscribed clients. This replaces the `renderMonth()` re-render pattern from the playground.

---

## 11. Schema Changes Summary

The following additions to `convex/schema.ts` are required. All are additive (no breaking changes to existing tables).

```typescript
// accounts — add field:
stsClassification: v.optional(v.string()),

// categories — add field:
stsFlowType: v.optional(v.string()),

// goals — add fields:
goal_subtype: v.optional(v.string()),    // "commitment" | "accumulation"
hard_deadline: v.optional(v.string()),
annual_limit: v.optional(v.number()),

// NEW TABLE:
soft_reservations: defineTable({
  userId: v.id("users"),
  label: v.string(),
  amount: v.number(),
  expectedDate: v.string(),
  status: v.string(),
  matchedTransactionId: v.optional(v.id("transactions")),
  note: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_date", ["expectedDate"]),
```

---

## 12. UI Component → Engine Data Contract

Each Dashboard card reads exclusively from the `EngineSnapshot`. No card computes its own math.

| Card | EngineSnapshot fields consumed |
|------|-------------------------------|
| Apollo Command HUD | `cashflowScore`, `dailyCap`, `safePool`, `paydayDate`, `goals[].onTrack` |
| Module Focus Nav (4 cards) | `variance.overallVariance`, `cashflowScore`, `dailyCap`, `variance.habitDensity.activeDays` |
| Strategic Briefing | `variance.alerts`, `safePool`, `goals[]` |
| Money Flow (Sankey) | `flowRows`, `totalIncome` |
| Waterfall | `flowRows` (ordered), `safePool` |
| Cashflow Command | All `totalIncome`, `totalExpenses`, `cashflowScore`, `variance.alerts`, next paycheck |
| Affordability | `dailyCap`, `weeklyCap`, `safePool`, `accounts[]` |
| Spending Rhythm (heatmap) | Derived from `transactions` per day + `goals[].periodContribution` |
| Goal Progress rail | `goals[]` (all fields) |

---

## 13. Payday UX States

The engine emits a `paydayState` field in the snapshot to drive special UI treatment:

```typescript
type PaydayState = 
  | "normal"           // Regular day within period
  | "payday_today"     // Income event cleared today
  | "payday_imminent"  // 1–2 days until expected paycheck
  | "period_start"     // First day of new paycheck period
  | "overdue_income"   // Expected paycheck not arrived (status: "missed" on income_plan)
  | "bridge_mode"      // No active income_plan, operating from historical average
```

The Affordability card changes its visual state based on `paydayState`:
- `payday_today` → Green banner, "Paycheck received — pool reset"
- `payday_imminent` → Amber warning, "Payday in X days — hold spending"
- `overdue_income` → Red banner, bridge mode activated

---

## 14. Implementation Order

Recommended build sequence for Claude Code:

1. **Schema migration** — Add new fields to existing tables, add `soft_reservations` table.
2. **`convex/engine/accounts.ts`** — Account classification layer. Needed by everything.
3. **`convex/engine/periods.ts`** — Paycheck period derivation from `income_plans`.
4. **`convex/engine/ledger.ts`** — LedgerEvent assembly from all source tables.
5. **`convex/engine/waterfall.ts`** — Waterfall Router (depends on ledger + periods).
6. **`convex/engine/sts.ts`** — STS formula (depends on waterfall + accounts).
7. **`convex/engine/goals.ts`** — GoalSnapshot builder (commitment vs accumulation).
8. **`convex/engine/variance.ts`** — VarianceReport (depends on ledger + sts).
9. **`convex/engine/snapshot.ts`** — Full EngineSnapshot assembler (orchestrates all above).
10. **Dashboard refactor** — Replace `renderMonth()` / `buildCommandCenter()` with Convex `useQuery(api.engine.snapshot.getSnapshot, {...})`.
11. **Config modal wiring** — Goal Links & Rules → `goals`/`allocation_rules` mutations. Flow Mapping → `categories:setFlowType`.
12. **Soft Reservations UI** — Add entry point in Bridge Planner and Affordability card.
13. **Categories page** — Add flow type selector column/control.

---

## 15. Open Questions (resolve before implementation)

| # | Question | Default if not resolved |
|---|----------|------------------------|
| 1 | Should `soft_reservations` be user-editable in a dedicated list view or always accessed inline from the Affordability card / Bridge tab? | Inline only for MVP |
| 2 | For `secondary_operating` accounts, should the STS inclusion ratio be configurable per-account (e.g., "include 50% of buffer")? | Binary opt-in (100% or 0%) |
| 3 | Should the Variance Tracker generate push notifications via the existing Telegram integration when variance exceeds a threshold? | Yes — wire to `telegram_connections` via existing `actions` table |
| 4 | When the engine auto-generates future `income_plans` for a biweekly schedule, should it use the exact calendar pattern (every other Friday) or the user-specified `schedule_pattern.days`? | Calendar pattern based on last confirmed paycheck date |
| 5 | Does `goal_subtype: "commitment"` gate any special UI in the Goals tab (e.g., a deadline countdown badge), or is the distinction only internal to the engine? | Both — engine priority + UI deadline badge |

---

*End of specification. This document lives at `/docs/cashflow-engine.md` and should be updated whenever engine behavior changes.*