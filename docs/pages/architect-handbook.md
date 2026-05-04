# Saldo Wealth OS — Architect's Handbook
### Logic & Entity Specification v1.0

---

## Preface: The Conceptual Model

Saldo is not a budgeting app. It is a **cash-flow routing engine** layered on top of a transaction ledger. The core mental model is:

> **Income arrives → gets planned into allocation buckets → transfers to accounts → gets verified as "delivered".**

Spending is then measured against what was allocated, not against an abstract budget. "Safe to Spend" is a *real-time residual* of what was routed to your checking account minus what has already left it.

---

## Entity Index

1. [Users & Preferences](#1-users--preferences)
2. [Accounts](#2-accounts)
3. [Transactions](#3-transactions)
4. [Categories & Category Groups](#4-categories--category-groups)
5. [Category Rules (Routing Engine)](#5-category-rules-routing-engine)
6. [Income Plans](#6-income-plans)
7. [Allocation Rules](#7-allocation-rules)
8. [Allocation Records](#8-allocation-records)
9. [Goals](#9-goals)
10. [Goal Contributions](#10-goal-contributions)
11. [Goal Monthly Plans](#11-goal-monthly-plans)
12. [Imports & Import Sessions](#12-imports--import-sessions)
13. [Presets](#13-presets)
14. [Reimbursement Pairs](#14-reimbursement-pairs)
15. [Transfer Pairs](#15-transfer-pairs)
16. [Telegram / Chat Layer](#16-telegram--chat-layer)

---

## 1. Users & Preferences

### Detailed Definition
The `users` table is the authentication anchor — a thin shell around a Clerk external identity. `user_preferences` stores UI-state hints (e.g., last selected account). `users.previewIncome` is a scratch-pad field for previewing what a hypothetical income amount would allocate before a real income plan is created.

### Model Relationships
- `users` → (1:N) → `accounts`, `transactions`, `goals`, `income_plans`, `allocation_rules`, `categories`, `imports`, `category_rules`
- `users` → (1:1) → `user_preferences`, `chat_context`

### Lifecycle & States
```
CREATED (Clerk signup) → ACTIVE
```
No explicit deactivation state; managed by Clerk auth.

### Operational Logic
- All data is scoped per `userId`. No cross-user references exist.
- `previewIncome` is used exclusively to run `calculateAllocations` for preview display; it has no effect on real plans.

---

## 2. Accounts

### Detailed Definition
An `account` represents a real-world bank account (checking, savings, investment). It is the atomic location to which money is **routed**. Allocations target accounts, not categories. The balance field is a manual override — it is **not** computed from transactions.

### Model Relationships
- `accounts` → (1:N) → `transactions`
- `accounts` → (1:N) → `allocation_rules` (routing targets)
- `accounts` → (1:N) → `allocation_records` (verified destinations)
- `accounts` → (1:N) → `imports`
- `accounts` → (1:1, optional) → `goals` (via `linked_account_id`)

### Lifecycle & States
```
CREATED → ACTIVE → DELETED (cascades to imports; transactions orphaned)
```

### Operational Logic
- An account can be both the **source** (income lands here) and a **destination** (allocations route to it).
- When an account is the destination of an allocation rule with `scope = "refill"`, matching inflows auto-verify without waiting for a detected outflow from the income account.
- Deleting an account should be done carefully — it does not cascade-delete transactions.

---

## 3. Transactions

### Detailed Definition
The foundational unit of truth in Saldo. A transaction is a **signed monetary event** tied to an account and a point in time. **Negative amounts = money out. Positive amounts = money in.** The `transactionType` field provides semantic intent (`income`, `expense`, `transfer`, `deposit`, `withdrawal`) but the sign is the authoritative signal for math.

### Model Relationships
- `transactions` → (N:1) → `accounts`
- `transactions` → (N:1) → `categories`
- `transactions` → (N:1) → `category_rules` (via `appliedRuleId`)
- `transactions` → (N:1) → `imports` (via `importId`)
- `transactions` → (1:1, optional) → `allocation_records` (via `transfer_transaction_id`)
- `transactions` → (N:1) → `income_plans` (via `matched_transaction_id`)
- `transactions` → (N:1) → `goal_contributions` (via `transactionId`)
- `transactions` → (1:1, optional) → `reimbursement_pairs`

### Lifecycle & States

```
[IMPORT PATH]
  CSV Row → PARSED → VALIDATED → DEDUPLICATED
    ├── No duplicate → AUTO-CATEGORIZED → INSERTED
    └── Duplicate found → AWAITING_USER_REVIEW
          ├── skip → (discarded)
          ├── import → INSERTED (new)
          └── merge → EXISTING updated

[MANUAL PATH]
  User Input → AUTO-CATEGORIZED → INSERTED

[UPDATE PATH]
  INSERTED
    ├── User sets category → MANUALLY_CATEGORIZED (locked from rule engine)
    ├── User clears category → UNCATEGORIZED (lockout lifted)
    ├── Amount/Date changed → ALLOCATION_INVALIDATED (reserved records reset)
    └── Deleted → DELETED (allocation records reverted)
```

**Auto-Categorization Lock:**
- `isAutoCategorized = true` + no `updatedAt` → rule-engine owns it; future rule updates may overwrite.
- `updatedAt` is set + `isAutoCategorized` is missing/false → human owns it; rule engine **never** touches it.

### Operational Logic
- **Deduplication key:** `accountId : amount : normalizedDescription`
- **Transfer pairing:** Two transactions linked via a shared `transfer_pair_id` UUID. They must have opposing signs and belong to different accounts.
- **Allocation trigger:** Any positive transaction inserted in an account schedules `verifyAccountAllocations` asynchronously via `ctx.scheduler.runAfter(0, ...)`.
- **Reimbursement detection:** A transaction with `amount > 0` AND `transactionType = "expense"` (or its category's type = "expense") is treated as a reimbursement in dashboard math, reducing net spending.

---

## 4. Categories & Category Groups

### Detailed Definition
Categories are semantic **labels** for transactions. They enable spending analysis and are the "address" that category rules match against. Category groups are organizational containers (e.g., "Utilities," "Food") that aggregate categories for dashboard roll-ups.

### Model Relationships
- `category_groups` → (1:N) → `categories`
- `categories` → (1:N) → `transactions`
- `categories` → (1:N) → `category_rules`

### Lifecycle & States
```
CREATED → ACTIVE → DELETED
```
Deletion does not cascade to transactions — those become uncategorized.

### Operational Logic
- A category can carry a `transactionType` hint that propagates to transactions assigned to it.
- Dashboard spending aggregates at the `category_group` level.
- **Net spending per group** = `SUM(|tx.amount| WHERE tx is expense) - SUM(tx.amount WHERE tx is reimbursement)`, floored at 0.

---

## 5. Category Rules (Routing Engine)

### Detailed Definition
Category rules are the **auto-classification brain** of Saldo. They are pattern-match rules that inspect normalized transaction descriptions and assign a category. This is a passive, retroactive engine — it can be applied both at import time and retroactively across historical data.

### Model Relationships
- `category_rules` → (N:1) → `categories`
- `category_rules` → (1:N) → `transactions` (via `appliedRuleId`)

### Lifecycle & States
```
CREATED (active=true) → ACTIVE
                      → DISABLED (active=false, ignored by engine)
                      → DELETED (clears appliedRuleId from linked tx; preserves category)
```

### Operational Logic

**Normalization Pipeline (before matching):**
1. Strip noise prefixes (bank reference codes, etc.)
2. Remove inline dates
3. Remove trailing IDs / reference numbers
4. Lowercase and collapse whitespace

**Matching Algorithm:**
```
rules = SORT(active_rules, by priority DESC)
for rule in rules:
    if rule.pattern (lowercased) is substring of normalized_description:
        return { categoryId: rule.categoryId, ruleId: rule._id }
        break  // first match wins
```

**Retroactive Application (`applyRuleRetroactively`):**
- Processes transactions in chunks of 500.
- Skips any transaction with `updatedAt` set (human override lock).
- Overwrites previously auto-categorized transactions.

**Rule Suggestions:**
- Analyzes last ~500 manually-categorized transactions.
- Groups by `(normalizedDescription, categoryId)`.
- Suggests patterns appearing 3+ times that no existing rule covers.
- Returns up to 20 suggestions sorted by frequency.

---

## 6. Income Plans

### Detailed Definition
An `income_plan` is a **scheduled income event** — a projection of money expected to arrive. It is the entry point for the entire routing engine. When a real transaction matches a plan, the plan transitions from forecast to confirmed, and the allocation engine activates to route that income to destination accounts.

### Model Relationships
- `income_plans` → (1:N) → `allocation_records`
- `income_plans` → (1:N) → `goal_contributions`
- `income_plans` → (1:1, optional) → `transactions` (via `matched_transaction_id`)

### Lifecycle & States

```
PLANNED (forecast)
  ├── user matches transaction → MATCHED
  │     ├── passive verification completes → COMPLETED
  │     └── user unmatches → PLANNED
  └── user marks missed → MISSED

MATCHED → (recurrence != "once") → new PLANNED created for next period
```

### Operational Logic

**Matching (`matchIncomePlan`):**
1. Link transaction to plan (`matched_transaction_id`).
2. Set `actual_amount` and `date_received`.
3. Update all `allocation_records` for this plan:
   - Scale amounts if `actual_amount ≠ expected_amount`.
   - Set `is_forecast = false`.
   - Refill-scoped rules → `verification_status = "verified"` (auto-trusted).
   - Transfer-scoped rules → `verification_status = "reserved"` (await confirmation).
4. Auto-create goal contributions for any linked goals.
5. If recurrence is active, auto-generate next plan at next scheduled date.

**Recurrence Schedule Patterns:**
- Simple: `"weekly"`, `"biweekly"`, `"monthly"`, `"quarterly"`, `"annually"`.
- Complex: `schedule_pattern = { type: "monthly_dates", days: [5, 20] }` — fires on specific day-of-month dates.

**Unmatch:**
- Reverts plan to `"planned"`.
- Deletes auto-created goal contributions.
- Resets allocation records to `"pending"`.

---

## 7. Allocation Rules

### Detailed Definition
An `allocation_rule` defines **where a percentage or fixed dollar amount of income should go** — which account and under what category (savings, investing, spending, debt). Rules are evaluated in priority order against every income plan to generate allocation records.

### Model Relationships
- `allocation_rules` → (N:1) → `accounts` (destination)
- `allocation_rules` → (1:N) → `allocation_records`

### Lifecycle & States
```
CREATED (active=true) → ACTIVE → DISABLED (active=false) → DELETED
```

### Operational Logic

**Allocation Algorithm (`calculateAllocations`):**
```
remaining = income_amount
sorted_rules = SORT(active_rules, by priority ASC)

for i, rule in sorted_rules:
    if rule.ruleType == "percent":
        if (is_last_rule AND rule.value == 100):
            amount = remaining  // catch-all: take everything left
        else:
            amount = ROUND(income * rule.value / 100, 2 decimals)
    elif rule.ruleType == "fixed":
        amount = rule.value

    amount = MIN(amount, remaining)  // never over-allocate
    remaining -= amount
    output.append({ accountId, amount, category, rule_id })
```

**Scope Types:**
- `"refill"` — income account refills itself (e.g., keep checking account topped up). Auto-verified on match.
- `"transfer"` — money must be physically transferred to another account. Requires verified transfer transaction.

---

## 8. Allocation Records

### Detailed Definition
An `allocation_record` is the **per-income-plan instance** of an allocation rule. If rules are templates, records are the stamped executions. They track whether a specific dollar amount has actually moved from the income account to its destination account.

### Model Relationships
- `allocation_records` → (N:1) → `income_plans`
- `allocation_records` → (N:1) → `allocation_rules`
- `allocation_records` → (N:1) → `accounts` (destination)
- `allocation_records` → (1:1, optional) → `transactions` (via `transfer_transaction_id`)

### Lifecycle & States

```
PENDING (is_forecast=true)
  └── income plan matched → RESERVED (is_forecast=false)
        ├── matching transfer detected → VERIFIED
        └── transaction amount/date changed → RESERVED (reset from VERIFIED)

All records for a plan VERIFIED → income_plan → COMPLETED
```

### Operational Logic

**Passive Verification (`verifyAccountAllocations`):**

Triggered after any positive transaction is inserted into an account.

```
for each RESERVED record targeting this account:
    candidates = transactions WHERE:
        accountId = record.accountId AND
        amount > 0 AND
        |amount - record.amount| <= record.amount * 0.05 AND  // ±5% tolerance
        |date - anchor_date| <= 10 days

    if adaptive_outflow_check:
        // only require outflow proof from income account
        // if that account actually has outflows in the window
        outflows = transactions WHERE accountId = income_account AND date in window AND amount < 0
        if outflows exist:
            require matching outflow of record.amount (±5%, ±10 days)

    if match found:
        record.verification_status = "verified"
        record.transfer_transaction_id = matching_tx._id

check: if ALL records for this plan are "verified":
    plan.status = "completed"
```

**Safe-to-Spend Residual:**
```
totalPool = SUM(allocation_records.amount WHERE status IN ["verified","reserved","pending"])
netSpent = MAX(0, SUM(|tx.amount| WHERE tx is expense) - SUM(tx.amount WHERE tx is reimbursement))
safeToSpend = totalPool - netSpent
```

---

## 9. Goals

### Detailed Definition
A `goal` is a **named savings target** with a monetary value and optional due date. It is the savings dimension of Saldo — parallel to the spending/allocation dimension. Goals track how much money has been intentionally set aside toward a specific objective (emergency fund, vacation, down payment, etc.).

### Model Relationships
- `goals` → (1:N) → `goal_contributions`
- `goals` → (1:N) → `goal_monthly_plans`
- `goals` → (N:1, optional) → `accounts` (via `linked_account_id`)

### Lifecycle & States
```
ACTIVE (is_completed=false)
  └── SUM(contributions) >= total_amount → COMPLETED (is_completed=true)
        └── withdrawal reduces balance below target → ACTIVE again
ACTIVE/COMPLETED → DELETED (cascades contributions and monthly plans)
```

### Operational Logic

**Balance Calculation (always derived, never stored):**
```
current_amount = SUM(goal_contributions.amount WHERE goalId = goal._id)
```
Includes positive deposits and negative withdrawals. Displayed balance is floored at 0.

**Tracking Types:**
- `MANUAL`: User records contributions explicitly. This is the fully-implemented mode.
- `LINKED_ACCOUNT`: Balance mirrors a linked account's balance. Logic is prepared but not fully active.

**Completion Guard:**
```
on any contribution change:
    new_balance = SUM(contributions)
    goal.is_completed = (new_balance >= goal.total_amount)
```

**Overdraw Protection:**
```
on withdrawal:
    if withdrawal.amount > current_balance:
        REJECT with error "Insufficient funds"
```

**Contribution Cap:**
```
on deposit:
    remaining_to_goal = total_amount - current_amount
    actual_contribution = MIN(deposit_amount, remaining_to_goal)
```

---

## 10. Goal Contributions

### Detailed Definition
A `goal_contribution` is a **signed ledger entry** for a goal. It records the amount, when, why, and from what source money moved into or out of a goal. It is the transaction layer of the goals subsystem.

### Model Relationships
- `goal_contributions` → (N:1) → `goals`
- `goal_contributions` → (N:1, optional) → `transactions`
- `goal_contributions` → (N:1, optional) → `income_plans`

### Lifecycle & States
```
CREATED → ACTIVE → DELETED (goal balance recomputed, completion re-evaluated)
```

### Operational Logic

**Sources:**

| source | Trigger |
|---|---|
| `manual_ui` | User enters directly via Goals UI |
| `manual_tx` | User allocates an existing transaction to the goal |
| `income_allocation` | Auto-created when an income plan is matched |
| `import` | Created during CSV import |
| `auto` | Reserved for future automation |

**Goal-to-Goal Transfer:**
```
1. Validate source has sufficient balance
2. generate transfer_pair_id = UUID()
3. Create contribution: source goal, amount = -X, is_withdrawal = true
4. Create contribution: destination goal, amount = +X
5. Both share same transfer_pair_id
6. Optionally: create mirroring transfer transactions in source/dest accounts
7. Recompute is_completed for both goals
```

---

## 11. Goal Monthly Plans

### Detailed Definition
A lightweight month-level allocation record for a goal — used to track what was *intended* to be contributed in a given month. This is a planning aid, not enforced by the system. Think of it as a goal budget line.

### Model Relationships
- `goal_monthly_plans` → (N:1) → `goals`

### Lifecycle & States
```
CREATED → ACTIVE (informational only, no state transitions)
```

---

## 12. Imports & Import Sessions

### Detailed Definition
An `import` represents a **CSV file ingestion event**. An `import_session` is the interactive review state created alongside it — holding the parsed rows, detected duplicates, and resolution choices. The session bridges the async gap between "file uploaded" and "user reviewed."

### Model Relationships
- `imports` → (N:1) → `accounts`
- `imports` → (1:1) → `import_sessions`
- `imports` → (1:N) → `import_duplicate_resolutions`
- `imports` → (1:N) → `transactions`

### Lifecycle & States

```
[Import]
UPLOADED → PROCESSING → COMPLETED
                      → FAILED

[Import Session]
PROCESSING → AWAITING_REVIEW (duplicates found)
           → COMPLETED (no duplicates)

AWAITING_REVIEW → (user resolves all) → COMPLETED
               → (48h timeout, cron job) → ABANDONED
```

### Operational Logic

**Full Import Pipeline:**
```
1. User uploads CSV → registerImport() → status: "uploaded"
2. Frontend parses CSV using selected preset
3. ETL: normalizeTransaction() per row
   - parse date with format string
   - resolve amount (debit/credit columns, multipliers, sign)
   - normalize description
4. Validate each row (date valid? amount parseable? description present?)
5. Deduplication check per row:
   dedup_key = accountId + ":" + amount + ":" + normalizedDescription
   if key exists → mark as duplicate
6. Auto-categorize non-duplicate rows via rules engine
7. Call importTransactions():
   - Insert clean rows
   - Store duplicates in import_session
   - Create import_session record
8. If duplicates → UI prompts user to review
9. User selects: skip / import / merge per duplicate
10. resolveImportSession() finalizes
11. After any inserts: verifyAccountAllocations() scheduled
```

**Duplicate Resolution Actions:**
- `skip` — discard new row; keep existing unchanged.
- `import` — insert as a new separate transaction.
- `merge` — update existing transaction with new data fields.

---

## 13. Presets

### Detailed Definition
A `preset` is a **CSV parsing configuration template** — how to read a specific bank's export format. It handles delimiter, date formats, column mappings, and complex amount sign logic. Presets are the ETL config layer.

### Model Relationships
- `presets` → (N:N) → `accounts` (via `presetAccounts` junction table)

### Lifecycle & States
```
CREATED → ACTIVE → UPDATED → DELETED
```

### Operational Logic

**Amount Processing Modes:**
```
MODE 1 — Debit/Credit Columns:
    if debit_col != 0: amount = debit_value * debit_multiplier
    elif credit_col != 0: amount = credit_value * credit_multiplier

MODE 2 — Amount + Type Column:
    if type_col_value in debit_values: amount = amount * multiplier * -1
    elif type_col_value in credit_values: amount = amount * multiplier

MODE 3 — Simple:
    amount = amount_col_value * global_multiplier
```

---

## 14. Reimbursement Pairs

### Detailed Definition
A `reimbursement_pair` links a **positive expense transaction** (the reimbursement received) to the **original negative expense transaction** (the cost incurred). It allows Saldo to track net out-of-pocket cost versus gross spend.

### Model Relationships
- `reimbursement_pairs` → (1:1) → `transactions` (reimbursementTransactionId)
- `reimbursement_pairs` → (1:1) → `transactions` (expenseTransactionId)

### Lifecycle & States
```
CREATED → ACTIVE → DELETED
```

### Operational Logic
```
Net spending (per category group) =
    SUM(|expense transactions|) - SUM(reimbursement transactions)
    floored at 0
```

A transaction qualifies as a reimbursement if:
- `amount > 0` AND
- `transactionType == "expense"` OR `category.transactionType == "expense"`

---

## 15. Transfer Pairs

### Detailed Definition
A transfer pair is not a table — it is a **shared UUID field** (`transfer_pair_id`) on two transactions that represent a single logical movement of money between two accounts. No net wealth change, just location change.

### Model Relationships
- Two `transactions` records share the same `transfer_pair_id`.
- Stored in `ignored_transfer_pairs` when user dismisses a suggested pair.

### Lifecycle & States
```
UNPAIRED → PAIRED (both tx get transfer_pair_id + transactionType="transfer")
        → UNPAIRED again (via unpairTransfers)
```

### Operational Logic

**Pairing Constraints:**
- Must belong to the same user.
- Must be on different accounts.
- Must have opposing signs (one positive, one negative).
- Neither can already be paired.

**Potential Transfer Detection Algorithm:**
```
for (outgoing, incoming) pair:
    days_diff = |outgoing.date - incoming.date| / ms_per_day
    amount_ratio = ||outgoing.amount| - incoming.amount| / |outgoing.amount|

    if amount_diff < $0.01:
        score = 100 - (days_diff * 5)  // exact
    elif amount_ratio <= 0.02:
        score = 80 - (days_diff * 5) - (amount_ratio * 100)  // close
    else:
        score = 60 - (days_diff * 10) - (amount_ratio * 200)  // loose

FILTER: days_diff <= 2 AND amount_ratio <= 0.05
SORT: by score DESC
```

---

## 16. Telegram / Chat Layer

### Detailed Definition
A minimal **conversational interface** via Telegram for creating and correcting transactions on mobile without opening the app. It is stateful across messages via `chat_context` and uses `pending_confirmations` for high-risk ops.

### Entities
- `telegram_pairing_codes` — One-time codes to link Telegram to a Saldo account.
- `telegram_connections` — Active Telegram ↔ Saldo user bindings.
- `messages` — Ledger of inbound/outbound chat messages.
- `actions` — Intent records derived from messages (`pair_account`, `delete_transaction`, etc.)
- `chat_context` — Stores last transaction for multi-turn correction flow.
- `pending_confirmations` — Confirmation requests that expire after TTL.

### Operational Logic
- Correction flow: "fix amount to $X" → reads `chat_context.lastTransactionId` → calls `updateTransaction`.
- Delete flow: system creates a `pending_confirmation` → user confirms → delete executes.
- `pending_confirmations` have a TTL; cron job expires stale ones.

---

## User Flows (The Value Paths)

### Flow A: The Inflow Flow — "Income Detected → Fully Routed"

```
1. USER creates income_plan:
   expected_date="2026-05-15", expected_amount=5000, label="Acme Paycheck", recurrence="biweekly"

2. SYSTEM runs calculateAllocations():
   Rule 1: 50% → Savings Account     → $2,500
   Rule 2: 30% → Investment Account  → $1,500
   Rule 3: 20% → Checking (refill)   → $1,000
   → Creates 3 allocation_records (status: PENDING, is_forecast: true)

3. PAYCHECK ARRIVES in bank → USER imports CSV

4. ETL pipeline:
   - Row normalized: date=May15, amount=+4950, desc="ACME CORP PAYROLL"
   - Rules engine: matches "ACME CORP" rule → category: "Income/Salary"
   - Dedup check: passes
   - Transaction inserted

5. USER opens income plan view, matches transaction to plan:
   matchIncomePlan(planId, transactionId)

6. SYSTEM:
   - plan.status → "matched"
   - actual_amount = 4950 (≠ 5000; scale allocations proportionally)
     Rule 1: 50% → $2,475
     Rule 2: 30% → $1,485
     Rule 3: 20% → $990 (refill → auto-verified immediately)
   - allocation_records updated: Rule3 → VERIFIED, Rules 1&2 → RESERVED
   - Creates goal contributions for any goals linked to this plan
   - Recurrence: new income_plan auto-created for "2026-05-29"

7. USER transfers $2,475 to Savings, $1,485 to Investment (in real bank)

8. USER imports next CSV → Savings account import includes +$2,475

9. SYSTEM runs verifyAccountAllocations(savingsAccountId):
   - Finds RESERVED record: $2,475 target for Savings
   - Inflow match: amount within 5% of $2,475, date within 10 days ✓
   - Adaptive outflow check: checking account has outflow of ~$2,475 in window ✓
   - record → VERIFIED, transfer_transaction_id = tx._id

10. After both transfer records verified:
    plan.status → "COMPLETED"
    safeToSpend recalculates: checking has $990 allocated; spending tracked against it.
```

---

### Flow B: The Outflow Flow — "Purchase Time → Tracked Spending"

```
1. USER makes purchase: Chipotle, $14.50 (debit from checking)

2. USER imports CSV (or transaction arrives):
   - Row parsed: date=May18, amount=-14.50, desc="CHIPOTLE 0123 AUSTIN TX"
   - ETL: normalizeDescription → "chipotle 0123 austin tx"
   - Rules engine: "chipotle" pattern matches → category: "Dining Out"
   - Transaction inserted: isAutoCategorized=true

3. DASHBOARD update:
   - Category "Dining Out" (group: "Food") debits $14.50
   - safeToSpend: $990 (allocated) - $14.50 (spent) = $975.50 remaining

4. USER makes a business dinner ($60) → gets reimbursed later:
   - Expense tx: -$60, type="expense"
   - Reimbursement tx: +$60, type="expense"
   - USER pairs them: createReimbursementPair(reimburseTxId, expenseTxId)
   - Net Food spending: $14.50 (not $74.50; $60 offset)

5. IF transfer detected to another account:
   - USER imports CSV for savings account; sees +$2,475
   - Allocation record for savings RESERVED → VERIFIED (see Flow A step 9)
   - safeToSpend pool is NOT reduced; that transfer was already pre-accounted in allocation math
```

---

### Flow C: The Conflict Flow — "Uncategorized Data & Over-Budget Events"

**Uncategorized Transaction:**
```
1. Transaction arrives with description "ZELLE PAYMENT 83829291"
   - No rule matches → categoryId = null, isAutoCategorized = undefined
   - Transaction inserted as UNCATEGORIZED

2. In dashboard: appears in "Uncategorized" bucket; excluded from category spending
   (does still affect safeToSpend if negative)

3. USER manually sets category:
   - updateTransaction({ categoryId: X })
   - updatedAt is set → rule-engine lock engaged
   - isAutoCategorized = false

4. Alternatively: USER creates rule from suggestion:
   - pattern = "zelle payment", categoryId = "Transfers"
   - applyRuleRetroactively() batch-updates all matching uncategorized transactions
   - Locks NOT applied retroactively (manually-set ones still protected)
```

**Duplicate on Import:**
```
1. Same transaction re-imported after a bank export overlap
   - Dedup key matches existing record
   - Session created with status: AWAITING_REVIEW
   - UI shows conflict: existing vs. incoming

2. USER reviews:
   - "Skip" → discard; existing unchanged
   - "Import" → both exist as separate records (useful if genuinely duplicate timing)
   - "Merge" → update existing with new fields (e.g., updated description from bank)

3. Session → COMPLETED or times out → ABANDONED (cron after 48h)
```

**Allocation Shortfall (Over-Budget):**
```
1. income plan expected $5,000; actual match is $4,200
   - matchIncomePlan() detects actual ≠ expected
   - All non-refill allocation records scaled proportionally:
     $2,500 → $2,100 (50%)
     $1,500 → $1,260 (30%)
     $1,000 → $840 (20%)
   - No error raised; system accepts reduced allocation silently

2. If spending exceeds allocated checking amount:
   - safeToSpend = totalPool - netSpent → goes NEGATIVE
   - No blocking occurs; system surfaces this as a negative residual to the user
   - User must either reduce spending or re-match a new income event

3. Goal contribution shortfall:
   - Goal target: $500/month; user only has $300 left after allocations
   - System does NOT auto-enforce; user manually records $300 contribution
   - Goal completion date shifts implicitly (no auto-recalculation of due date)
```

---

## Key Invariants (Never Violate These)

| # | Invariant |
|---|---|
| 1 | A transaction can be matched to **at most one** income plan |
| 2 | `transfer_pair_id` requires **opposing signs** + **different accounts** |
| 3 | A transaction with `updatedAt` set is **never touched** by the rules engine |
| 4 | Allocation amounts for a plan must **not exceed** `actual_amount` |
| 5 | Goal withdrawals cannot exceed **current balance** (no overdraft) |
| 6 | Refill-scoped allocations are **auto-verified** on plan match; no transfer proof needed |
| 7 | Verification tolerance: **±5% amount** and **±10 days** date window |
| 8 | Reimbursements reduce net spending but **cannot make a category negative** |
| 9 | Import dedup key is **`accountId:amount:normalizedDescription`** |
| 10 | Rule engine chunk limit is **500 transactions per retroactive batch** |
