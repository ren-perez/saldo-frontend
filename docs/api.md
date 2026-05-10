This documentation provides an overview of the **Saldo** financial engine powered by Convex. It covers the data models and the primary API surface (Queries and Mutations).

---

## 1. Data Models (Schema Overview)

Based on the source code, the system operates on the following core entities:

*   **Users:** Stores identity (`clerkId`), email, and global preferences like `previewIncome`.
*   **Accounts:** Financial containers (Bank, Savings, Credit Card) with a `starting_balance` anchor.
*   **Transactions:** The core ledger entries. Includes amount, date, description, and metadata for categorization (`categoryId`), source tracking (`importId`), and transfer pairing (`transfer_pair_id`).
*   **Categories & Groups:** A two-tier hierarchy for classifying spend. Categories can have an associated `transactionType` (Income/Expense).
*   **Category Rules:** Pattern-matching logic (`pattern`) used to automatically assign categories to transactions based on descriptions.
*   **Income Plans:** Forward-looking projections of income (Weekly, Bi-weekly, etc.). They transition from `planned` → `matched` (linked to a real transaction) → `completed`.
*   **Allocation Rules:** Logic defining how income should be split (e.g., 10% to Savings, $500 to Rent). Uses `priority` and `ruleType` (percent/fixed).
*   **Allocation Records:** The actual results of an income plan split, tracking `verification_status` (pending/reserved/verified) as money moves to target accounts.
*   **Goals:** Savings targets. Can be `MANUAL` (tracked via contributions) or `LINKED_ACCOUNT` (tracked by account balance).
*   **Goal Contributions:** Individual ledger entries moving money into or out of a Goal.
*   **Imports & Sessions:** Tracks CSV upload metadata and manages the "Duplicate Review" workflow.
*   **Telegram Connections:** Maps Telegram user/chat IDs to Saldo user IDs for bot interaction.

---

## 2. API Reference (Mutations & Queries)

### 🏦 Accounts
| Function | Type | Description |
| :--- | :--- | :--- |
| `listAccounts` | Query | Returns all accounts enriched with current computed balance and recent imports. |
| `createAccount` | Mutation | Initializes a new account with an optional starting balance. |
| `updateAccount` | Mutation | Updates account details or adjusts the manual balance anchor. |
| `deleteAccount` | Mutation | Removes an account from the system. |

### 💸 Transactions & Transfers
| Function | Type | Description |
| :--- | :--- | :--- |
| `listTransactionsPaginated` | Query | Advanced filtered search (dates, categories, groups, terms) with pagination. |
| `createManualTransaction` | Mutation | Manually logs a transaction; triggers auto-categorization and allocation verification. |
| `importTransactions` | Mutation | Bulk inserts transactions from CSV; handles deduplication and rule matching. |
| `pairTransfers` | Mutation | Links two transactions (outflow/inflow) as a single internal transfer. |
| `autoLinkTransferPairs` | Mutation | Automatically detects and pairs cross-account transfers post-import. |
| `getDashboardStats` | Query | Computes net flow, top spending groups, and daily activity for a date range. |

### 📈 Income & Allocations
| Function | Type | Description |
| :--- | :--- | :--- |
| `listIncomePlans` | Query | Returns planned and historical income events. |
| `matchIncomePlan` | Mutation | Links a transaction to a plan, calculates splits, and schedules the next recurrence. |
| `runAllocationsForPlan` | Mutation | Executes the allocation engine to generate records for a specific income plan. |
| `verifyAllocations` | Mutation | Scans bank history to find transfers that "prove" an allocation happened. |
| `getMonthlyBudgetContext` | Query | Returns the "Safe to Spend" pool vs. actual expenses for the month. |

### 🎯 Goals & Contributions
| Function | Type | Description |
| :--- | :--- | :--- |
| `getGoals` | Query | Returns all goals with current progress and linked account data. |
| `recordGoalMovement` | Mutation | Records a deposit/withdrawal; can optionally create a corresponding transaction. |
| `allocateTransactionToGoals` | Mutation | Splits a single transaction amount across multiple savings goals. |
| `transferBetweenGoals` | Mutation | Moves balance from one goal to another (handles cross-account logic). |

### 🤖 Chat & Bot Tools (`chatTools.ts`)
| Function | Type | Description |
| :--- | :--- | :--- |
| `getBalance` | Query | Bot-optimized balance summary for all accounts. |
| `createTransactionFromChat` | Mutation | NLP-friendly transaction creation with smart account defaults. |
| `updateLastTransaction` | Mutation | Correction flow for the most recently logged chat transaction. |
| `requestDeleteTransaction`| Mutation | Initiates a high-risk deletion flow requiring "Yes/No" confirmation. |

---

## 3. Pending Documentation Work

The current codebase lacks inline JSDoc documentation for automated generation. 

**Plan for Extraction:**
1.  **Standardize JSDoc:** Add `@param`, `@returns`, and `@throws` tags to every exported mutation.
2.  **Auth Metadata:** Explicitly document the expected authentication state (e.g., `@auth Clerk` or `@auth Internal`).
3.  **Side-Effect Mapping:** Note which mutations trigger background jobs (like `verifyAccountAllocations`).
4.  **Tooling:** Use a script to parse the `v.object` validators in `args` to generate a live JSON Schema for the API.

**Why:** This will enable the creation of a "Developer Portal" where the bot logic and frontend logic can share a single source of truth for API capabilities.

This API reference details the Convex backend structure for Saldo, covering data modules, mutation/query parameters, and core business logic nuances.

---

## 🛠 Future Task: JSDoc Standardization
**Status:** Pending.
**Plan:** Implement structured JSDoc comments above each function.
**Goal:** Use tags like `@description`, `@args`, `@returns`, and `@nuance` (logic traps). This allows tools like TypeDoc or custom AST parsers to generate live, searchable developer portals without manual maintenance.

---

## 1. Accounts (`accounts.ts`)
Handles financial account metadata and balance computations.

### Queries
*   **`listAccounts`**
    *   **Args:** `userId`
    *   **Nuance:** Returns "enriched" data. Computes a live `balance` by adding `starting_balance` to the sum of all related transactions. Fetches recent imports and linked goals in parallel for UI performance.
*   **`getAccountPreset`**
    *   **Args:** `accountId`
    *   **Nuance:** Finds the CSV import template (preset) linked to this account.
*   **`getPresetAccounts`**
    *   **Args:** `presetId`
    *   **Nuance:** Inverse lookup to find all accounts using a specific CSV format.

### Mutations
*   **`createAccount` / `updateAccount`**
    *   **Args:** `userId`, `name`, `bank`, `number`, `type`, `starting_balance`, `balance` (legacy alias).
    *   **Nuance:** Maps the input `balance` to `starting_balance` for backward compatibility.
*   **`deleteAccount`**
    *   **Args:** `accountId`
    *   **Nuance:** Simple deletion; does not cascade delete transactions (referential integrity is manual).

---

## 2. Allocations & Income Plans (`allocations.ts`, `incomePlans.ts`, `allocationRules.ts`)
The core engine for forecasting and distributing income.

### Queries
*   **`getMonthlyBudgetContext`**
    *   **Args:** `userId`, `monthKey` (YYYY-MM)
    *   **Nuance:** Calculates the "Safe to Spend" pool. Distinguishes between `verified` (money actually moved), `reserved` (income matched but not moved), and `pending` (forecasted).
*   **`previewAllocation`**
    *   **Args:** `userId`, `amount`
    *   **Nuance:** Runs the `calculateAllocations` logic in-memory to show the user where a hypothetical income amount would go.

### Mutations
*   **`matchIncomePlan`**
    *   **Args:** `planId`, `transactionId`, `customAllocations?`
    *   **Nuance:** Links a real bank transaction to a plan. Triggers **JIT (Just-In-Time) Recurrence**: it calculates the next expected date and creates the *next* planned income item automatically.
*   **`verifyAccountAllocations` (Internal)**
    *   **Nuance:** An observer that scans for positive transfers into goal accounts to mark forecasted allocations as `verified`. Uses an "adaptive outflow check"—if the source account isn't tracked, it trusts the inflow alone.
*   **`unmatchAndResetAllocations`**
    *   **Nuance:** Atomic reset. Clears linked goal contributions and resets the plan to "planned" status in a single transaction.

---

## 3. Transactions & Imports (`transactions.ts`, `imports.ts`, `rulesEngine.ts`)
Handles bank data ingestion and categorization.

### Mutations
*   **`importTransactions`**
    *   **Args:** `userId`, `accountId`, `transactions[]`, `sessionId`, `importId`, `trustSource?`
    *   **Nuance:** High-performance batch processing. Uses a `deduplicationKey` (amount + date + normalized description) to prevent double-importing the same CSV row. CSV categories take priority over the Rules Engine.
*   **`updateTransactionAndCreateRule`**
    *   **Args:** `transactionId`, `categoryId`, `saveRule?`, `rulePattern?`
    *   **Nuance:** When a user categorizes a transaction, they can optionally "remember this" which creates a new `category_rule` for future automation.

### Nuance: Rules Engine
*   The `rulesEngine.ts` uses **Description Normalization**. It strips bank "noise" (e.g., `POS PURCHASE`, `RECURRING PAYMENT`, inline dates, and trailing transaction IDs) before attempting a pattern match.

---

## 4. Chat Tools (`chatTools.ts`, `chatHistory.ts`)
The API surface for Telegram/WhatsApp integrations.

### Security Nuance
*   **User Resolution:** Bots never pass a `userId`. They pass a `telegramUserId`. The backend resolves this via the `telegram_connections` table to ensure the user is active and linked.
*   **Confirmation Flow:** High-risk actions (like `delete_transaction`) use a two-step flow. `requestDeleteTransaction` creates a `pending_confirmations` record with a 5-minute TTL. The bot must then call `executePendingConfirmation`.

### Queries
*   **`getBalance`**
    *   **Args:** `telegramUserId`
    *   **Nuance:** Returns a summary of all accounts. If an account has no live transactions, it caveats that the data might be partial.
*   **`getSummaryForChat`**
    *   **Nuance:** Aggregates current calendar month stats (Net, Top Category, Income vs Expenses) specifically for chat display.

---

## 5. Goals & Contributions (`goals.ts`, `contributions.ts`)
Tracking savings and specific financial targets.

### Tracking Types
*   **`LINKED_ACCOUNT`:** The goal balance is always equal to the associated account's total balance.
*   **`MANUAL`:** The goal balance is the sum of specific `goal_contributions`.

### Mutations
*   **`transferBetweenGoals`**
    *   **Args:** `fromGoalId`, `toGoalId`, `amount`, `createTransactions?`
    *   **Nuance:** Can perform a virtual transfer (just moving goal balances) or a real transfer (creating withdrawal/deposit transactions if the goals are in different bank accounts).

---

## 6. Reflections & Analytics (`reflections.ts`)
Data aggregation for monthly reviews and trends.

### Queries
*   **`getMonthlySummary`**
    *   **Nuance:** Specifically separates **Reimbursements**. If a transaction is typed as an "Expense" but the amount is positive, it is treated as a reimbursement that reduces `netExpenses` rather than increasing `totalIncome`.
*   **`getTransferInsights`**
    *   **Nuance:** Analyzes `transfer_pair_id` links. It identifies "Savings" (money moved to a savings account) vs "Debt Payment" (money moved to a credit card) to show the user how much they saved/paid off rather than just what they spent.

---

## 7. Category Rules (`categoryRules.ts`)
Automation for transaction classification.

### Queries
*   **`getTransactionsForRulePreview`**
    *   **Nuance:** Returns four buckets: `alreadyLinked`, `wouldCategorize` (uncategorized), `wouldUpdate` (already auto-categorized), and `skippedCount` (manual human overrides). This prevents rules from overwriting intentional user changes.
*   **`getRuleSuggestions`**
    *   **Nuance:** Scans the last 500 manual transactions. If the same description/category combo appears 3+ times without a rule, it suggests creating one.