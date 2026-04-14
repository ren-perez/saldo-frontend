"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { currency, currencyExact } from "@/lib/format"

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

type DailyTx = { description: string; amount: number; category?: string }
type DailyStats = { income: number; expenses: number; goals: number; txs?: DailyTx[] }

type CategoryEntry = { name: string; categoryId: string; amount: number }

type GroupEntry = {
  groupName: string
  groupId: string
  amount: number
  categories: CategoryEntry[]
}

type DashboardStats = {
  totalIncome: number
  totalExpenses: number
  totalReimbursements: number
  totalGoals: number
  netFlow: number
  topCategoryGroups: GroupEntry[]
  weeklyBreakdown: { weekStart: number; income: number; expenses: number }[]
  accountFlows: { accountId: string; accountName: string; inflow: number; outflow: number }[]
  dailyStats: Record<string, DailyStats>
}

interface MonthlyOverviewProps {
  stats: DashboardStats | undefined
  month: number
  year: number
  onMonthChange: (delta: number) => void
  onGoToToday: () => void
}

// --- Heatmap helpers ---

function formatCompact(amount: number): string {
  if (amount === 0) return ""
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`
  return Math.round(amount).toString()
}

// Minimum section height (%) to render an inline label
const MIN_LABEL_PCT = 24

type DayCell = { dayNum: number; dateKey: string; stats: DailyStats }

function HeatmapCell({
  day,
  month,
  todayStr,
  onNavigate,
}: {
  day: DayCell
  month: number
  todayStr: string
  onNavigate: (params: Record<string, string>) => void
}) {
  const { income, expenses, goals } = day.stats
  const total = income + expenses + goals
  const hasActivity = total > 0

  const incomePct = hasActivity ? (income / total) * 100 : 0
  const expPct = hasActivity ? (expenses / total) * 100 : 0
  const goalsPct = hasActivity ? (goals / total) * 100 : 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative w-full aspect-square rounded-md overflow-hidden transition-all duration-150",
            "hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            !hasActivity && "bg-muted/30",
            day.dateKey === todayStr && "ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
          )}
        >
          {/* Proportional vertical fill — income top, expenses mid, goals bottom */}
          {hasActivity && (
            <div className="absolute inset-0 flex flex-col">
              {income > 0 && (
                <div
                  style={{ height: `${incomePct}%` }}
                  className="bg-emerald-400/60 dark:bg-emerald-700/50 flex items-center justify-center overflow-hidden shrink-0"
                >
                  {incomePct >= MIN_LABEL_PCT && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-900 dark:text-emerald-100 leading-none px-0.5 drop-shadow-sm">
                      {formatCompact(income)}
                    </span>
                  )}
                </div>
              )}
              {expenses > 0 && (
                <div
                  style={{ height: `${expPct}%` }}
                  className="bg-red-400/60 dark:bg-red-700/50 flex items-center justify-center overflow-hidden shrink-0"
                >
                  {expPct >= MIN_LABEL_PCT && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-red-900 dark:text-red-100 leading-none px-0.5 drop-shadow-sm">
                      {formatCompact(expenses)}
                    </span>
                  )}
                </div>
              )}
              {goals > 0 && (
                <div
                  style={{ height: `${goalsPct}%` }}
                  className="bg-blue-400/60 dark:bg-blue-700/50 flex items-center justify-center overflow-hidden shrink-0"
                >
                  {goalsPct >= MIN_LABEL_PCT && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-blue-900 dark:text-blue-100 leading-none px-0.5 drop-shadow-sm">
                      {formatCompact(goals)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Day number — top-left, always on top */}
          <span className={cn(
            "absolute top-1 left-1 text-[7px] sm:text-[8px] leading-none font-semibold z-10 tabular-nums",
            hasActivity ? "text-foreground/80" : "text-foreground/35"
          )}>
            {day.dayNum}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-60 p-0 shadow-md" align="center" side="bottom" sideOffset={4}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground">
            {monthNames[month]} {day.dayNum}
          </span>
          <button
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-150"
            onClick={() => onNavigate({ startDate: day.dateKey, endDate: day.dateKey })}
          >
            <span className="text-[10px]">View all</span>
            <ExternalLink className="size-3" />
          </button>
        </div>

        {!hasActivity && (
          <p className="text-xs text-muted-foreground text-center py-3">No activity</p>
        )}

        {/* Income section */}
        {income > 0 && (
          <div className="px-3 py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-emerald-400/60 dark:bg-emerald-700/50 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Income</span>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {currencyExact(income)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {(day.stats.txs ?? []).filter(tx => tx.amount > 0).map((tx, i) => (
                <div key={i} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                    {tx.description}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">
                    {currencyExact(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses section */}
        {expenses > 0 && (
          <div className="px-3 py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-red-400/60 dark:bg-red-700/50 shrink-0" />
                <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">Expenses</span>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-red-700 dark:text-red-400">
                {currencyExact(expenses)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {(day.stats.txs ?? []).filter(tx => tx.amount < 0).map((tx, i) => (
                <div key={i} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                    {tx.description}
                    {tx.category && (
                      <span className="text-muted-foreground/40 ml-1">· {tx.category}</span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">
                    {currencyExact(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals section — totals only, no linked transactions */}
        {goals > 0 && (
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-blue-400/60 dark:bg-blue-700/50 shrink-0" />
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Goals</span>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                {currencyExact(goals)}
              </span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function HeatmapGrid({
  year,
  month,
  dailyStats,
  onNavigate,
}: {
  year: number
  month: number
  dailyStats: Record<string, DailyStats>
  onNavigate: (params: Record<string, string>) => void
}) {
  const todayStr = new Date().toISOString().split("T")[0]

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()

  const days: (DayCell | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateKey = new Date(year, month, d).toISOString().split("T")[0]
    days.push({ dayNum: d, dateKey, stats: dailyStats[dateKey] ?? { income: 0, expenses: 0, goals: 0 } })
  }

  const weeks: (DayCell | null)[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <div className="flex flex-col gap-1">
      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] sm:text-[11px] text-muted-foreground font-medium py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 gap-1">
          {week.map((day, dayIdx) =>
            day ? (
              <HeatmapCell
                key={dayIdx}
                day={day}
                month={month}
                todayStr={todayStr}
                onNavigate={onNavigate}
              />
            ) : (
              <div key={dayIdx} className="aspect-square" />
            )
          )}
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-2 text-[9px] sm:text-[10px] text-muted-foreground">
        <div className="flex gap-x-3 gap-y-1">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-emerald-400/60 dark:bg-emerald-700/50 inline-block" />
            Income
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-red-400/60 dark:bg-red-700/50 inline-block" />
            Expenses
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-blue-400/60 dark:bg-blue-700/50 inline-block" />
            Goals
          </span>
        </div>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm ring-2 ring-primary/70 inline-block" />
          Today
        </span>
      </div>
    </div>
  )
}

// --- Accordion Spending Breakdown ---

function SpendingBreakdown({
  groups,
  expenses,
  month,
  year,
  onNavigate,
}: {
  groups: GroupEntry[]
  expenses: number
  month: number
  year: number
  onNavigate: (params: Record<string, string>) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(groupId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No spending data this month</p>
  }

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`
  const monthEnd = new Date(year, month + 1, 0).toISOString().split("T")[0]

  return (
    <div className="flex flex-col gap-4">
      {groups.map((grp) => {
        const percentage = expenses > 0 ? (grp.amount / expenses) * 100 : 0
        const isOpen = expanded.has(grp.groupId)
        const hasCategories = grp.categories.length > 0

        return (
          <div key={grp.groupId} className="flex flex-col gap-1.5">
            {/* Group row — full row is clickable for accordion except the name button */}
            <div
              className={cn("flex items-center gap-2", hasCategories && "cursor-pointer")}
              onClick={() => hasCategories && toggle(grp.groupId)}
            >
              {/* Name + ExternalLink — content-width only, stops propagation, navigates */}
              <button
                className="inline-flex items-center gap-1 max-w-[55%] group/name text-left shrink overflow-hidden"
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate({ groupId: grp.groupId, startDate: monthStart, endDate: monthEnd })
                }}
                title={`View ${grp.groupName} transactions`}
              >
                <span className="text-sm font-medium text-foreground truncate group-hover/name:underline decoration-muted-foreground underline-offset-2">
                  {grp.groupName}
                </span>
                <ExternalLink className="size-3 shrink-0 text-muted-foreground/40 group-hover/name:text-muted-foreground transition-colors duration-150" />
              </button>

              {/* Spacer — fills the toggle zone between name and stats */}
              <div className="flex-1" />

              {/* Stats */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">{Math.round(percentage)}%</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{currencyExact(grp.amount)}</span>
              </div>

              {/* Chevron — far right, outside progress bar width */}
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 transition-transform duration-200",
                  hasCategories ? "text-muted-foreground/60" : "invisible",
                  isOpen && "rotate-180"
                )}
              />
            </div>

            {/* Progress bar — mr-7 so right edge aligns with amount, not chevron */}
            <div
              className={cn("h-1 rounded-full bg-primary/10 overflow-hidden mr-6", hasCategories && "cursor-pointer hover:bg-primary/20 transition-colors duration-150")}
              onClick={() => hasCategories && toggle(grp.groupId)}
            >
              <div
                className="h-full rounded-full bg-primary/70 transition-[width] duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Category sub-rows — CSS height transition */}
            <div
              className={cn(
                "flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
                isOpen && hasCategories ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="flex flex-col gap-3 pt-2 pb-2 pl-2 pr-8 border-l-2 border-border/60">
                {grp.categories.map((cat) => {
                  const catPct = grp.amount > 0 ? (cat.amount / grp.amount) * 100 : 0
                  return (
                    <div key={cat.categoryId} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        {/* Category name + link — unified group */}
                        <button
                          className="flex items-center gap-1 min-w-0 flex-1 group/cat text-left"
                          onClick={() =>
                            onNavigate({ categoryId: cat.categoryId, startDate: monthStart, endDate: monthEnd })
                          }
                          title={`View ${cat.name} transactions`}
                        >
                          <span className="text-xs text-muted-foreground truncate group-hover/cat:text-foreground group-hover/cat:underline decoration-muted-foreground underline-offset-2 transition-colors duration-150">
                            {cat.name}
                          </span>
                          <ExternalLink className="size-2.5 shrink-0 text-muted-foreground/30 group-hover/cat:text-muted-foreground transition-colors duration-150" />
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <span className="text-[11px] text-muted-foreground/60 tabular-nums">{Math.round(catPct)}%</span>
                          <span className="text-xs tabular-nums font-medium text-foreground">{currencyExact(cat.amount)}</span>
                        </div>
                      </div>
                      <div className="h-0.5 rounded-full bg-primary/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/50 transition-[width] duration-500 ease-out"
                          style={{ width: `${catPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Main component ---

export function MonthlyOverview({ stats, month, year, onMonthChange, onGoToToday }: MonthlyOverviewProps) {
  const router = useRouter()
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()

  const income = stats?.totalIncome ?? 0
  const grossExpenses = stats?.totalExpenses ?? 0
  const reimbursements = stats?.totalReimbursements ?? 0
  const expenses = Math.max(0, grossExpenses - reimbursements)
  const goals = stats?.totalGoals ?? 0
  const isLoading = stats === undefined

  function navigateToTransactions(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString()
    router.push(`/transactions?${qs}`)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-semibold">Monthly Overview</CardTitle>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onGoToToday}
            >
              Today
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => onMonthChange(-1)}
          >
            <ChevronLeft className="size-3.5" />
            <span className="sr-only">Previous month</span>
          </Button>
          <span className="w-[120px] text-center text-sm font-medium text-foreground tabular-nums">
            {monthNames[month]} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => onMonthChange(1)}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="size-3.5" />
            <span className="sr-only">Next month</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-6">
          {/* KPI: Income / Expenses / Goals */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-muted-foreground">
            <div className="flex flex-col gap-1 px-2 py-1.5 sm:px-4 sm:py-1.5 border-r border-border/50">
              <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                {/* <TrendingUp className="size-3 shrink-0" /> */}
                Income
              </span>
              <span className="text-xs sm:text-sm font-semibold tabular-nums text-emerald-700/90 dark:text-emerald-400/90">
                {currency(income)}
              </span>
            </div>
            <div className="flex flex-col gap-1 px-2 py-1.5 sm:px-4 sm:py-1.5 text-right">
              <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground justify-end">
                Expenses
              </span>
              <span className="text-xs sm:text-sm font-semibold tabular-nums text-red-700/90 dark:text-red-400/90">
                {currency(expenses)}
              </span>
            </div>
            <div className="flex flex-col gap-1 px-2 py-1.5 sm:px-4 sm:py-1.5 text-right">
              <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground justify-end">
                {/* <Target className="size-3 shrink-0" /> */}
                Goals
              </span>
              <span className="text-xs sm:text-sm font-semibold tabular-nums text-blue-600/90 dark:text-blue-400/90">
                {currency(goals)}
              </span>
            </div>
            <div className="flex flex-col gap-1 px-2 py-1.5 sm:px-4 sm:py-1.5 text-right">
              <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground justify-end">
                {/* <Target className="size-3 shrink-0" /> */}
                Unallocated
              </span>
              <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground-600 dark:text-foreground-400">
                {currency(Math.abs(income - expenses - goals))}
              </span>
            </div>
          </div>

          <Tabs defaultValue="category" className="w-full">
            <TabsList className="h-8 w-full">
              <TabsTrigger value="category" className="text-sm px-2.5 h-7">Category</TabsTrigger>
              <TabsTrigger value="heatmap" className="text-sm px-2.5 h-7">Heatmap</TabsTrigger>
            </TabsList>

            {/* Category tab */}
            <TabsContent value="category" className="mt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">

                  {/* Accordion spending breakdown */}
                  <SpendingBreakdown
                    groups={stats.topCategoryGroups}
                    expenses={expenses}
                    month={month}
                    year={year}
                    onNavigate={navigateToTransactions}
                  />
                </div>
              )}
            </TabsContent>

            {/* Heatmap tab */}
            <TabsContent value="heatmap" className="mt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <HeatmapGrid
                  year={year}
                  month={month}
                  dailyStats={stats.dailyStats ?? {}}
                  onNavigate={navigateToTransactions}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}
