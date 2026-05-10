"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { currency } from "@/lib/format"
import { useDashboard } from "./dashboard-context"
import type { GoalData } from "../GoalCard"

const toneStyles = {
  red: { bg: "bg-red-500/10" },
  blue: { bg: "bg-blue-500/10" },
  green: { bg: "bg-emerald-500/10" },
} as const

const toneBorderVar: Record<string, string> = {
  red: "var(--color-red-500)",
  blue: "var(--color-blue-500)",
  green: "var(--color-emerald-500)",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function StrategicBriefing({ stats, goals }: { stats: any; goals?: GoalData[] | null }) {
  const { month, year } = useDashboard()

  const income = stats?.totalIncome ?? 0
  const expenses = stats?.totalExpenses ?? 0
  const goalsTotal = stats?.totalGoals ?? 0
  const netFlow = income - expenses - goalsTotal

  const dailyStats = stats?.dailyStats ?? {}
  const activeDays = Object.keys(dailyStats).length
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // --- Dynamic Insight Notes ---

  const topGroup = stats?.topCategoryGroups?.[0]
  const topCategory = topGroup?.categories?.[0]
  const pressureBody = topCategory
    ? `${topCategory.name} is the largest pressure point at ${currency(topCategory.amount)}${topGroup.categories.length > 1 ? ` \u2014 ${topGroup.categories.slice(1, 3).map((c: { name: string }) => c.name).join(", ")}` : ""}.`
    : "No tracked spending categories yet."

  const dailyBridge = activeDays > 0 ? (income - goalsTotal) / activeDays : 0
  const runwayBody = `Income is a timing problem more than an earning problem: the current bridge supports ${currency(Math.round(dailyBridge))}/day.`

  const rothGoal = goals?.find((g) => /roth|ira|retirement/i.test(g.name))
  const rothBody = rothGoal
    ? `Roth contributed ${currency(rothGoal.monthly_contribution)} this month; year progress is ${Math.round(((rothGoal.current_amount + rothGoal.monthly_contribution) / rothGoal.total_amount) * 100)}% toward the ${currency(rothGoal.total_amount)} limit.`
    : `Net flow of ${currency(Math.abs(netFlow))} ${netFlow >= 0 ? "surplus" : "deficit"} this period.`

  const notes = [
    { tone: "red" as const, title: "Pressure", body: pressureBody },
    { tone: "blue" as const, title: "Runway", body: runwayBody },
    { tone: "green" as const, title: "Discipline", body: rothBody },
  ]

  // --- Period Signals ---

  const habitDensity = daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0
  const topPressure = topGroup?.groupName ?? null
  const nextLever = stats?.topCategoryGroups?.[1]?.groupName ?? null

  // --- Goal Rail ---

  const activeGoals = (goals ?? []).filter((g) => !g.is_completed)
  const displayGoals = activeGoals.slice(0, 3)

  return (
    <Card className="grid grid-cols-1 md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] gap-4 p-4 border border-border bg-card/60 backdrop-blur-sm shadow-sm">
      {/* Left */}
      <div className="flex flex-col min-w-0">
        <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">Strategic Briefing</p>
        <h3 className="text-lg font-bold leading-tight mb-2">Why the numbers matter</h3>
        <p className="text-xs text-muted-foreground mb-4">
          This layer translates the period into operating instructions: protect the runway, separate work fuel from drift, and keep goals automated.
        </p>

        {/* Period Signals */}
        {(habitDensity > 0 || topPressure || nextLever) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {habitDensity > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 rounded-md px-2 py-1 border border-border/50">
                <span className="text-foreground tabular-nums">{habitDensity}%</span> habit density
              </span>
            )}
            {topPressure && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 rounded-md px-2 py-1 border border-border/50">
                <span className="text-foreground">{topPressure}</span> top pressure
              </span>
            )}
            {nextLever && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 rounded-md px-2 py-1 border border-border/50">
                <span className="text-foreground">{nextLever}</span> next lever
              </span>
            )}
          </div>
        )}

        {/* Insight Notes */}
        <div className="grid gap-2">
          {notes.map((n, i) => (
            <div
              key={i}
              className={cn("relative p-2.5 pl-3 border border-border border-l-[3px] rounded-lg", toneStyles[n.tone].bg)}
              style={{ borderLeftColor: toneBorderVar[n.tone] }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-foreground">{n.title}</p>
              <span className="block text-[11px] text-muted-foreground leading-snug">{n.body}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col gap-3">
        {/* Goal Progress Rail */}
        {displayGoals.length > 0 && (
          <div className="border border-border rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Goal Progress</p>
              <Link href="/goals" className="text-[10px] text-primary hover:underline font-medium">
                View all
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              {displayGoals.map((goal) => {
                const pct = goal.total_amount > 0 ? Math.round((goal.current_amount / goal.total_amount) * 100) : 0
                return (
                  <Link key={goal._id} href={`/goals/${goal._id}`} className="block rounded-lg transition-colors hover:bg-muted/40 -mx-1 px-1">
                    <div className="flex items-center gap-2 py-1.5">
                      <span className="text-base flex-shrink-0">{goal.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-foreground truncate">{goal.name}</p>
                          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground flex-shrink-0">{pct}%</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Period Summary */}
        <div className="border border-border rounded-xl p-3 bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center mb-2">Period Summary</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card rounded-lg p-2.5 text-center border border-border/50">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Income</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{currency(income)}</p>
            </div>
            <div className="bg-card rounded-lg p-2.5 text-center border border-border/50">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Spent</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">{currency(expenses)}</p>
            </div>
            <div className="bg-card rounded-lg p-2.5 text-center border border-border/50">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Goals</p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">{currency(goalsTotal)}</p>
            </div>
            <div className="bg-card rounded-lg p-2.5 text-center border border-border/50">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Net</p>
              <p className={cn("text-sm font-bold tabular-nums", netFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {currency(Math.abs(netFlow))}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Tracking {activeDays} active days in {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </Card>
  )
}
