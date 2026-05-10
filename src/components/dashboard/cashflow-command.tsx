"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { currency, currencyExact } from "@/lib/format"
import { useDashboard } from "./dashboard-context"
import type { GoalData } from "../GoalCard"
import {
  Receipt,
  Utensils,
  Car,
  ShoppingBag,
  Repeat,
  Landmark,
  HelpCircle,
} from "lucide-react"

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

interface CashflowCommandProps {
  stats: {
    totalIncome?: number
    totalExpenses?: number
    totalReimbursements?: number
    totalGoals?: number
    netFlow?: number
    topCategoryGroups?: Array<{
      groupName: string
      groupId: string
      amount: number
      categories: Array<{ name: string; categoryId: string; amount: number }>
    }>
    dailyStats?: Record<string, { income: number; expenses: number; goals: number }>
    weeklyBreakdown?: Array<{ weekStart: number; income: number; expenses: number }>
    accountFlows?: Array<{ accountId: string; accountName: string; inflow: number; outflow: number }>
  }
  incomeSummary?: IncomeSummary | null
  goals?: GoalData[] | null
}

export function CashflowCommand({ stats, incomeSummary, goals }: CashflowCommandProps) {
  const { month, year } = useDashboard()

  const income = stats?.totalIncome ?? 0
  const expenses = stats?.totalExpenses ?? 0
  const goalsTotal = stats?.totalGoals ?? 0
  const dailyStats = stats?.dailyStats ?? {}
  const topGroups = stats?.topCategoryGroups ?? []
  const activeDays = Object.keys(dailyStats).length
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const habitDensity = daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0

  const matchedTotal = incomeSummary?.thisMonth?.totalMatched ?? 0
  const plannedTotal = incomeSummary?.thisMonth?.totalPlanned ?? 0
  const upcomingIncome = incomeSummary?.upcoming ?? []
  const avgMonthly = incomeSummary?.avgMonthlyIncome ?? 0

  // --- Cashflow Score (0-99) ---
  const unallocated = Math.max(0, income - expenses - goalsTotal)
  const unallocatedPct = income > 0 ? (unallocated / income) * 100 : 0
  const expenseLoadPct = income > 0 ? (expenses / income) * 100 : 0
  const rothGoal = goals?.find((g) => /roth|ira|retirement/i.test(g.name))
  const rothAutomated = rothGoal ? (rothGoal.monthly_contribution ?? 0) > 0 : false
  const rawScore = Math.round(
    Math.min(1, unallocatedPct / 100) * 40 +
    Math.max(0, 1 - expenseLoadPct / 100) * 40 +
    (rothAutomated ? 20 : 0)
  )
  const cashflowScore = Math.min(99, Math.max(0, rawScore))

  // --- Top Pressure and Next Lever ---
  const topPressure = topGroups[0]?.groupName ?? null
  const nextLever = topGroups[1]?.groupName ?? null

  // --- Fundamental vs Flexible (Flow Summary) ---
  const fundamentalKeywords = ["Rent", "Insurance", "Phone", "Transportation", "Fuel", "Utilities", "Mortgage"]
  const fundamentalExpenses = topGroups
    .filter((g) => fundamentalKeywords.some((k) => g.groupName.toLowerCase().includes(k.toLowerCase())))
    .reduce((s, g) => s + g.amount, 0)
  const flexibleExpenses = expenses - fundamentalExpenses

  // --- Commitment Preview ---
  const commitmentGoals = (goals ?? [])
    .filter((g) => !g.is_completed && (g.monthly_contribution ?? 0) > 0)
    .slice(0, 5)

  // --- Category Intelligence Tabs ---
  const categoryTabs: Array<{ id: string; label: string; icon: React.ReactNode; groupIndex?: number }> = [
    { id: "all", label: "All", icon: <HelpCircle className="size-3.5" /> },
    ...topGroups.slice(0, 8).map((g, i) => {
      const lower = g.groupName.toLowerCase()
      let icon = <Receipt className="size-3.5" />
      if (/food|dining|eat|restaurant/i.test(lower)) icon = <Utensils className="size-3.5" />
      else if (/transport|car|gas|fuel|auto/i.test(lower)) icon = <Car className="size-3.5" />
      else if (/shop|retail|amazon|clothing|apparel/i.test(lower)) icon = <ShoppingBag className="size-3.5" />
      else if (/subscri|software|stream|netflix|spotify/i.test(lower)) icon = <Repeat className="size-3.5" />
      else if (/bank|fee|interest|service/i.test(lower)) icon = <Landmark className="size-3.5" />
      else if (/bill|utility|rent|insurance|phone/i.test(lower)) icon = <Receipt className="size-3.5" />
      return { id: `group-${i}`, label: g.groupName, icon, groupIndex: i }
    }),
  ]

  const [activeTab, setActiveTab] = useState("all")

  const renderStackBar = (categories: Array<{ name: string; amount: number }>, total: number) => {
    if (total === 0) return null
    const colors = [
      "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-blue-500",
      "bg-purple-500", "bg-pink-500", "bg-teal-500", "bg-orange-500",
      "bg-rose-500", "bg-cyan-500",
    ]
    return (
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
        {categories.map((cat, i) => {
          const pct = (cat.amount / total) * 100
          if (pct < 1) return null
          return (
            <div
              key={cat.name}
              className={cn("h-full transition-all", colors[i % colors.length])}
              style={{ width: `${pct}%` }}
              title={`${cat.name}: ${currency(cat.amount)} (${Math.round(pct)}%)`}
            />
          )
        })}
      </div>
    )
  }

  const activeTopGroup = activeTab === "all"
    ? null
    : topGroups[Number(activeTab.replace("group-", ""))]

  const displayCategories = activeTab === "all"
    ? topGroups.flatMap((g) => g.categories).sort((a, b) => b.amount - a.amount).slice(0, 12)
    : activeTopGroup?.categories ?? []

  const displayTotal = displayCategories.reduce((s, c) => s + c.amount, 0)

  return (
    <Card className="cc-module-card flex flex-col pt-0">
      {/* ── Header ── */}
      <div className="border-b border-border px-4 py-3 bg-muted/10 flex justify-between items-start gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Cashflow Command</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Period diagnosis and next-paycheck routing.</p>
        </div>
        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-medium shrink-0">
          Selected Period
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* ── Top Stats Row ── */}
        {/* <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/30 border border-border p-2.5 rounded-lg text-center">
            <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Expected</p>
            <p className="text-lg font-semibold">{currency(matchedTotal + plannedTotal || income)}</p>
          </div>
          <div className="bg-muted/30 border border-border p-2.5 rounded-lg text-center">
            <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Received</p>
            <p className="text-lg font-semibold text-emerald-600">{currency(matchedTotal || income)}</p>
          </div>
          <div className="bg-muted/30 border border-border p-2.5 rounded-lg text-center">
            <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Pending</p>
            <p className="text-lg font-semibold text-amber-500">{currency(plannedTotal || 0)}</p>
          </div>
        </div> */}

        {/* ── Cashflow Score + Primary Insight ── */}
        {/* <div className="flex items-start gap-4 bg-muted/20 border border-border rounded-xl p-3">
          <div className="relative size-[60px] shrink-0 flex items-center justify-center">
            <svg className="size-[60px] -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted-foreground/20" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                className={scoreRingColor}
                strokeWidth="3"
                strokeDasharray={`${(cashflowScore / 99) * 97.3} 97.3`}
                strokeLinecap="round"
              />
            </svg>
            <span className={cn("absolute text-sm font-bold tabular-nums", scoreColor)}>
              {cashflowScore}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
              Cashflow Score
            </p>
            <p className="text-xs text-muted-foreground leading-snug">{primaryInsight}</p>
            <div className="flex gap-2 mt-1.5">
              <span className="text-[10px] text-muted-foreground/70">
                {unallocatedPct.toFixed(0)}% unallocated
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                {expenseLoadPct.toFixed(0)}% expense load
              </span>
              {rothAutomated && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  Roth auto
                </Badge>
              )}
            </div>
          </div>
        </div> */}

        {/* ── 3 Signal Cards ── */}
        {/* <div className="flex flex-wrap gap-1.5">
          {habitDensity > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 rounded-md px-2 py-1 border border-border/50">
              <TrendingUp className="size-3 text-indigo-500" />
              <span className="text-foreground tabular-nums">{habitDensity}%</span> habit density
            </span>
          )}
          {topPressure && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 rounded-md px-2 py-1 border border-border/50">
              <Target className="size-3 text-red-500" />
              <span className="text-foreground">{topPressure}</span> top pressure
            </span>
          )}
          {nextLever && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 rounded-md px-2 py-1 border border-border/50">
              <Lightbulb className="size-3 text-amber-500" />
              <span className="text-foreground">{nextLever}</span> next lever
            </span>
          )}
        </div> */}

        {/* ── Paycheck Split ── */}
        {/* <div>
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-xs font-semibold">Planned paycheck split</p>
            <span className="text-[10px] text-muted-foreground">
              Next: {upcomingIncome.length > 0 ? currency(upcomingIncome[0].expected_amount) : currency(0)}
            </span>
          </div>
          {expenses + goalsTotal > 0 ? (
            <>
              <div className="h-2.5 w-full bg-muted flex rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${expenses > 0 ? Math.max(5, (fundamentalExpenses / Math.max(income, 1)) * 100) : 0}%` }}
                />
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(goalsTotal / Math.max(income, 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-[#5dcaa5] transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, (flexibleExpenses / Math.max(income, 1)) * 100))}%` }}
                />
                <div
                  className="h-full bg-orange-500 transition-all"
                  style={{ width: `${Math.max(0, (unallocated / Math.max(income, 1)) * 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-3 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-indigo-500" />Fundamental</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" />Goals</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#5dcaa5]" />Flexible</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-orange-500" />Unallocated</span>
              </div>
            </>
          ) : (
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[45%]" />
              <div className="h-full bg-emerald-500 w-[15%]" />
              <div className="h-full bg-[#5dcaa5] w-[10%]" />
              <div className="h-full bg-orange-500 w-[30%]" />
            </div>
          )}
        </div> */}

        {/* ── Flow Summary ── */}
        {/* <div className="border border-border rounded-xl p-3 bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Flow Summary</p>
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">Fundamental</span>
                <span className="text-muted-foreground tabular-nums">{currency(fundamentalExpenses)} ({fundamentalPct}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${fundamentalPct}%` }} />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Non-negotiable: rent, insurance, transport, utilities.</p>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">Flexible</span>
                <span className="text-muted-foreground tabular-nums">{currency(flexibleExpenses)} ({flexiblePct}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[#5dcaa5] rounded-full transition-all" style={{ width: `${flexiblePct}%` }} />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Discretionary: dining, shopping, entertainment, subscriptions.</p>
            </div>
          </div>
        </div> */}


        {/* ── Income Source Detail Rows ── */}
        {/* <div className="border border-border rounded-xl p-3 bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Income Sources</p>
            <Link href="/income" className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5">
              Details <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/income" className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-2">
                <Wallet className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Salary & Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold tabular-nums">{currency(income)}</span>
                <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
            {reimbursements > 0 && (
              <Link href="/transactions" className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-2">
                  <Receipt className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Reimbursements</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tabular-nums text-emerald-600">{currency(reimbursements)}</span>
                  <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            )}
            {upcomingIncome.length > 0 && (
              <Link href="/income" className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-3.5 text-blue-500" />
                  <span className="text-xs font-medium">Next Paycheck</span>
                  <span className="text-[10px] text-muted-foreground">{upcomingIncome[0].expected_date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tabular-nums">{currency(upcomingIncome[0].expected_amount)}</span>
                  <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            )}
          </div>
        </div> */}

        {/* ── Commitment Preview ── */}
        {/* {commitmentGoals.length > 0 && (
          <div className="border border-border rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Commitments</p>
              <Link href="/goals" className="text-[10px] text-primary hover:underline font-medium">Manage</Link>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{commitmentStr}</p>
          </div>
        )} */}

        {/* ── Category Intelligence Tabs ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Category Intelligence</p>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <TabsList className="h-8 inline-flex min-w-max">
                {categoryTabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="text-xs px-2.5 h-7 gap-1 whitespace-nowrap">
                    {tab.icon}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-2">
              {displayCategories.length > 0 && displayTotal > 0 ? (
                <div className="space-y-3">
                  {renderStackBar(displayCategories, displayTotal)}
                  <div className="flex flex-col gap-1">
                    {displayCategories.map((cat) => {
                      const pct = Math.round((cat.amount / displayTotal) * 100)
                      return (
                        <div key={cat.name} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-2 rounded-full shrink-0 bg-muted-foreground/30" />
                            <span className="text-xs truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-muted-foreground/50 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">{currency(cat.amount)}</span>
                            <span className="text-[10px] text-muted-foreground/60 w-8 text-right tabular-nums">{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No category data for this period.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  )
}
