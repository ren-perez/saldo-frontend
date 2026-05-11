import { useMemo } from "react"
import { buildFlowHierarchy, type HierarchyResult } from "../adapters/build-flow-hierarchy"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoalData = any

interface IncomeSummary {
  thisMonth: {
    plannedCount: number
    matchedCount: number
    missedCount: number
    totalPlanned: number
    totalMatched: number
    totalMissed: number
  }
  upcoming: Array<{ _id: string; expected_amount: number; expected_date: string; label: string }>
  avgMonthlyIncome?: number
}

interface IncomePlanItem {
  _id: string
  label: string
  expected_amount: number
  actual_amount?: number
  status: string
  expected_date: string
  recurrence?: string
}

interface MoneyFlowDataProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any
  incomeSummary?: IncomeSummary | null
  goals?: GoalData[] | null
  incomePlans?: IncomePlanItem[]
}

export interface MoneyFlowData extends HierarchyResult {
  totalIncome: number
  cashflowScore: number
  scoreColor: string
  matchedTotal: number
  plannedTotal: number
  expectedTotal: number
}

export function useMoneyFlowData({ stats, incomeSummary, goals, incomePlans }: MoneyFlowDataProps): MoneyFlowData {
  const totalIncome: number = stats?.totalIncome ?? 0
  const totalGoals: number = stats?.totalGoals ?? 0

  const dailyStats = useMemo(() => stats?.dailyStats ?? {}, [stats?.dailyStats])
  const backendFlowRows = useMemo(() => stats?.flowRows ?? [], [stats?.flowRows])
  const topCategoryGroups = useMemo(() => stats?.topCategoryGroups ?? [], [stats?.topCategoryGroups])

  const hierarchy = useMemo(
    () =>
      buildFlowHierarchy({
        backendFlowRows,
        dailyStats,
        totalIncome,
        totalGoals,
        topCategoryGroups,
        incomePlans: incomePlans ?? [],
      }),
    [backendFlowRows, dailyStats, totalIncome, totalGoals, topCategoryGroups, incomePlans]
  )

  // Cashflow score
  const totalExpenses: number = stats?.totalExpenses ?? 0
  const unallocated = Math.max(0, totalIncome - totalExpenses - totalGoals)
  const unallocatedPct = totalIncome > 0 ? (unallocated / totalIncome) * 100 : 0
  const expenseLoadPct = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const rothGoal = (goals ?? []).find((g: GoalData) => /roth|ira|retirement/i.test(g?.name ?? ""))
  const rothAutomated = rothGoal ? (rothGoal.monthly_contribution ?? 0) > 0 : false
  const rawScore = Math.round(
    Math.min(1, unallocatedPct / 100) * 40 +
    Math.max(0, 1 - expenseLoadPct / 100) * 40 +
    (rothAutomated ? 20 : 0)
  )
  const cashflowScore = Math.min(99, Math.max(0, rawScore))
  const scoreColor =
    cashflowScore >= 80 ? "text-emerald-500" :
    cashflowScore >= 60 ? "text-blue-500" :
    cashflowScore >= 40 ? "text-amber-500" :
    "text-red-500"

  const matchedTotal = incomeSummary?.thisMonth?.totalMatched ?? 0
  const plannedTotal = incomeSummary?.thisMonth?.totalPlanned ?? 0
  const expectedTotal = matchedTotal + plannedTotal || totalIncome

  return {
    ...hierarchy,
    totalIncome,
    cashflowScore,
    scoreColor,
    matchedTotal,
    plannedTotal,
    expectedTotal,
  }
}
