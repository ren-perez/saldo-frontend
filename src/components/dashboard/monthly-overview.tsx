"use client"

import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { currencyExact } from "@/lib/format"

const months = [
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
}

interface MonthlyOverviewProps {
  stats: DashboardStats
  month: number
  year: number
  onMonthChange: (delta: number) => void
}

function formatWeekLabel(weekStart: number, endDate: number): string {
  const start = new Date(weekStart)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const end = new Date(Math.min(weekStart + msPerWeek - 1, endDate))
  const monthName = start.toLocaleDateString("en-US", { month: "short" })
  return `${monthName} ${start.getDate()}-${end.getDate()}`
}

export function MonthlyOverview({ stats, month, year, onMonthChange }: MonthlyOverviewProps) {
  const { totalIncome: income, totalExpenses: expenses, netFlow } = stats

  const now = new Date()
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className=" font-semibold">Monthly Overview</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => onMonthChange(-1)}
          >
            <ChevronLeft className="size-3.5" />
            <span className="sr-only">Previous month</span>
          </Button>
          <span className="min-w-[80px] text-center text-sm font-medium text-foreground">
            {months[month]} {year}
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
      <CardContent className="flex flex-col gap-4">
        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="size-3" />
              Income
            </span>
            <span className="text-base font-semibold tabular-nums text-foreground">{currencyExact(income)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingDown className="size-3" />
              Expenses
            </span>
            <span className="text-base font-semibold tabular-nums text-foreground">{currencyExact(expenses)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowUpDown className="size-3" />
              Net flow
            </span>
            <span className={`text-base font-semibold tabular-nums ${netFlow >= 0 ? "text-success" : "text-destructive"}`}>
              {netFlow >= 0 ? "+" : ""}{currencyExact(netFlow)}
            </span>
          </div>
        </div>

        {/* Tabbed Views */}
        <Tabs defaultValue="spending" className="w-full">
          <TabsList className="h-7 w-full">
            <TabsTrigger value="spending" className="text-sm h-5 px-2.5">Spending</TabsTrigger>
            <TabsTrigger value="weekly" className="text-sm h-5 px-2.5">Weekly</TabsTrigger>
            <TabsTrigger value="accounts" className="text-sm h-5 px-2.5">By Account</TabsTrigger>
          </TabsList>

          <TabsContent value="spending" className="mt-3">
            <div className="flex flex-col gap-2.5">
              {stats.topCategoryGroups.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No spending data this month</p>
              )}
              {stats.topCategoryGroups.map((cat) => {
                const percentage = expenses > 0 ? (cat.amount / expenses) * 100 : 0
                return (
                  <div key={cat.groupName} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{cat.groupName}</span>
                      <div className="flex items-center gap-2">
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
          </TabsContent>

          <TabsContent value="weekly" className="mt-3">
            <div className="flex flex-col gap-2.5">
              {stats.weeklyBreakdown.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data this month</p>
              )}
              {stats.weeklyBreakdown.map((week) => {
                const endDate = new Date(year, month + 1, 0).getTime()
                const maxVal = Math.max(...stats.weeklyBreakdown.map(w => Math.max(w.income, w.expenses)), 1)
                return (
                  <div key={week.weekStart} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{formatWeekLabel(week.weekStart, endDate)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-success tabular-nums">+{currencyExact(week.income)}</span>
                        <span className="text-muted-foreground tabular-nums">-{currencyExact(week.expenses)}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 h-1">
                      <div className="rounded-full bg-success/70 transition-all" style={{ width: `${(week.income / maxVal) * 100}%` }} />
                      <div className="rounded-full bg-muted-foreground/30 transition-all" style={{ width: `${(week.expenses / maxVal) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="mt-3">
            <div className="flex flex-col gap-2.5">
              {stats.accountFlows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No account activity this month</p>
              )}
              {stats.accountFlows.map((acct) => (
                <div key={acct.accountId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{acct.accountName}</span>
                  <div className="flex items-center gap-3 text-sm tabular-nums">
                    {acct.inflow > 0 && <span className="text-success">+{currencyExact(acct.inflow)}</span>}
                    {acct.outflow > 0 && <span className="text-muted-foreground">-{currencyExact(acct.outflow)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
