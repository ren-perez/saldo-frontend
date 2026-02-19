"use client"

import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { currency, currencyExact } from "@/lib/format"

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

type DashboardStats = {
  totalIncome: number
  totalExpenses: number
  netFlow: number
  topCategoryGroups: { groupName: string; amount: number }[]
  weeklyBreakdown: { weekStart: number; income: number; expenses: number }[]
  accountFlows: { accountId: string; accountName: string; inflow: number; outflow: number }[]
  dailyNet?: Record<string, number>
}

interface MonthlyOverviewProps {
  stats: DashboardStats | undefined
  month: number
  year: number
  onMonthChange: (delta: number) => void
  onGoToToday: () => void
}

// --- Expense Heatmap helpers ---

function getIntensityColor(net: number): string {
  if (net === 0) return "bg-muted/30"
  // Positive = income (green)
  if (net > 0) {
    if (net < 100) return "bg-emerald-200/40 dark:bg-emerald-900/30"
    if (net < 300) return "bg-emerald-300/50 dark:bg-emerald-800/40"
    if (net < 600) return "bg-emerald-400/60 dark:bg-emerald-700/50"
    return "bg-emerald-500/70 dark:bg-emerald-600/60"
  }
  // Negative = expense (red)
  const abs = Math.abs(net)
  if (abs < 50) return "bg-red-200/40 dark:bg-red-900/30"
  if (abs < 150) return "bg-red-300/50 dark:bg-red-800/40"
  if (abs < 300) return "bg-red-400/60 dark:bg-red-700/50"
  if (abs < 500) return "bg-red-500/70 dark:bg-red-600/60"
  return "bg-red-600/80 dark:bg-red-500/70"
}

function formatCompact(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1000) return `${Math.round(abs / 1000)}k`
  if (abs > 0) return Math.round(abs).toString()
  return ""
}

function HeatmapGrid({
  year,
  month,
  dailyNet,
}: {
  year: number
  month: number
  dailyNet: Record<string, number>
}) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() // 0 = Sunday

  const days: Array<{ dayNum: number; net: number } | null> = []

  for (let i = 0; i < startPad; i++) days.push(null)
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateKey = new Date(year, month, day).toISOString().split("T")[0]
    days.push({ dayNum: day, net: dailyNet[dateKey] ?? 0 })
  }

  const weeks: Array<typeof days> = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={i} className="text-center text-[10px] sm:text-[11px] text-muted-foreground font-medium py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 gap-1">
          {week.map((day, dayIdx) =>
            day ? (
              <div
                key={dayIdx}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-md aspect-square transition-all duration-200",
                  getIntensityColor(day.net),
                  "hover:ring-2 hover:ring-primary/40 cursor-pointer"
                )}
                title={`${monthNames[month]} ${day.dayNum}: ${day.net === 0 ? "No activity" : currencyExact(day.net)}`}
              >
                {/* Day number — top-left corner */}
                <span className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] leading-none text-foreground/50 font-medium">
                  {day.dayNum}
                </span>
                {/* Amount — center */}
                {day.net !== 0 && (
                  <span className={cn(
                    "text-[9px] sm:text-[10px] leading-none font-semibold mt-1",
                    day.net > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                  )}>
                    {formatCompact(day.net)}
                  </span>
                )}
              </div>
            ) : (
              <div key={dayIdx} className="aspect-square" />
            )
          )}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-1.5">
        <span className="text-[9px] sm:text-[10px] text-muted-foreground mr-0.5">Income</span>
        <div className="size-2.5 sm:size-3 rounded-sm bg-emerald-500/70 dark:bg-emerald-600/60" />
        <div className="size-2.5 sm:size-3 rounded-sm bg-emerald-300/50 dark:bg-emerald-800/40" />
        <div className="size-2.5 sm:size-3 rounded-sm bg-muted/30" />
        <div className="size-2.5 sm:size-3 rounded-sm bg-red-300/50 dark:bg-red-800/40" />
        <div className="size-2.5 sm:size-3 rounded-sm bg-red-600/80 dark:bg-red-500/70" />
        <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-0.5">Expense</span>
      </div>
    </div>
  )
}

// --- Main component ---

export function MonthlyOverview({ stats, month, year, onMonthChange, onGoToToday }: MonthlyOverviewProps) {
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()

  const income = stats?.totalIncome ?? 0
  const expenses = stats?.totalExpenses ?? 0
  const netFlow = stats?.netFlow ?? 0
  const isLoading = stats === undefined

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="h-7 w-full">
            <TabsTrigger value="overview" className="text-sm h-5 px-2.5">Overview</TabsTrigger>
            <TabsTrigger value="heatmap" className="text-sm h-5 px-2.5">Heatmap</TabsTrigger>
            {/* <TabsTrigger value="accounts" className="text-sm h-5 px-2.5">By Account</TabsTrigger> */}
          </TabsList>

          {/* Overview tab: stats + spending breakdown */}
          <TabsContent value="overview" className="mt-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="flex flex-col gap-0.5 rounded-md border border-border px-2 py-1.5 sm:px-3 sm:py-2">
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                      <TrendingUp className="size-3 shrink-0" />
                      Income
                    </span>
                    <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                      {currency(income)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-md border border-border px-2 py-1.5 sm:px-3 sm:py-2">
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                      <TrendingDown className="size-3 shrink-0" />
                      Expenses
                    </span>
                    <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                      {currency(expenses)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-md border border-border px-2 py-1.5 sm:px-3 sm:py-2">
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                      <ArrowUpDown className="size-3 shrink-0" />
                      Net flow
                    </span>
                    <span className={cn(
                      "text-xs sm:text-sm font-semibold tabular-nums",
                      netFlow >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {netFlow >= 0 ? "+" : ""}{currency(netFlow)}
                    </span>
                  </div>
                </div>

                {/* Spending breakdown */}
                <div className="flex flex-col gap-2.5">
                  {stats.topCategoryGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No spending data this month</p>
                  )}
                  {stats.topCategoryGroups.map((cat) => {
                    const percentage = expenses > 0 ? (cat.amount / expenses) * 100 : 0
                    return (
                      <div key={cat.groupName} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground truncate mr-2">{cat.groupName}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                            <span className="font-medium tabular-nums text-foreground">{currencyExact(cat.amount)}</span>
                          </div>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
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
                dailyNet={stats.dailyNet ?? {}}
              />
            )}
          </TabsContent>

          {/* By Account tab */}
          <TabsContent value="accounts" className="mt-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {stats.accountFlows.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No account activity this month</p>
                )}
                {stats.accountFlows.map((acct) => (
                  <div key={acct.accountId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="text-sm font-medium text-foreground truncate mr-2">{acct.accountName}</span>
                    <div className="flex items-center gap-3 text-sm tabular-nums shrink-0">
                      {acct.inflow > 0 && <span className="text-success">+{currencyExact(acct.inflow)}</span>}
                      {acct.outflow > 0 && <span className="text-muted-foreground">-{currencyExact(acct.outflow)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
