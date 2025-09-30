export interface Transaction {
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

export const mockTransactions: Transaction[] = [
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
