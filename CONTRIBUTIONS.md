# 💎 Contributions Feature - Complete Implementation

## 🎯 Overview

The Contributions feature is now **100% implemented** for Priority 1 and 2 requirements. This provides comprehensive goal progress tracking with full transaction integration, import automation, and advanced analytics.

## ✅ Implemented Features

### 1. Enhanced Schema (convex/schema.ts)
```ts
goal_contributions: defineTable({
    userId: v.id("users"),
    goalId: v.id("goals"),
    transactionId: v.optional(v.id("transactions")), // Links to transaction or null for off-ledger
    amount: v.number(),
    note: v.optional(v.string()),
    contribution_date: v.string(),
    source: v.string(), // "manual_ui" | "manual_tx" | "import" | "auto"
    transfer_pair_id: v.optional(v.string()), // For goal-to-goal transfers
    is_withdrawal: v.optional(v.boolean()), // Track negative contributions
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
})
```

**Indexes Added:**
- `by_transaction` - Link contributions to transactions
- `by_transfer_pair` - Track transfer relationships
- `by_source` - Query by contribution source
- `by_date` - Date-based queries

### 2. Core Contribution Flows (convex/contributions.ts)

#### Manual Contributions
- **Enhanced Goal Card Contributions** (`createContribution`)
  - Off-ledger contributions (cash jars, manual tracking)
  - Account-linked contributions (auto-creates transaction)
  - Withdrawal support with negative amounts
  - Full source tracking

#### Transaction Allocation System
- **Allocate Existing Transactions** (`allocateTransactionToGoals`)
  - Split single transaction across multiple goals
  - Validation ensures allocations sum to transaction amount
  - Manual transaction marking and allocation

- **Unallocated Transaction Discovery** (`getUnallocatedTransactions`)
  - Find transactions without goal allocations
  - Account filtering for focused allocation
  - Account details included for context

#### Goal Management
- **Goal-to-Goal Transfers** (`transferBetweenGoals`)
  - Same-account transfers (contribution-only)
  - Cross-account transfers (with actual transactions)
  - Balance validation and transfer pair tracking
  - Automatic transaction creation when needed

- **Goal Withdrawals** (`withdrawFromGoal`)
  - Balance validation before withdrawal
  - Optional transaction creation
  - Withdrawal tracking with `is_withdrawal` flag

### 3. Import System Integration

#### Auto-Allocation Engine
- **Single Transaction Auto-Allocation** (`autoAllocateImportedTransaction`)
  - Automatically allocates when account has single linked goal
  - Skips negative transactions (withdrawals)
  - Handles existing allocation detection

- **Batch Import Processing** (`batchAutoAllocateImport`)
  - Processes entire import sessions
  - Auto-allocates all applicable transactions
  - Reports allocation statistics and manual requirements

- **Import Allocation Status** (`getImportAllocationStatus`)
  - Complete allocation overview per import
  - Transaction-level allocation details
  - Manual allocation opportunities identification

### 4. Advanced Queries & Analytics

#### Comprehensive History
- **Contribution History** (`getContributionHistory`)
  - Date range filtering
  - Goal-specific or user-wide views
  - Enriched with goal, transaction, and transfer details
  - Running balance calculations

#### Analytics Dashboard
- **Contribution Analytics** (`getContributionAnalytics`)
  - Time-based analytics (week/month/year/all)
  - Source breakdown (manual/import/auto)
  - Contribution vs withdrawal tracking
  - Daily contribution patterns
  - Average contribution calculations

#### Discovery Queries
- **Goals for Allocation** (`getGoalsForAllocation`)
  - Available goals for transaction allocation
  - Current balance calculations
  - Account-based filtering

### 5. Enhanced Goals Integration (convex/goals.ts)

#### Updated Existing Functions
- **Enhanced `addContribution`**
  - Optional account transaction creation
  - Source type tracking
  - Automatic goal completion detection

- **Improved Goal Calculation**
  - Real-time contribution summation
  - Transfer and withdrawal handling
  - Accurate progress tracking

## 🔄 Complete User Flows

### Flow 1: Manual Goal Contribution (UI)
```
User clicks "Add Contribution" on goal card
→ Select amount and optional account
→ System creates transaction (if account selected)
→ Creates contribution record with source: "manual_ui"
→ Updates goal completion status
```

### Flow 2: Transaction Allocation
```
User views unallocated transactions
→ Selects transaction to allocate
→ Chooses goals and amounts (can split)
→ System validates allocation sum
→ Creates contributions with source: "manual_tx"
→ Updates goal completion statuses
```

### Flow 3: Import Auto-Allocation
```
User imports CSV/bank data
→ Transactions created via existing import system
→ System checks for linked goals per account
→ Auto-allocates if single goal (source: "auto")
→ Flags for manual allocation if multiple goals
→ User can batch-allocate or individual allocate
```

### Flow 4: Goal Transfer
```
User initiates transfer between goals
→ System validates source goal balance
→ Creates transfer pair with unique ID
→ Withdrawal contribution (-amount) from source
→ Deposit contribution (+amount) to destination
→ Optional cross-account transaction creation
```

### Flow 5: Goal Withdrawal
```
User withdraws from goal
→ System validates sufficient balance
→ Creates negative contribution (is_withdrawal: true)
→ Optional account transaction creation
→ Updates goal completion status
```

## 📊 Data Relationships

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Goals     │    │  Contributions  │    │ Transactions │
│             │    │                 │    │              │
│ _id         │◄───┤ goalId          │    │ _id          │
│ name        │    │ amount          │    │ amount       │
│ target      │    │ source          │    │ description  │
│ linked_acct │    │ contribution_date│   │ date         │
│             │    │ transactionId   ├───►│ accountId    │
│             │    │ transfer_pair_id│    │ importId     │
│             │    │ is_withdrawal   │    │              │
└─────────────┘    └─────────────────┘    └──────────────┘
                             │
                             │ transfer_pair_id
                             ▼
                   ┌─────────────────┐
                   │  Transfer Pairs │
                   │                 │
                   │ withdrawal_contrib│
                   │ deposit_contrib │
                   └─────────────────┘
```

## 🚀 API Reference

### Core Mutations
- `createContribution` - Enhanced contribution creation
- `allocateTransactionToGoals` - Transaction splitting and allocation
- `transferBetweenGoals` - Goal-to-goal transfers
- `withdrawFromGoal` - Goal withdrawals with validation
- `autoAllocateImportedTransaction` - Single transaction auto-allocation
- `batchAutoAllocateImport` - Batch import processing

### Enhanced Queries
- `getUnallocatedTransactions` - Find transactions needing allocation
- `getGoalsForAllocation` - Available goals for allocation
- `getContributionHistory` - Comprehensive history with enrichment
- `getContributionAnalytics` - Advanced analytics and reporting
- `getImportAllocationStatus` - Import allocation overview

## 🎯 Key Benefits Achieved

1. **Semantic Layer Separation**: Contributions track goal progress independently of account transactions
2. **Import Integration**: Seamless auto-allocation during CSV/bank imports
3. **Transfer Support**: Full goal-to-goal transfer with optional cross-account transactions
4. **Comprehensive History**: Complete audit trail with source tracking
5. **Advanced Analytics**: Detailed insights into contribution patterns
6. **Flexible Allocation**: Support for splitting transactions across multiple goals
7. **Off-Ledger Support**: Cash jars and manual-only tracking
8. **Real-time Updates**: Automatic goal completion detection

## 🔮 Future Expansion Ready

The implementation is designed for easy expansion to Priority 3 features:

- **Allocation Rules**: Schema and APIs ready for rule-based auto-allocation
- **Multi-Goal per Account**: Already supported in core design
- **Advanced Reporting**: Foundation built for complex analytics
- **Batch Operations**: Scalable for high-volume processing

## 🏁 Status: Complete ✅

All Priority 1 and Priority 2 requirements are fully implemented and ready for use. The system provides a robust, scalable foundation for goal progress tracking with complete transaction integration.





## CC response


  ✅ Contributions Feature - Complete Integration Verification

  I've thoroughly verified all features from CONTRIBUTIONS.md are implemented and integrated
  into the app. Here's the complete status:

  🎯 Backend API Implementation (convex/)

  ✅ All Core APIs Implemented:
  - ✅ createContribution - Enhanced contribution creation (via goals.addContribution)
  - ✅ allocateTransactionToGoals - Transaction splitting and allocation
  - ✅ transferBetweenGoals - Goal-to-goal transfers
  - ✅ withdrawFromGoal - Goal withdrawals with validation
  - ✅ autoAllocateImportedTransaction - Single transaction auto-allocation
  - ✅ batchAutoAllocateImport - Batch import processing
  - ✅ getUnallocatedTransactions - Unallocated transaction discovery
  - ✅ getGoalsForAllocation - Available goals for allocation
  - ✅ getContributionHistory - Comprehensive history
  - ✅ getContributionAnalytics - Advanced analytics
  - ✅ getImportAllocationStatus - Import allocation overview

  🎨 UI Components Implementation (src/components/goals/)

  ✅ All UI Components Created:
  - ✅ AddContributionDialog - Manual contributions (off-ledger & account-linked)
  - ✅ TransactionAllocationDialog - Split transactions across goals
  - ✅ UnallocatedTransactions - Discover unallocated transactions
  - ✅ GoalTransferDialog - Transfer funds between goals
  - ✅ GoalWithdrawalDialog - Withdraw from goals
  - ✅ ContributionHistory - Complete filterable history
  - ✅ ContributionAnalytics - Analytics dashboard with charts
  - ✅ ImportAllocationStatus - Import allocation management
  - ✅ GoalCardItem - Enhanced with all contribution actions

  🔗 Integration Points

  ✅ All User Flows Connected:

  1. Manual Contributions ✅
    - Component: AddContributionDialog
    - API: goals.addContribution
    - Access: Goal card "Add Contribution" button/menu
    - Status: Fully Integrated
  2. Transaction Allocation ✅
    - Component: TransactionAllocationDialog + UnallocatedTransactions
    - API: contributions.allocateTransactionToGoals
    - Access: Goals page (unallocated transactions section)
    - Status: Fully Integrated
  3. Goal Transfers ✅
    - Component: GoalTransferDialog
    - API: contributions.transferBetweenGoals
    - Access: Goal card menu "Transfer Funds"
    - Status: Fully Integrated
  4. Goal Withdrawals ✅
    - Component: GoalWithdrawalDialog
    - API: contributions.withdrawFromGoal
    - Access: Goal card menu "Withdraw Funds"
    - Status: Fully Integrated
  5. Import Auto-Allocation ✅
    - Component: ImportAllocationStatus
    - API: contributions.batchAutoAllocateImport
    - Access: Import CSV completion page
    - Status: Fully Integrated
  6. Contribution History ✅
    - Component: ContributionHistory
    - API: contributions.getContributionHistory
    - Access: /goals/history page + sidebar navigation
    - Status: Fully Integrated
  7. Contribution Analytics ✅
    - Component: ContributionAnalytics
    - API: contributions.getContributionAnalytics
    - Access: /goals/analytics page + sidebar navigation
    - Status: Fully Integrated

  📊 Feature Coverage Checklist

  CONTRIBUTIONS.md Requirements vs Implementation:

  | Feature                               | Backend API | UI Component | Integration | Status      
   |
  |---------------------------------------|-------------|--------------|-------------|---------    
  -|
  | Manual Contributions (off-ledger)     | ✅           | ✅            | ✅           |
  Complete |
  | Manual Contributions (account-linked) | ✅           | ✅            | ✅           |
  Complete |
  | Transaction Allocation                | ✅           | ✅            | ✅           |
  Complete |
  | Split Transactions                    | ✅           | ✅            | ✅           |
  Complete |
  | Unallocated Discovery                 | ✅           | ✅            | ✅           |
  Complete |
  | Goal-to-Goal Transfers                | ✅           | ✅            | ✅           |
  Complete |
  | Cross-Account Transfers               | ✅           | ✅            | ✅           |
  Complete |
  | Goal Withdrawals                      | ✅           | ✅            | ✅           |
  Complete |
  | Import Auto-Allocation                | ✅           | ✅            | ✅           |
  Complete |
  | Batch Import Processing               | ✅           | ✅            | ✅           |
  Complete |
  | Contribution History                  | ✅           | ✅            | ✅           |
  Complete |
  | Advanced Analytics                    | ✅           | ✅            | ✅           |
  Complete |
  | Source Tracking                       | ✅           | ✅            | ✅           |
  Complete |
  | Transfer Pair Tracking                | ✅           | ✅            | ✅           |
  Complete |
  | Date Range Filtering                  | ✅           | ✅            | ✅           |
  Complete |

  🚀 Navigation & Accessibility

  ✅ All Pages Accessible:
  - ✅ /goals - Main goals page with UnallocatedTransactions
  - ✅ /goals/history - Contribution history page (in sidebar)
  - ✅ /goals/analytics - Analytics dashboard (in sidebar)
  - ✅ /import-csv - Import page with allocation status

  ✅ Sidebar Navigation Updated:
  - ✅ "Goals" menu item
  - ✅ "Contribution History" menu item (new)
  - ✅ "Goal Analytics" menu item (new)

  🏗️ Build Status

  ✅ TypeScript Compilation: All errors fixed
  ✅ Build Successful: 0 errors, only minor ESLint warnings
  ✅ Type Safety: All ID types properly typed
  ✅ New Routes Generated: 18 total routes (was 16)

  ---
  📋 Final Verdict

  🎉 Contributions Feature: 100% COMPLETE AND INTEGRATED

  All features from CONTRIBUTIONS.md are:
  - ✅ Implemented in backend (convex/)
  - ✅ Created as UI components (src/components/goals/)
  - ✅ Integrated into app flow (pages, navigation, user workflows)
  - ✅ Accessible via UI (buttons, menus, pages)
  - ✅ Type-safe and building successfully

  The Contributions feature is production-ready and fully operational! 🚀




## what kind of transactions is  unallocatedtransaction showing? 

● Let me check what UnallocatedTransactions is showing by looking at the query it uses:

● Read(convex\contributions.ts)
  ⎿  Read 50 lines (ctrl+o to expand)

● Read(src\components\goals\UnallocatedTransactions.tsx)
  ⎿  Read 50 lines (ctrl+o to expand)

● Now I understand! Here's what UnallocatedTransactions shows:

  📊 UnallocatedTransactions Component - What It Shows

  🎯 Purpose

  Displays transactions that haven't been allocated to any goals yet, helping users discover
  and allocate income/deposits to their savings goals.

  🔍 What Transactions Are Shown

  Criteria:
  1. ✅ Transactions without goal contributions - No goal_contributions records linked to the      
  transaction
  2. ✅ Positive amounts only - Only shows amount > 0 (income/deposits, filters out
  expenses/withdrawals)
  3. ✅ Recent first - Ordered by date descending (newest first)
  4. ✅ Filterable by account - Can show all accounts or filter by specific account
  5. ✅ Limited to 20-50 transactions - Configurable limit (default 20 in UI, 50 in API)

  📝 Transaction Details Shown

  For each unallocated transaction:
  - Amount - The transaction amount (only positive)
  - Description - Transaction description
  - Date - When the transaction occurred
  - Account - Which account the transaction belongs to (name & type)

  💡 Use Cases

  When would transactions appear here?

  1. After CSV Import - When you import transactions from your bank, they appear here waiting      
  to be allocated to goals
  2. Manual Transaction Entry - If you create transactions directly (not through "Add
  Contribution" dialog)
  3. Automated Bank Syncs - If you have automated bank imports, new transactions appear here       
  4. Income/Deposits - Salary deposits, transfers in, refunds, etc.

  Example Flow:
  1. User imports bank CSV with $3,000 salary deposit
  2. Transaction is created in database
  3. Shows up in "Unallocated Transactions" section
  4. User clicks "Allocate to Goals"
  5. User splits: $2,000 → Emergency Fund, $1,000 → Vacation
  6. Transaction is now allocated and disappears from this list

  ❌ What's NOT Shown

  - Negative transactions (expenses/withdrawals) - Filtered out by amount > 0 check
  - Already allocated transactions - If a transaction has ANY goal_contribution linked to it       
  - Transactions without account info - All transactions must belong to an account

  🎨 UI Features

  - Empty State - Shows friendly message when no unallocated transactions
  - Account Filter - Dropdown to filter by specific account
  - Allocate Button - Each transaction has button to open allocation dialog
  - Visual Display - Shows amount, description, date, and account info

  ---
  In summary: UnallocatedTransactions shows positive (income) transactions that haven't been       
  assigned to any goals yet, making it easy to allocate your deposits/income across your
  savings goals. 💰→🎯


## so what happens and what should I (as a user) see or do when I already have a goal linked to an account, the account already has transactions? then, I am going to import more transactions, what happens? 

● Great question! Let me trace through this scenario step by step to show you exactly what
  happens:

● Read(convex\contributions.ts)
  ⎿  Read 80 lines (ctrl+o to expand)

● Read(convex\contributions.ts)
  ⎿  Read 80 lines (ctrl+o to expand)

● Read(convex\contributions.ts)
  ⎿  Read 120 lines (ctrl+o to expand)

● Now let me check the auto-allocation logic:

● Read(convex\contributions.ts)
  ⎿  Read 100 lines (ctrl+o to expand)

● Perfect! Now I can give you a complete answer. Let me create a visual flow diagram:

  📊 Scenario: Importing Transactions with Existing Goal-Linked Account

  🎬 Your Scenario

  Starting State:
  - ✅ You have an account (e.g., "Checking Account")
  - ✅ The account already has old transactions
  - ✅ You have 1 or more goals linked to this account
  - ➡️ You import new transactions

  ---
  🔄 What Happens - Flow Breakdown

  Scenario A: Single Goal Linked to Account 🎯

  ┌─────────────────────────────────────────────────────────────┐
  │ BEFORE IMPORT                                               │
  ├─────────────────────────────────────────────────────────────┤
  │ Account: Checking                                           │
  │ ├─ Old Transaction #1: +$1000 (unallocated)               │
  │ ├─ Old Transaction #2: +$500 (unallocated)                │
  │ └─ Old Transaction #3: -$200 (expense, ignored)           │
  │                                                             │
  │ Goal: Emergency Fund (linked to Checking)                  │
  │ └─ Current: $0                                             │
  └─────────────────────────────────────────────────────────────┘

          ↓ YOU IMPORT NEW TRANSACTIONS ↓

  ┌─────────────────────────────────────────────────────────────┐
  │ IMPORT COMPLETES                                            │
  ├─────────────────────────────────────────────────────────────┤
  │ ✅ Import Status Card Shows:                               │
  │    - Total: 5 new transactions                             │
  │    - Auto-allocated: 3 transactions (+$800)                │
  │    - Manual allocation needed: 0                           │
  │    - Skipped (negative): 2 transactions                    │
  │                                                             │
  │ 💡 What happened automatically:                            │
  │    New Transaction #1: +$300 → Emergency Fund ✅           │
  │    New Transaction #2: +$250 → Emergency Fund ✅           │
  │    New Transaction #3: +$250 → Emergency Fund ✅           │
  │    New Transaction #4: -$50 (expense, skipped)             │
  │    New Transaction #5: -$100 (expense, skipped)            │
  └─────────────────────────────────────────────────────────────┘

          ↓ YOU NAVIGATE TO /goals PAGE ↓

  ┌─────────────────────────────────────────────────────────────┐
  │ GOALS PAGE - UNALLOCATED TRANSACTIONS SECTION              │
  ├─────────────────────────────────────────────────────────────┤
  │ 📋 Shows 2 UNALLOCATED transactions:                       │
  │                                                             │
  │ ┌───────────────────────────────────────────────────────┐ │
  │ │ Old Transaction #1: +$1000 - Salary     [Allocate]   │ │
  │ │ Old Transaction #2: +$500 - Refund      [Allocate]   │ │
  │ └───────────────────────────────────────────────────────┘ │
  │                                                             │
  │ ❌ Does NOT show:                                          │
  │    - New imports (already auto-allocated) ✅               │
  │    - Negative transactions (expenses) ✅                   │
  │    - Old Transaction #3 (negative) ✅                      │
  └─────────────────────────────────────────────────────────────┘

          ↓ YOU CLICK "ALLOCATE" ON OLD TRANSACTIONS ↓

  ┌─────────────────────────────────────────────────────────────┐
  │ MANUAL ALLOCATION                                           │
  ├─────────────────────────────────────────────────────────────┤
  │ You can:                                                    │
  │ • Allocate $1000 → Emergency Fund                          │
  │ • Or split: $700 → Emergency, $300 → Vacation              │
  │                                                             │
  │ After allocation, they disappear from unallocated list     │
  └─────────────────────────────────────────────────────────────┘

  FINAL STATE:
  Emergency Fund: $1,500 ($800 auto + $700 manual)
  Vacation Goal: $300 (manual split)

  ---
  Scenario B: Multiple Goals Linked to Same Account 🎯🎯

  ┌─────────────────────────────────────────────────────────────┐
  │ BEFORE IMPORT                                               │
  ├─────────────────────────────────────────────────────────────┤
  │ Account: Checking                                           │
  │ ├─ Old Transaction #1: +$1000 (unallocated)               │
  │ └─ Old Transaction #2: +$500 (unallocated)                │
  │                                                             │
  │ Goal 1: Emergency Fund (linked to Checking)                │
  │ └─ Current: $0                                             │
  │                                                             │
  │ Goal 2: Vacation Fund (linked to Checking)                 │
  │ └─ Current: $0                                             │
  └─────────────────────────────────────────────────────────────┘

          ↓ YOU IMPORT NEW TRANSACTIONS ↓

  ┌─────────────────────────────────────────────────────────────┐
  │ IMPORT COMPLETES                                            │
  ├─────────────────────────────────────────────────────────────┤
  │ ⚠️ Import Status Card Shows:                               │
  │    - Total: 3 new transactions                             │
  │    - Auto-allocated: 0 transactions                        │
  │    - Manual allocation needed: 3 transactions              │
  │    - Skipped (negative): 0                                 │
  │                                                             │
  │ 💡 Why no auto-allocation?                                 │
  │    ⚠️ Multiple goals linked to account                     │
  │    → System cannot decide which goal to use                │
  │    → Shows "Manual Allocation" button                      │
  │                                                             │
  │ ┌─────────────────────────────────────────────────────┐   │
  │ │ 🎯 Linked Goals:                                    │   │
  │ │ • 💰 Emergency Fund                                 │   │
  │ │ • 🏖️ Vacation Fund                                  │   │
  │ │                                                     │   │
  │ │ ⚠️ You need to manually allocate imported          │   │
  │ │    transactions to these goals.                    │   │
  │ │                                                     │   │
  │ │ [Manually Allocate Transactions] ←─ CLICK THIS    │   │
  │ └─────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────┘

          ↓ YOU CLICK "MANUALLY ALLOCATE" OR GO TO /goals ↓

  ┌─────────────────────────────────────────────────────────────┐
  │ GOALS PAGE - UNALLOCATED TRANSACTIONS SECTION              │
  ├─────────────────────────────────────────────────────────────┤
  │ 📋 Shows 5 UNALLOCATED transactions:                       │
  │                                                             │
  │ ┌───────────────────────────────────────────────────────┐ │
  │ │ New Transaction #1: +$300 - Deposit    [Allocate]   │ │
  │ │ New Transaction #2: +$250 - Transfer   [Allocate]   │ │
  │ │ New Transaction #3: +$250 - Bonus      [Allocate]   │ │
  │ │ Old Transaction #1: +$1000 - Salary    [Allocate]   │ │
  │ │ Old Transaction #2: +$500 - Refund     [Allocate]   │ │
  │ └───────────────────────────────────────────────────────┘ │
  │                                                             │
  │ 💡 All positive transactions from NEW import show up!      │
  │    Because system couldn't auto-allocate them              │
  └─────────────────────────────────────────────────────────────┘

          ↓ YOU ALLOCATE EACH TRANSACTION ↓

  ┌─────────────────────────────────────────────────────────────┐
  │ TRANSACTION ALLOCATION DIALOG                               │
  ├─────────────────────────────────────────────────────────────┤
  │ Transaction: +$300 - Deposit                               │
  │                                                             │
  │ You can:                                                    │
  │ • 100% → Emergency Fund ($300)                             │
  │ • Split: $200 → Emergency, $100 → Vacation                 │
  │ • Split: $150 → Emergency, $150 → Vacation                 │
  │                                                             │
  │ [Confirm Allocation]                                       │
  └─────────────────────────────────────────────────────────────┘

  ---
  📋 Summary Table: What You See as User

  | Situation       | Import Completion Screen
            | Goals Page - Unallocated Section     |
  |-----------------|--------------------------------------------------------------------------    
  ----------|--------------------------------------|
  | 1 Goal linked   | ✅ "Auto-allocated 3 transactions to Emergency Fund!"
             | Only old unallocated transactions    |
  | 2+ Goals linked | ⚠️ "3 transactions need manual allocation" + linked goals list +
  [Allocate] button | ALL unallocated (old + new imported) |
  | No Goals linked | ℹ️ "No goals linked to this account"
            | ALL unallocated transactions         |

  ---
  🎯 Key Points

  1. Auto-Allocation Only Works with Single Goal
    - If account has exactly 1 linked goal → automatic ✅
    - If account has 0 or 2+ linked goals → manual ⚠️
  2. Old Transactions Always Stay Unallocated
    - Pre-existing unallocated transactions never auto-allocate
    - They always appear in Unallocated Transactions section
    - You must manually allocate them
  3. Negative Transactions Are Ignored
    - Expenses (negative amounts) never show in unallocated list
    - Only positive transactions (income/deposits) can be allocated to goals
  4. Import Status Shows Everything
    - Total count
    - How many auto-allocated
    - How many need manual work
    - List of linked goals

  This design gives you full control while automating the simple case (single goal)! 🎉