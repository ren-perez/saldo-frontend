"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useDashboard } from "./dashboard-context"
import { type GoalData } from "../GoalCard"
import { GoalRail } from "./spending-rhythm/goal-rail"
import { DetailsPane } from "./spending-rhythm/right-pane"
import { YearlyView, MonthlyView, WeeklyView, DailyView } from "./spending-rhythm/calendar-views"
import { type DailyStats, type PlannedIncome, type DayCell } from "./spending-rhythm/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SpendingRhythm({ stats, goals, plannedIncomes, accounts: _accounts = [], accountBalanceHistories = {}, incomeSummary, incomePlans }: { stats: any; goals?: GoalData[] | null; plannedIncomes?: PlannedIncome[]; accounts?: any[]; accountBalanceHistories?: any; incomeSummary?: any; incomePlans?: any[] }) {
  const { month, year, selectedDate, setSelectedDate, granularity, periodOffset } = useDashboard()
  const accounts = _accounts ?? []
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedDate(null) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [setSelectedDate])

  const todayStr = new Date().toISOString().split("T")[0]
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const allDays = useMemo<DayCell[]>(() => {
    const days: DayCell[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      days.push({ dayNum: d, dateKey, stats: stats?.dailyStats?.[dateKey] ?? { income: 0, expenses: 0, goals: 0, txs: [] } })
    }
    return days
  }, [month, year, daysInMonth, stats?.dailyStats])

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const padded: (DayCell | null)[] = Array(firstDay.getDay()).fill(null)
    for (const day of allDays) padded.push(day)
    const result: (DayCell | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) result.push(padded.slice(i, i + 7))
    return result
  }, [allDays, year, month])

  const weekDays = useMemo(() => {
    const start = periodOffset * 7
    return allDays.slice(start, Math.min(start + 6, daysInMonth - 1) + 1)
  }, [allDays, periodOffset, daysInMonth])

  const monthlyData = useMemo(() => {
    if (!stats?.dailyStats) return []
    const acc: Record<number, { income: number; expenses: number; goals: number }> = {}
    for (const [dateKey, dayStats] of Object.entries(stats.dailyStats)) {
      const m = parseInt(dateKey.split("-")[1], 10) - 1
      if (!acc[m]) acc[m] = { income: 0, expenses: 0, goals: 0 }
      const ds = dayStats as DailyStats
      acc[m].income += ds.income || 0
      acc[m].expenses += ds.expenses || 0
      acc[m].goals += ds.goals || 0
    }
    return Array.from({ length: 12 }, (_, i) => ({ month: i, ...(acc[i] ?? { income: 0, expenses: 0, goals: 0 }) }))
  }, [stats?.dailyStats])

  const maxMonthlyVal = useMemo(() =>
    Math.max(...monthlyData.map(m => m.income + m.expenses + m.goals), 1),
    [monthlyData]
  )

  const plannedMap = useMemo(() => {
    const map: Record<string, { total: number; items: Array<{ _id: string; label: string; amount: number }> }> = {}
    for (const p of plannedIncomes ?? []) {
      if (!map[p.expected_date]) map[p.expected_date] = { total: 0, items: [] }
      map[p.expected_date].total += p.expected_amount
      map[p.expected_date].items.push({ _id: p._id, label: p.label, amount: p.expected_amount })
    }
    return map
  }, [plannedIncomes])

  const previewHeatDay = useCallback((dateKey: string) => setHoveredDate(dateKey), [])
  const clearHeatPreview = useCallback(() => setHoveredDate(null), [])
  const handleCellClick = useCallback((day: DayCell) => {
    setSelectedDate(day.dateKey === selectedDate ? null : day.dateKey)
  }, [selectedDate, setSelectedDate])

  const calendarHandlers = {
    plannedMap,
    selectedDate,
    hoveredDate,
    todayStr,
    onCellClick: handleCellClick,
    onMouseEnter: previewHeatDay,
    onMouseLeave: clearHeatPreview,
  }

  const displayDate = hoveredDate || selectedDate
  const displayStats = displayDate ? (stats?.dailyStats?.[displayDate] as DailyStats | undefined) : null
  const isPreview = !!hoveredDate && hoveredDate !== selectedDate
  const activeGoals = (goals ?? []).filter((g) => !g.is_completed)
  const activeDayIndex = Math.min(periodOffset, daysInMonth - 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operatingCash = useMemo(() => accounts.filter((a: any) => a.type === "checking").reduce((s: number, a: any) => s + (a.balance ?? 0), 0), [accounts])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creditExposure = useMemo(() => Math.abs(accounts.filter((a: any) => a.type === "credit").reduce((s: number, a: any) => s + Math.min(0, a.balance ?? 0), 0)), [accounts])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emergencyReserve = useMemo(() => accounts.filter((a: any) => a.type === "savings").reduce((s: number, a: any) => s + (a.balance ?? 0), 0), [accounts])
  const flowMap = useMemo(() => {
    const map = new Map<string, { inflow: number; outflow: number }>()
    if (stats?.accountFlows) {
      for (const f of stats.accountFlows) map.set(f.accountId, { inflow: f.inflow, outflow: f.outflow })
    }
    return map
  }, [stats])

  const subtitle =
    granularity === "yearly" ? "Yearly view — monthly aggregates." :
    granularity === "weekly" ? "Weekly view — active week." :
    granularity === "daily" ? "Daily view — single day." :
    "Calendar pressure and goal motion."

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm transition-all duration-200 pt-0">
      <div className="flex flex-row items-center justify-between border-b border-border bg-muted/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Spending Rhythm</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] xl:grid-cols-[3fr_2fr] gap-6">
          <div>
            {granularity === "yearly" ? (
              <YearlyView monthlyData={monthlyData} maxMonthlyVal={maxMonthlyVal} />
            ) : granularity === "daily" && allDays[activeDayIndex] ? (
              <DailyView day={allDays[activeDayIndex]} handlers={calendarHandlers} />
            ) : granularity === "weekly" ? (
              <WeeklyView weekDays={weekDays} handlers={calendarHandlers} />
            ) : (
              <MonthlyView weeks={weeks} handlers={calendarHandlers} />
            )}

            {/* {granularity !== "yearly" && activeGoals.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <GoalRail activeGoals={activeGoals} />
              </div>
            )} */}
          </div>

          <DetailsPane
            displayDate={displayDate}
            displayStats={displayStats ?? null}
            isPreview={isPreview}
            month={month}
            year={year}
            plannedItems={displayDate ? plannedMap[displayDate]?.items : undefined}
            accounts={accounts}
            operatingCash={operatingCash}
            creditExposure={creditExposure}
            emergencyReserve={emergencyReserve}
            flowMap={flowMap}
            accountBalanceHistories={accountBalanceHistories}
            periodStats={{
              income: stats?.totalIncome ?? 0,
              expenses: stats?.totalExpenses ?? 0,
              goals: stats?.totalGoals ?? 0,
            }}
            stats={stats}
            incomeSummary={incomeSummary}
            goals={goals ?? undefined}
            incomePlans={incomePlans}
          />
        </div>

        {/* {granularity === "yearly" && activeGoals.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <GoalRail activeGoals={activeGoals} />
          </div>
        )} */}
      </CardContent>
    </Card>
  )
}
