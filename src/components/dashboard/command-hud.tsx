"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { currency } from "@/lib/format"
import { useDashboard, type Granularity } from "./dashboard-context"
import type { GoalData } from "../GoalCard"

type IncomeSummary = {
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

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const monthShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function formatPeriodLabel(month: number, year: number, granularity: Granularity, periodOffset: number): string {
  if (granularity === "yearly") return `${year}`
  if (granularity === "monthly") return `${monthNames[month]} ${year}`
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  if (granularity === "weekly") {
    const wkStart = periodOffset * 7 + 1
    const wkEnd = Math.min(wkStart + 6, daysInMonth)
    return `Wk ${periodOffset + 1} · ${monthShort[month]} ${wkStart}–${wkEnd}`
  }
  const day = Math.min(periodOffset + 1, daysInMonth)
  return `${monthShort[month]} ${day}, ${year}`
}

function scrollToModule(moduleId: string) {
  const el = document.getElementById(moduleId)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

const toneStyles: Record<string, { bg: string }> = {
  red: { bg: "bg-red-500/10" },
  blue: { bg: "bg-blue-500/10" },
  green: { bg: "bg-emerald-500/10" },
  amber: { bg: "bg-amber-500/10" },
  purple: { bg: "bg-purple-500/10" },
}

const toneBorderVar: Record<string, string> = {
  red: "var(--color-red-500)",
  blue: "var(--color-blue-500)",
  green: "var(--color-emerald-500)",
  amber: "var(--color-amber-500)",
  purple: "var(--color-purple-500)",
}

const focusTones: Record<string, string> = {
  green: "border-l-emerald-500 bg-emerald-500/5",
  red: "border-l-red-500 bg-red-500/5",
  amber: "border-l-amber-500 bg-amber-500/5",
  blue: "border-l-blue-500 bg-blue-500/5",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CommandHUD({ stats, accounts: _accounts, goals, incomeSummary }: { stats: any; accounts?: any; goals?: GoalData[] | null; incomeSummary?: IncomeSummary | null }) {
  void _accounts
  const { month, year, granularity, periodOffset } = useDashboard()
  const periodLabel = formatPeriodLabel(month, year, granularity, periodOffset)

  // --- KPI Cards (from Command Center) ---
  const kpiItems = [
    { label: "System health", value: "Nominal", sub: "cashflow score 82 / 99", color: "bg-emerald-500", textColor: "text-emerald-500" },
    { label: "Runway", value: "$45.20/day", sub: "14 days to paycheck", color: "bg-emerald-500", textColor: "text-emerald-500" },
    { label: "Protected capital", value: "$6,800", sub: "reserve + core rails", color: "bg-blue-500", textColor: "text-blue-500" },
    { label: "Next paycheck", value: "$4,376", sub: "planned relief event", color: "bg-amber-500", textColor: "text-amber-500" },
    { label: "Goal automation", value: "Automation live", sub: "21% Roth · 31% EF", color: "bg-emerald-500", textColor: "text-emerald-500" },
  ]

  // --- Strategic Briefing Data ---
  const income = stats?.totalIncome ?? 0
  const expenses = stats?.totalExpenses ?? 0
  const goalsTotal = stats?.totalGoals ?? 0
  const netFlow = income - expenses - goalsTotal
  const dailyStats = stats?.dailyStats ?? {}
  const activeDays = Object.keys(dailyStats).length
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const topGroup = stats?.topCategoryGroups?.[0]
  const topCategory = topGroup?.categories?.[0]
  const upcomingIncome = incomeSummary?.upcoming ?? []
  const avgMonthly = incomeSummary?.avgMonthlyIncome ?? 0

  const topCatAmount = topCategory?.amount ?? 0

  const rothGoal = goals?.find((g) => /roth|ira|retirement/i.test(g.name))

  // --- Period Signals ---
  const habitDensity = daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0
  const topPressure = topGroup?.groupName ?? null
  const nextLever = stats?.topCategoryGroups?.[1]?.groupName ?? null

  // --- Goal Rail ---
  const activeGoals = (goals ?? []).filter((g) => !g.is_completed)
  const displayGoals = activeGoals.slice(0, 3)

  // --- Module Focus Cards ---
  const netTone = netFlow >= 0 ? "green" : "red"

  const unallocated = Math.max(0, income - expenses - goalsTotal)
  const expenseLoadPct = income > 0 ? (expenses / income) * 100 : 0
  const rothAutomated = rothGoal ? (rothGoal.monthly_contribution ?? 0) > 0 : false
  const unallocatedPct = income > 0 ? (unallocated / income) * 100 : 0
  const rawScore = Math.round(
    Math.min(1, unallocatedPct / 100) * 40 +
    Math.max(0, 1 - expenseLoadPct / 100) * 40 +
    (rothAutomated ? 20 : 0)
  )
  const cashflowScore = Math.min(99, Math.max(0, rawScore))
  const scoreTone = cashflowScore >= 80 ? "green" : cashflowScore >= 60 ? "blue" : cashflowScore >= 40 ? "amber" : "red"

  const affordLabel = unallocated > 0 ? "Safe" : "Tight"
  const affordTone = unallocated > 0 ? "green" : "amber"
  const dailyCap = activeDays > 0 ? Math.round((income - expenses) / activeDays) : 0

  const rhythmTone = activeDays > 18 ? "amber" : "blue"

  const focusCards = [
    { key: "cc-module-money-flow", title: "Money Flow", value: currency(netFlow), sub: "flow remainder", tone: netTone },
    { key: "cc-module-cashflow", title: "Cashflow Command", value: `${cashflowScore}/99`, sub: "cashflow score", tone: scoreTone },
    { key: "cc-module-affordability", title: "Affordability", value: affordLabel, sub: `${currency(dailyCap)}/day runway`, tone: affordTone },
    { key: "cc-module-rhythm", title: "Spending Rhythm", value: `${activeDays} days`, sub: `${activeDays} decisions tracked`, tone: rhythmTone },
  ]

  const notes = [
    {
      tone: "red" as const,
      title: "Pressure",
      body: topCategory
        ? `${topCategory.name} is the largest pressure point at ${currency(topCatAmount)}${topGroup && topGroup.categories.length > 1 ? ` \u2014 ${topGroup.categories.slice(1, 3).map((c: { name: string }) => c.name).join(", ")}` : ""}.`
        : "No tracked spending categories yet.",
    },
    {
      tone: "amber" as const,
      title: "Runway",
      body: `Expenses consume ${expenseLoadPct}% of income${expenseLoadPct > 70 ? ", above the 70% alert line. Consider trimming flexible categories." : expenseLoadPct > 50 ? ", within moderate range." : ", well under control."}`,
    },
    {
      tone: "green" as const,
      title: "Discipline",
      body: rothGoal
        ? `Roth contributed ${currency(rothGoal.monthly_contribution)} this month; year progress is ${Math.round(((rothGoal.current_amount + rothGoal.monthly_contribution) / rothGoal.total_amount) * 100)}% toward the ${currency(rothGoal.total_amount)} limit.`
        : `Net flow of ${currency(Math.abs(netFlow))} ${netFlow >= 0 ? "surplus" : "deficit"} this period.`,
    },
    {
      tone: "purple" as const,
      title: "Opportunity",
      body: unallocated > 0
        ? `${currency(unallocated)} unallocated \u2014 redirecting ${currency(Math.round(unallocated * 0.5))} to savings would accelerate goal progress.`
        : "Fully allocated budget \u2014 look for flexible categories to trim.",
    },
    {
      tone: "blue" as const,
      title: "Income",
      body: upcomingIncome.length > 0
        ? `Next paycheck of ${currency(upcomingIncome[0].expected_amount)} expected ${upcomingIncome[0].expected_date}. Average monthly income: ${currency(avgMonthly)}.`
        : `Total income of ${currency(income)} this period${avgMonthly > 0 ? ` (avg ${currency(avgMonthly)}/mo).` : "."}`,
    },
    {
      tone: "green" as const,
      title: "Density",
      body: `${activeDays} active days (${habitDensity}% density)${habitDensity > 75 ? " \u2014 high transaction frequency, watch for small leak spending." : habitDensity > 50 ? " \u2014 moderate activity level." : " \u2014 low activity level."}`,
    },
  ]

  return (
    <Card className="flex flex-col border border-border/80 bg-card/80 backdrop-blur-md shadow-sm">
      {/* ── Row 1: Mission Center + KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,0.74fr)_minmax(0,1.26fr)] gap-4 p-4">
        <div className="flex flex-col justify-center">
          <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">Apollo Command Center</p>
          <h2 className="text-2xl font-bold tracking-tight leading-none mb-2">Mission control for {periodLabel}</h2>
          <p className="text-xs text-muted-foreground leading-snug">
            The dashboard is reading income timing, protected obligations, safe spending, and goal discipline as one operating system.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {kpiItems.map((item, idx) => (
            <div key={idx} className="relative p-2.5 pb-2 border border-border rounded-lg bg-muted/30 overflow-hidden min-w-0">
              <div className={cn("absolute inset-y-0 left-0 w-[3px]", item.color)} />
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground truncate mb-1.5 ml-1">
                {item.label}
              </p>
              <strong className={cn("block text-[15px] font-semibold leading-none tabular-nums truncate ml-1", item.textColor)}>
                {item.value}
              </strong>
              <span className="block mt-1.5 text-[10px] text-muted-foreground leading-tight truncate ml-1">
                {item.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-border mx-4" />

      {/* ── Row 2: Strategic Briefing ── */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] gap-4 p-4">
        {/* Left: Insight Notes */}
        <div className="flex flex-col min-w-0">
          <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">Strategic Briefing</p>
          <h3 className="text-lg font-bold leading-tight mb-2">Why the numbers matter</h3>
          <p className="text-xs text-muted-foreground mb-4">
            This layer translates the period into operating instructions: protect the runway, separate work fuel from drift, and keep goals automated.
          </p>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        {/* Right: Goal Progress + Period Summary */}
        <div className="flex flex-col gap-3">
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
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-border mx-4" />

      {/* ── Row 3: Module Focus Navigation ── */}
      <div className="p-4">
        <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-3">Module Focus</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {focusCards.map((card) => (
            <button
              key={card.key}
              onClick={() => scrollToModule(card.key)}
              className={cn(
                "relative p-2.5 pb-2 border border-border rounded-lg text-left cursor-pointer transition-colors hover:bg-muted/40 overflow-hidden min-w-0",
                focusTones[card.tone]
              )}
            >
              <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground truncate mb-1.5">
                {card.title}
              </p>
              <strong className="block text-[15px] font-semibold leading-none tabular-nums truncate">
                {card.value}
              </strong>
              <span className="block mt-1.5 text-[10px] text-muted-foreground leading-tight truncate">
                {card.sub}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
