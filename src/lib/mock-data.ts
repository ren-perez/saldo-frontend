export interface MockTransaction {
  id: string
  date: string
  amount: number
  description: string
  category?: string
  type: "income" | "expense"
  allocated: boolean
}

export interface CategoryBase {
  id: string
  name: string
  color: string
}

export interface SpendingCategory extends CategoryBase {
  mode: "spending"
  monthlyTarget: number
  spentSoFar: number
  remaining: number
}

export interface CommitmentCategory extends CategoryBase {
  mode: "commitment"
  monthlyDue: number
  reservedSoFar: number
  stillToReserve: number
  weeklyContribution: number
  isPaid: boolean
}

export interface GoalCategory extends CategoryBase {
  mode: "goal"
  targetAmount: number
  savedSoFar: number
  weeklyContribution: number
  progressPercent: number
}

export type Category = SpendingCategory | CommitmentCategory | GoalCategory

export interface WeeklyPlan {
  week: number
  planned: number
  actual: number
  remaining: number
  categories: Category[]
}

// Mock data with the 3 category modes
export const mockCategories: Category[] = [
  // Spending Categories
  {
    id: "food",
    name: "Food",
    mode: "spending",
    monthlyTarget: 400,
    spentSoFar: 220,
    remaining: 180,
    color: "bg-emerald-500",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    mode: "spending",
    monthlyTarget: 200,
    spentSoFar: 80,
    remaining: 120,
    color: "bg-purple-500",
  },
  // Commitment Categories
  {
    id: "rent",
    name: "Rent",
    mode: "commitment",
    monthlyDue: 1200,
    reservedSoFar: 800,
    stillToReserve: 400,
    weeklyContribution: 300,
    isPaid: false,
    color: "bg-blue-500",
  },
  {
    id: "insurance",
    name: "Insurance",
    mode: "commitment",
    monthlyDue: 300,
    reservedSoFar: 300,
    stillToReserve: 0,
    weeklyContribution: 75,
    isPaid: true,
    color: "bg-slate-500",
  },
  // Goal Categories
  {
    id: "vacation",
    name: "Vacation Fund",
    mode: "goal",
    targetAmount: 3000,
    savedSoFar: 1500,
    weeklyContribution: 200,
    progressPercent: 50,
    color: "bg-orange-500",
  },
  {
    id: "emergency",
    name: "Emergency Fund",
    mode: "goal",
    targetAmount: 5000,
    savedSoFar: 2000,
    weeklyContribution: 150,
    progressPercent: 40,
    color: "bg-red-500",
  },
]

export const mockWeeklyPlans: WeeklyPlan[] = [
  {
    week: 1,
    planned: 1200,
    actual: 1100,
    remaining: 100,
    categories: [
      {
        id: "food",
        name: "Food",
        mode: "spending",
        monthlyTarget: 400,
        spentSoFar: 70,
        remaining: 30,
        color: "bg-emerald-500",
      },
      {
        id: "rent",
        name: "Rent",
        mode: "commitment",
        monthlyDue: 1200,
        reservedSoFar: 300,
        stillToReserve: 900,
        weeklyContribution: 300,
        isPaid: false,
        color: "bg-blue-500",
      },
      {
        id: "vacation",
        name: "Vacation Fund",
        mode: "goal",
        targetAmount: 3000,
        savedSoFar: 1300,
        weeklyContribution: 200,
        progressPercent: 43,
        color: "bg-orange-500",
      },
    ] as Category[],
  },
  {
    week: 2,
    planned: 1000,
    actual: 950,
    remaining: 50,
    categories: [
      {
        id: "food",
        name: "Food",
        mode: "spending",
        monthlyTarget: 400,
        spentSoFar: 140,
        remaining: 60,
        color: "bg-emerald-500",
      },
      {
        id: "rent",
        name: "Rent",
        mode: "commitment",
        monthlyDue: 1200,
        reservedSoFar: 600,
        stillToReserve: 600,
        weeklyContribution: 300,
        isPaid: false,
        color: "bg-blue-500",
      },
      {
        id: "vacation",
        name: "Vacation Fund",
        mode: "goal",
        targetAmount: 3000,
        savedSoFar: 1500,
        weeklyContribution: 200,
        progressPercent: 50,
        color: "bg-orange-500",
      },
    ] as Category[],
  },
  {
    week: 3,
    planned: 800,
    actual: 750,
    remaining: 50,
    categories: [
      {
        id: "food",
        name: "Food",
        mode: "spending",
        monthlyTarget: 400,
        spentSoFar: 220,
        remaining: 80,
        color: "bg-emerald-500",
      },
      {
        id: "rent",
        name: "Rent",
        mode: "commitment",
        monthlyDue: 1200,
        reservedSoFar: 900,
        stillToReserve: 300,
        weeklyContribution: 300,
        isPaid: false,
        color: "bg-blue-500",
      },
      {
        id: "vacation",
        name: "Vacation Fund",
        mode: "goal",
        targetAmount: 3000,
        savedSoFar: 1700,
        weeklyContribution: 200,
        progressPercent: 57,
        color: "bg-orange-500",
      },
    ] as Category[],
  },
  {
    week: 4,
    planned: 600,
    actual: 580,
    remaining: 20,
    categories: [
      {
        id: "food",
        name: "Food",
        mode: "spending",
        monthlyTarget: 400,
        spentSoFar: 280,
        remaining: 20,
        color: "bg-emerald-500",
      },
      {
        id: "rent",
        name: "Rent",
        mode: "commitment",
        monthlyDue: 1200,
        reservedSoFar: 1200,
        stillToReserve: 0,
        weeklyContribution: 300,
        isPaid: true,
        color: "bg-blue-500",
      },
      {
        id: "vacation",
        name: "Vacation Fund",
        mode: "goal",
        targetAmount: 3000,
        savedSoFar: 1900,
        weeklyContribution: 200,
        progressPercent: 63,
        color: "bg-orange-500",
      },
    ] as Category[],
  },
]

export const mockTransactions: MockTransaction[] = [
  {
    id: "1",
    date: "2025-09-26",
    amount: 2000,
    description: "Paycheck - New Income Detected",
    type: "income",
    allocated: false,
  },
  {
    id: "2",
    date: "2025-09-15",
    amount: 2000,
    description: "Paycheck",
    type: "income",
    allocated: true,
  },
  {
    id: "3",
    date: "2025-09-25",
    amount: -1200,
    description: "Rent Payment",
    category: "Rent",
    type: "expense",
    allocated: true,
  },
  {
    id: "4",
    date: "2025-09-24",
    amount: -45,
    description: "Dining Out",
    category: "Food",
    type: "expense",
    allocated: true,
  },
  {
    id: "5",
    date: "2025-09-23",
    amount: -175,
    description: "Groceries",
    category: "Food",
    type: "expense",
    allocated: true,
  },
  {
    id: "6",
    date: "2025-09-20",
    amount: -200,
    description: "Vacation Fund Transfer",
    category: "Vacation Fund",
    type: "expense",
    allocated: true,
  },
]

export const getUnallocatedIncome = (): number => {
  const unallocated = mockTransactions
    .filter((t) => t.type === "income" && !t.allocated)
    .reduce((sum, t) => sum + t.amount, 0)
  return isNaN(unallocated) || unallocated === null || unallocated === undefined ? 0 : unallocated
}

export const getTotalIncome = (): number => {
  const total = mockTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  return isNaN(total) || total === null || total === undefined ? 0 : total
}

export const getTotalAllocated = (): number => {
  return 4000 // Expected monthly income
}

export const getTotalCommitted = (): number => {
  const total = mockCategories
    .filter((c) => c.mode === "commitment")
    .reduce((sum, c) => {
      const amount = (c as CommitmentCategory).monthlyDue || 0
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
  return isNaN(total) || total === null || total === undefined ? 0 : total
}

export const getTotalFlexibleSpending = (): number => {
  const total = mockCategories
    .filter((c) => c.mode === "spending")
    .reduce((sum, c) => {
      const amount = (c as SpendingCategory).monthlyTarget || 0
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
  return isNaN(total) || total === null || total === undefined ? 0 : total
}

export const getTotalGoalContributions = (): number => {
  const total = mockCategories
    .filter((c) => c.mode === "goal")
    .reduce((sum, c) => {
      const weeklyAmount = (c as GoalCategory).weeklyContribution || 0
      const monthlyAmount = (isNaN(weeklyAmount) ? 0 : weeklyAmount) * 4
      return sum + monthlyAmount
    }, 0)
  return isNaN(total) || total === null || total === undefined ? 0 : total
}


// Mock data for the Saldo wealth builder app

export type Account = {
  id: string
  name: string
  type: "checking" | "savings" | "investment" | "credit"
  balance: number
  currency: string
  source: "plaid" | "csv" | "manual"
  lastSynced: string
}

export type PlannedIncome = {
  id: string
  name: string
  amount: number
  expectedDate: string
  recurrence: "once" | "weekly" | "biweekly" | "monthly"
  status: "pending" | "matched" | "missed" | "partial"
  matchedAmount?: number
  matchedTransactionId?: string
  allocations: AllocationRule[]
}

export type AllocationRule = {
  id: string
  destinationId: string
  destinationName: string
  type: "percentage" | "fixed"
  value: number
  priority: number
}

export type Transaction = {
  id: string
  date: string
  description: string
  accountId: string
  accountName: string
  type: "income" | "expense" | "transfer"
  category: string
  group: string
  amount: number
  matchedIncomeId?: string
}

export type Goal = {
  id: string
  name: string
  description: string
  targetAmount: number
  currentAmount: number
  dueDate: string
  monthlyTarget: number
  linkedAccountId: string
  linkedAccountName: string
  priority: "high" | "medium" | "low"
  color: string
  contributions: GoalContribution[]
}

export type GoalContribution = {
  id: string
  date: string
  amount: number
  source: "auto" | "manual"
  description: string
}

export type CategoryGroup = {
  id: string
  name: string
  categories: SimpleCategory[]
}

export type SimpleCategory = {
  id: string
  name: string
  groupId: string
}

// --- Mock Data ---

export const accounts: Account[] = [
  { id: "acc-1", name: "Chase Checking", type: "checking", balance: 4250.80, currency: "USD", source: "plaid", lastSynced: "2026-02-16T10:30:00Z" },
  { id: "acc-2", name: "Ally Savings", type: "savings", balance: 12800.00, currency: "USD", source: "plaid", lastSynced: "2026-02-16T10:30:00Z" },
  { id: "acc-3", name: "Vanguard Brokerage", type: "investment", balance: 34500.00, currency: "USD", source: "manual", lastSynced: "2026-02-14T08:00:00Z" },
  { id: "acc-4", name: "Amex Credit", type: "credit", balance: -1230.50, currency: "USD", source: "plaid", lastSynced: "2026-02-16T10:30:00Z" },
  { id: "acc-5", name: "Banorte Cuenta", type: "checking", balance: 45600.00, currency: "MXN", source: "csv", lastSynced: "2026-02-15T12:00:00Z" },
]

export const plannedIncomes: PlannedIncome[] = [
  {
    id: "inc-1",
    name: "Salary - Company Inc",
    amount: 5200.00,
    expectedDate: "2026-02-28",
    recurrence: "biweekly",
    status: "pending",
    allocations: [
      { id: "alloc-1", destinationId: "acc-2", destinationName: "Ally Savings", type: "percentage", value: 20, priority: 1 },
      { id: "alloc-2", destinationId: "goal-1", destinationName: "Emergency Fund", type: "fixed", value: 500, priority: 2 },
      { id: "alloc-3", destinationId: "goal-2", destinationName: "Vacation Fund", type: "fixed", value: 200, priority: 3 },
    ],
  },
  {
    id: "inc-2",
    name: "Freelance - Design Project",
    amount: 1800.00,
    expectedDate: "2026-03-05",
    recurrence: "once",
    status: "pending",
    allocations: [
      { id: "alloc-4", destinationId: "acc-3", destinationName: "Vanguard Brokerage", type: "percentage", value: 50, priority: 1 },
      { id: "alloc-5", destinationId: "goal-3", destinationName: "New Laptop", type: "fixed", value: 400, priority: 2 },
    ],
  },
  {
    id: "inc-3",
    name: "Salary - Company Inc",
    amount: 5200.00,
    expectedDate: "2026-02-14",
    recurrence: "biweekly",
    status: "matched",
    matchedAmount: 5200.00,
    matchedTransactionId: "txn-1",
    allocations: [
      { id: "alloc-6", destinationId: "acc-2", destinationName: "Ally Savings", type: "percentage", value: 20, priority: 1 },
      { id: "alloc-7", destinationId: "goal-1", destinationName: "Emergency Fund", type: "fixed", value: 500, priority: 2 },
      { id: "alloc-8", destinationId: "goal-2", destinationName: "Vacation Fund", type: "fixed", value: 200, priority: 3 },
    ],
  },
  {
    id: "inc-4",
    name: "Side Gig - Consulting",
    amount: 750.00,
    expectedDate: "2026-02-10",
    recurrence: "monthly",
    status: "partial",
    matchedAmount: 500.00,
    allocations: [
      { id: "alloc-9", destinationId: "acc-2", destinationName: "Ally Savings", type: "percentage", value: 100, priority: 1 },
    ],
  },
]

export const transactions: Transaction[] = [
  { id: "txn-1", date: "2026-02-14", description: "Company Inc - Direct Deposit", accountId: "acc-1", accountName: "Chase Checking", type: "income", category: "Salary", group: "Income", amount: 5200.00, matchedIncomeId: "inc-3" },
  { id: "txn-2", date: "2026-02-15", description: "Whole Foods Market", accountId: "acc-1", accountName: "Chase Checking", type: "expense", category: "Groceries", group: "Food & Drink", amount: -127.43 },
  { id: "txn-3", date: "2026-02-15", description: "Netflix Subscription", accountId: "acc-4", accountName: "Amex Credit", type: "expense", category: "Streaming", group: "Entertainment", amount: -15.99 },
  { id: "txn-4", date: "2026-02-14", description: "Transfer to Savings", accountId: "acc-1", accountName: "Chase Checking", type: "transfer", category: "Transfer", group: "Transfers", amount: -1040.00 },
  { id: "txn-5", date: "2026-02-13", description: "Uber Ride", accountId: "acc-4", accountName: "Amex Credit", type: "expense", category: "Rideshare", group: "Transportation", amount: -24.50 },
  { id: "txn-6", date: "2026-02-12", description: "Starbucks", accountId: "acc-4", accountName: "Amex Credit", type: "expense", category: "Coffee", group: "Food & Drink", amount: -6.75 },
  { id: "txn-7", date: "2026-02-12", description: "Gas Station", accountId: "acc-1", accountName: "Chase Checking", type: "expense", category: "Gas", group: "Transportation", amount: -52.30 },
  { id: "txn-8", date: "2026-02-11", description: "Amazon Purchase", accountId: "acc-4", accountName: "Amex Credit", type: "expense", category: "Shopping", group: "Shopping", amount: -89.99 },
  { id: "txn-9", date: "2026-02-10", description: "Consulting Payment - Client X", accountId: "acc-1", accountName: "Chase Checking", type: "income", category: "Freelance", group: "Income", amount: 500.00 },
  { id: "txn-10", date: "2026-02-10", description: "Gym Membership", accountId: "acc-1", accountName: "Chase Checking", type: "expense", category: "Fitness", group: "Health", amount: -45.00 },
  { id: "txn-11", date: "2026-02-09", description: "Electricity Bill", accountId: "acc-1", accountName: "Chase Checking", type: "expense", category: "Utilities", group: "Bills", amount: -134.20 },
  { id: "txn-12", date: "2026-02-08", description: "Rent Payment", accountId: "acc-1", accountName: "Chase Checking", type: "expense", category: "Rent", group: "Housing", amount: -1800.00 },
  { id: "txn-13", date: "2026-02-07", description: "Freelance - Logo Design", accountId: "acc-1", accountName: "Chase Checking", type: "income", category: "Freelance", group: "Income", amount: 350.00 },
  { id: "txn-14", date: "2026-02-05", description: "Target", accountId: "acc-4", accountName: "Amex Credit", type: "expense", category: "Shopping", group: "Shopping", amount: -67.82 },
  { id: "txn-15", date: "2026-02-03", description: "Restaurant - Date Night", accountId: "acc-4", accountName: "Amex Credit", type: "expense", category: "Dining", group: "Food & Drink", amount: -95.40 },
]

export const goals: Goal[] = [
  {
    id: "goal-1",
    name: "Emergency Fund",
    description: "6 months of expenses saved for emergencies",
    targetAmount: 25000,
    currentAmount: 12800,
    dueDate: "2026-12-31",
    monthlyTarget: 1220,
    linkedAccountId: "acc-2",
    linkedAccountName: "Ally Savings",
    priority: "high",
    color: "oklch(0.45 0.12 160)",
    contributions: [
      { id: "c-1", date: "2026-02-14", amount: 500, source: "auto", description: "From salary allocation" },
      { id: "c-2", date: "2026-01-31", amount: 500, source: "auto", description: "From salary allocation" },
      { id: "c-3", date: "2026-01-15", amount: 500, source: "auto", description: "From salary allocation" },
      { id: "c-4", date: "2026-01-10", amount: 200, source: "manual", description: "Extra contribution" },
    ],
  },
  {
    id: "goal-2",
    name: "Vacation Fund",
    description: "Summer trip to Japan",
    targetAmount: 5000,
    currentAmount: 2100,
    dueDate: "2026-07-01",
    monthlyTarget: 580,
    linkedAccountId: "acc-2",
    linkedAccountName: "Ally Savings",
    priority: "medium",
    color: "oklch(0.60 0.10 200)",
    contributions: [
      { id: "c-5", date: "2026-02-14", amount: 200, source: "auto", description: "From salary allocation" },
      { id: "c-6", date: "2026-01-31", amount: 200, source: "auto", description: "From salary allocation" },
      { id: "c-7", date: "2026-01-15", amount: 200, source: "auto", description: "From salary allocation" },
    ],
  },
  {
    id: "goal-3",
    name: "New Laptop",
    description: "MacBook Pro for freelance work",
    targetAmount: 2500,
    currentAmount: 1400,
    dueDate: "2026-05-01",
    monthlyTarget: 367,
    linkedAccountId: "acc-2",
    linkedAccountName: "Ally Savings",
    priority: "low",
    color: "oklch(0.50 0.08 75)",
    contributions: [
      { id: "c-8", date: "2026-02-01", amount: 400, source: "auto", description: "From freelance allocation" },
      { id: "c-9", date: "2026-01-15", amount: 400, source: "manual", description: "Manual contribution" },
    ],
  },
]

export const categoryGroups: CategoryGroup[] = [
  {
    id: "grp-1",
    name: "Income",
    categories: [
      { id: "cat-1", name: "Salary", groupId: "grp-1" },
      { id: "cat-2", name: "Freelance", groupId: "grp-1" },
      { id: "cat-3", name: "Bonus", groupId: "grp-1" },
    ],
  },
  {
    id: "grp-2",
    name: "Food & Drink",
    categories: [
      { id: "cat-4", name: "Groceries", groupId: "grp-2" },
      { id: "cat-5", name: "Dining", groupId: "grp-2" },
      { id: "cat-6", name: "Coffee", groupId: "grp-2" },
    ],
  },
  {
    id: "grp-3",
    name: "Housing",
    categories: [
      { id: "cat-7", name: "Rent", groupId: "grp-3" },
      { id: "cat-8", name: "Utilities", groupId: "grp-3" },
    ],
  },
  {
    id: "grp-4",
    name: "Transportation",
    categories: [
      { id: "cat-9", name: "Gas", groupId: "grp-4" },
      { id: "cat-10", name: "Rideshare", groupId: "grp-4" },
    ],
  },
  {
    id: "grp-5",
    name: "Entertainment",
    categories: [
      { id: "cat-11", name: "Streaming", groupId: "grp-5" },
      { id: "cat-12", name: "Events", groupId: "grp-5" },
    ],
  },
  {
    id: "grp-6",
    name: "Shopping",
    categories: [
      { id: "cat-13", name: "Shopping", groupId: "grp-6" },
      { id: "cat-14", name: "Electronics", groupId: "grp-6" },
    ],
  },
  {
    id: "grp-7",
    name: "Health",
    categories: [
      { id: "cat-15", name: "Fitness", groupId: "grp-7" },
      { id: "cat-16", name: "Medical", groupId: "grp-7" },
    ],
  },
  {
    id: "grp-8",
    name: "Bills",
    categories: [
      { id: "cat-17", name: "Insurance", groupId: "grp-8" },
      { id: "cat-18", name: "Phone", groupId: "grp-8" },
    ],
  },
  {
    id: "grp-9",
    name: "Transfers",
    categories: [
      { id: "cat-19", name: "Transfer", groupId: "grp-9" },
    ],
  },
]

// Helper functions
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function getMonthlyIncome(): number {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)
}

export function getMonthlyExpenses(): number {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

export function getNetFlow(): number {
  return getMonthlyIncome() - getMonthlyExpenses()
}

export function getTotalBalance(): number {
  return accounts.reduce((sum, a) => sum + a.balance, 0)
}

export function getTopSpendingCategories() {
  const categoryMap = new Map<string, number>()
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const current = categoryMap.get(t.group) || 0
      categoryMap.set(t.group, current + Math.abs(t.amount))
    })
  return Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
}
