"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { currency } from "@/lib/format"
import { Calculator, Info, Settings2 } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useDashboard } from "./dashboard-context"
import type { GoalData } from "../GoalCard"
import { Affordability } from "./affordability"
import { ConfigDialog } from "./config-dialog"

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

const toneStroke: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  purple: "#a855f7",
}

function compactCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return currency(n)
}

function RingGauge({
  pct,
  strokeColor,
  size = 56,
  strokeWidth = 5,
}: {
  pct: number
  strokeColor: string
  size?: number
  strokeWidth?: number
}) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(1, Math.max(0, pct)) * circ
  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)" }}
      className="absolute inset-0"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeColor} strokeOpacity={0.15} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

function SplitDonut({
  a, b, colorA, colorB, size = 56, strokeWidth = 5,
}: {
  a: number; b: number; colorA: string; colorB: string; size?: number; strokeWidth?: number
}) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const total = a + b || 1
  const dashA = (a / total) * circ
  const dashB = (b / total) * circ
  const gap = 3
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} className="absolute inset-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorA} strokeOpacity={0.12} strokeWidth={strokeWidth} />
      {dashA > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorA} strokeWidth={strokeWidth}
          strokeDasharray={`${Math.max(0, dashA - gap / 2)} ${circ - dashA + gap / 2}`} strokeLinecap="round" />
      )}
      {dashB > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorB} strokeWidth={strokeWidth}
          strokeDasharray={`${Math.max(0, dashB - gap / 2)} ${circ - dashB + gap / 2}`}
          strokeDashoffset={-(dashA + gap / 2)} strokeLinecap="round" />
      )}
    </svg>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CommandHUD({
  stats,
  accounts: _accounts,
  goals,
  incomeSummary,
  accountBalanceHistories,
  budgetContext,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accounts?: any
  goals?: GoalData[] | null
  incomeSummary?: IncomeSummary | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accountBalanceHistories?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  budgetContext?: any
}) {
  const { month, year, configOpen, setConfigOpen } = useDashboard()

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

  const accounts = _accounts ?? []

  const operatingCash = useMemo(
    () => accounts.filter((a: any) => a.type === "checking").reduce((s: number, a: any) => s + (a.balance ?? 0), 0), // eslint-disable-line @typescript-eslint/no-explicit-any
    [accounts]
  )

  const emergencyReserve = useMemo(() => {
    const efGoal = goals?.find((g: any) => g.name.toLowerCase().includes("emergency")) // eslint-disable-line @typescript-eslint/no-explicit-any
    if (efGoal) return efGoal.current_amount ?? efGoal.total_amount
    return accounts.filter((a: any) => a.type === "savings").reduce((s: number, a: any) => s + (a.balance ?? 0), 0) // eslint-disable-line @typescript-eslint/no-explicit-any
  }, [goals, accounts])

  const rothGoal = goals?.find((g) => /roth|ira|retirement/i.test(g.name))
  const expenseLoadPct = income > 0 ? (expenses / income) * 100 : 0
  const rothAutomated = rothGoal ? (rothGoal.monthly_contribution ?? 0) > 0 : false
  const unallocatedPct = income > 0 ? ((income - expenses - goalsTotal) / income) * 100 : 0

  const rawScore = Math.round(
    Math.min(1, unallocatedPct / 100) * 40 +
    Math.max(0, 1 - expenseLoadPct / 100) * 40 +
    (rothAutomated ? 20 : 0)
  )
  const cashflowScore = Math.min(99, Math.max(0, rawScore))
  const scoreTone = cashflowScore >= 80 ? "green" : cashflowScore >= 60 ? "blue" : cashflowScore >= 40 ? "amber" : "red"

  const habitDensity = daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0
  const rhythmTone = activeDays > 18 ? "amber" : "blue"

  const topCatAmount = topCategory?.amount ?? 0
  const unallocated = Math.max(0, income - expenses - goalsTotal)
  const protectedCapital = operatingCash + emergencyReserve

  // ── Component state ──
  const [hoveredNote, setHoveredNote] = useState<number | null>(null)
  const [affordabilityOpen, setAffordabilityOpen] = useState(false)

  const notes = [
    {
      tone: "red" as const,
      title: "Pressure",
      body: topCategory
        ? `${topCategory.name} is the largest pressure point at ${currency(topCatAmount)}${topGroup && topGroup.categories.length > 1
          ? ` — ${topGroup.categories.slice(1, 3).map((c: { name: string }) => c.name).join(", ")}`
          : ""}.`
        : "No tracked spending categories yet.",
    },
    {
      tone: "amber" as const,
      title: "Runway",
      body: `Expenses consume ${expenseLoadPct.toFixed(0)}% of income${expenseLoadPct > 70
        ? ", above the 70% alert line. Consider trimming flexible categories."
        : expenseLoadPct > 50 ? ", within moderate range." : ", well under control."}`,
    },
    {
      tone: "green" as const,
      title: "Discipline",
      body: rothGoal
        ? `Roth contributed ${currency(rothGoal.monthly_contribution)} this month; year progress is ${Math.round(
          ((rothGoal.current_amount + rothGoal.monthly_contribution) / rothGoal.total_amount) * 100
        )}% toward the ${currency(rothGoal.total_amount)} limit.`
        : `Net flow of ${currency(Math.abs(netFlow))} ${netFlow >= 0 ? "surplus" : "deficit"} this period.`,
    },
    {
      tone: "purple" as const,
      title: "Opportunity",
      body: unallocated > 0
        ? `${currency(unallocated)} unallocated — redirecting ${currency(Math.round(unallocated * 0.5))} to savings would accelerate goal progress.`
        : "Fully allocated budget — look for flexible categories to trim.",
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
      body: `${activeDays} active days (${habitDensity}% density)${habitDensity > 75
        ? " — high transaction frequency, watch for small leak spending."
        : habitDensity > 50 ? " — moderate activity level." : " — low activity level."}`,
    },
  ]

  return (
    <>
      <div className="bg-card/80 backdrop-blur-[12px] border border-border/80 rounded-xl shadow-sm">
        {/* Gauges + Actions */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Gauges */}
          <div className="flex items-center gap-1">
            {/* Cashflow Score */}
            <button className="group relative flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute top-1 right-1 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors cursor-default z-20" onClick={(e) => e.stopPropagation()}>
                    <Info size={9} strokeWidth={2} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-[11px] leading-snug font-normal whitespace-normal">
                  A 0–99 score measuring how healthy your cash flow is. Built from your unallocated surplus (40 pts), expense-to-income ratio (40 pts), and whether retirement is automated (20 pts). 80+ is excellent, 60–79 solid, 40–59 watch it, below 40 needs attention.
                </TooltipContent>
              </Tooltip>
              <div className="relative w-14 h-14 flex items-center justify-center">
                <RingGauge pct={cashflowScore / 99} strokeColor={toneStroke[scoreTone]} />
                <div className="flex flex-col items-center justify-center z-10">
                  <span className="font-mono text-[13px] font-semibold text-foreground leading-none">{cashflowScore}</span>
                  <span className="text-[8px] text-muted-foreground leading-none mt-0.5">/99</span>
                </div>
              </div>
              <div className="relative h-3 flex items-center justify-center w-full">
                <p className="absolute text-[9px] uppercase tracking-widest text-muted-foreground leading-none transition-opacity duration-150 group-hover:opacity-0">Cashflow</p>
                <p className="absolute text-[9px] text-muted-foreground/80 leading-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap">{unallocatedPct.toFixed(0)}% surplus</p>
              </div>
            </button>

            <div className="w-px h-10 bg-border/40" />

            {/* Rhythm */}
            <button className="group relative flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute top-1 right-1 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors cursor-default z-20" onClick={(e) => e.stopPropagation()}>
                    <Info size={9} strokeWidth={2} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-[11px] leading-snug font-normal whitespace-normal">
                  Days this month with at least one recorded transaction. A higher count reflects consistent financial engagement — not necessarily more spending, just more visibility into your money.
                </TooltipContent>
              </Tooltip>
              <div className="relative w-14 h-14 flex items-center justify-center">
                <RingGauge pct={activeDays / daysInMonth} strokeColor={toneStroke[rhythmTone]} />
                <div className="flex flex-col items-center justify-center z-10">
                  <span className="font-mono text-[13px] font-semibold text-foreground leading-none">{activeDays}</span>
                  <span className="text-[8px] text-muted-foreground leading-none mt-0.5">days</span>
                </div>
              </div>
              <div className="relative h-3 flex items-center justify-center w-full">
                <p className="absolute text-[9px] uppercase tracking-widest text-muted-foreground leading-none transition-opacity duration-150 group-hover:opacity-0">Rhythm</p>
                <p className="absolute text-[9px] text-muted-foreground/80 leading-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap">{habitDensity}% density</p>
              </div>
            </button>

            <div className="w-px h-10 bg-border/40" />

            {/* Protected Capital */}
            <button className="group relative flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted/30 transition-colors">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute top-1 right-1 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors cursor-default z-20" onClick={(e) => e.stopPropagation()}>
                    <Info size={9} strokeWidth={2} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-[11px] leading-snug font-normal whitespace-normal">
                  Total capital set aside and protected from daily spending. Combines your checking buffer (operating cash) and emergency reserve or savings goal — the two arcs show their relative share.
                </TooltipContent>
              </Tooltip>
              <div className="relative w-14 h-14 flex items-center justify-center">
                <SplitDonut a={operatingCash} b={emergencyReserve} colorA={toneStroke.blue} colorB={toneStroke.purple} />
                <div className="flex flex-col items-center justify-center z-10">
                  <span className="font-mono text-[10px] font-semibold text-foreground leading-none">{compactCurrency(protectedCapital)}</span>
                </div>
              </div>
              <div className="relative h-3 flex items-center justify-center w-full">
                <div className="absolute flex items-center gap-2 transition-opacity duration-150 group-hover:opacity-0">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: toneStroke.blue }} />
                    <span className="text-[8px] text-muted-foreground leading-none">Cash</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: toneStroke.purple }} />
                    <span className="text-[8px] text-muted-foreground leading-none">Reserve</span>
                  </span>
                </div>
                <div className="absolute flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: toneStroke.blue }} />
                    <span className="text-[8px] text-muted-foreground leading-none whitespace-nowrap">{compactCurrency(operatingCash)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: toneStroke.purple }} />
                    <span className="text-[8px] text-muted-foreground leading-none whitespace-nowrap">{compactCurrency(emergencyReserve)}</span>
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pl-5 border-l border-border/40 ml-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 px-2.5 font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setAffordabilityOpen(true)}
            >
              <Calculator size={13} />
              Can I?
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setConfigOpen(true)}
              title="Configure goals, rules & flow mapping"
            >
              <Settings2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Insights */}
        <div className="border-t border-border/60 px-4 py-3">
          <div className="flex items-center gap-3 h-8">
            <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/60 shrink-0">
              Insights
            </span>
            <div className="w-px h-4 bg-border/50 shrink-0" />
            <div className="flex flex-wrap gap-1 flex-1 xl:flex-nowrap overflow-hidden">
              {notes.map((n, i) => {
                const isHovered = hoveredNote === i
                const anyHovered = hoveredNote !== null
                return (
                  <div
                    key={i}
                    className={cn(
                      "relative flex items-center overflow-hidden rounded-md border border-l-[3px] cursor-default select-none h-8",
                      toneStyles[n.tone].bg
                    )}
                    style={{
                      borderLeftColor: toneBorderVar[n.tone],
                      flex: isHovered ? "3 3 0%" : anyHovered ? "0.6 0.6 0%" : "1 1 0%",
                      transition: "flex 0.35s cubic-bezier(0.4,0,0.2,1)",
                      minWidth: "72px",
                    }}
                    onMouseEnter={() => setHoveredNote(i)}
                    onMouseLeave={() => setHoveredNote(null)}
                  >
                    <p className={cn(
                      "shrink-0 text-[10px] font-bold uppercase tracking-wider px-3 transition-colors duration-200",
                      isHovered ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {n.title}
                    </p>
                    <span
                      className={cn(
                        "block text-[11px] leading-snug text-muted-foreground pr-3 overflow-hidden whitespace-normal",
                        "transition-opacity duration-200",
                        isHovered ? "opacity-100 delay-100" : "opacity-0"
                      )}
                      style={{
                        maxWidth: isHovered ? "320px" : "0px",
                        transition: "max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
                      }}
                    >
                      {n.body}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={affordabilityOpen} onOpenChange={setAffordabilityOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-wide">Affordability Check</DialogTitle>
          </DialogHeader>
          <Affordability
            dashboardStats={stats}
            budgetContext={budgetContext}
            incomeSummary={incomeSummary}
          />
        </DialogContent>
      </Dialog>

      <ConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
    </>
  )
}
