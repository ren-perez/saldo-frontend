"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { currencyExact } from "@/lib/format"
import { useDashboard } from "./dashboard-context"
import { GoalCard, type GoalData } from "../GoalCard"
import { allocColors, categoryLabels } from "../wealth/income-shared"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const monthShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

type DailyTx = { description: string; amount: number; category?: string }
type DailyStats = { income: number; expenses: number; goals: number; txs?: DailyTx[] }
type PlannedIncome = { _id: string; expected_date: string; expected_amount: number; label: string }

const SUBSCRIPTIONS = [
  { name: "Spotify", cadence: "Monthly", amount: 9.99 },
  { name: "Claude.ai", cadence: "Monthly", amount: 20.00 },
  { name: "ChatGPT", cadence: "Monthly", amount: 20.00 },
  { name: "Netflix", cadence: "Monthly", amount: 17.99 },
  { name: "iCloud+", cadence: "Monthly", amount: 2.99 },
  { name: "Amazon Prime", cadence: "Yearly", amount: 139.00 },
]

function formatCompact(amount: number): string {
  if (amount === 0) return ""
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`
  return Math.round(amount).toString()
}

const MIN_LABEL_PCT = 24

type DayCell = { dayNum: number; dateKey: string; stats: DailyStats }

function hasSubscriptions(txs?: DailyTx[]) {
  return txs?.some(tx => tx.category === "Software & Tools" || tx.category === "Media")
}

function DayCellButton({ day, isToday, isSelected, isHovered, hasPlanned, onClick, onMouseEnter, onMouseLeave }: {
  day: DayCell
  isToday: boolean
  isSelected: boolean
  isHovered: boolean
  hasPlanned: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const { income, expenses, goals: g, txs } = day.stats
  const total = income + expenses + g
  const hasActivity = total > 0
  const incomePct = hasActivity ? (income / total) * 100 : 0
  const expPct = hasActivity ? (expenses / total) * 100 : 0
  const goalsPct = hasActivity ? (g / total) * 100 : 0
  const hasSub = hasSubscriptions(txs)

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative w-full aspect-square rounded-[6px] overflow-hidden transition-all duration-150 outline-none",
        !hasActivity && "bg-muted/40",
        isToday && !isSelected && !isHovered && "ring-[1.5px] ring-gray-400/90",
        isSelected && "ring-2 ring-primary ring-offset-1 dark:ring-offset-background",
        isHovered && !isSelected && "ring-2 ring-primary/40",
        !isSelected && hasActivity && "hover:ring-2 hover:ring-primary/30",
        hasSub && "after:absolute after:right-1 after:bottom-1 after:size-1.5 after:rounded-full after:bg-amber-400 after:ring-[1.5px] after:ring-white dark:after:ring-gray-900 after:z-10"
      )}
    >
      {hasActivity && (
        <div className="absolute inset-0 flex flex-col">
          {income > 0 && (
            <div style={{ height: `${incomePct}%` }} className="bg-[oklch(58%_0.14_160/55%)] flex items-center justify-center overflow-hidden shrink-0">
              {incomePct >= MIN_LABEL_PCT && <span className="text-[10px] font-bold leading-none text-[oklch(85%_0.1_160/90)]">{formatCompact(income)}</span>}
            </div>
          )}
          {expenses > 0 && (
            <div style={{ height: `${expPct}%` }} className="bg-[oklch(60%_0.18_25/55%)] flex items-center justify-center overflow-hidden shrink-0">
              {expPct >= MIN_LABEL_PCT && <span className="text-[10px] font-bold leading-none text-[oklch(88%_0.1_25/90)]">{formatCompact(expenses)}</span>}
            </div>
          )}
          {g > 0 && (
            <div style={{ height: `${goalsPct}%` }} className="bg-[oklch(57%_0.16_220/55%)] flex items-center justify-center overflow-hidden shrink-0">
              {goalsPct >= MIN_LABEL_PCT && <span className="text-[10px] font-bold leading-none text-[oklch(85%_0.1_220/90)]">{formatCompact(g)}</span>}
            </div>
          )}
        </div>
      )}
      {hasPlanned && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] z-10 border-b-2 border-dashed border-cyan-400/60" />
      )}
      <span className={cn("absolute top-1 left-1.5 text-[9px] font-semibold z-10 tabular-nums", hasActivity ? "text-white/90" : "text-muted-foreground/90")}>
        {day.dayNum}
      </span>
    </button>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SpendingRhythm({ stats, goals, plannedIncomes }: { stats: any; goals?: GoalData[] | null; plannedIncomes?: PlannedIncome[] }) {
  const { month, year, selectedDate, setSelectedDate, granularity, periodOffset } = useDashboard()
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDate(null)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [setSelectedDate])

  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const allDays = useMemo(() => {
    const days: DayCell[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      days.push({
        dayNum: d,
        dateKey,
        stats: stats?.dailyStats?.[dateKey] ?? { income: 0, expenses: 0, goals: 0, txs: [] },
      })
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
    const end = Math.min(start + 6, daysInMonth - 1)
    return allDays.slice(start, end + 1)
  }, [allDays, periodOffset, daysInMonth])

  const monthlyData = useMemo(() => {
    if (!stats?.dailyStats) return []
    const monthAcc: Record<number, { income: number; expenses: number; goals: number }> = {}
    for (const [dateKey, dayStats] of Object.entries(stats.dailyStats)) {
      const m = parseInt(dateKey.split("-")[1], 10) - 1
      if (!monthAcc[m]) monthAcc[m] = { income: 0, expenses: 0, goals: 0 }
      const ds = dayStats as DailyStats
      monthAcc[m].income += ds.income || 0
      monthAcc[m].expenses += ds.expenses || 0
      monthAcc[m].goals += ds.goals || 0
    }
    return Array.from({ length: 12 }, (_, i) => ({
      month: i,
      ...(monthAcc[i] ?? { income: 0, expenses: 0, goals: 0 }),
    }))
  }, [stats?.dailyStats])

  const displayDate = hoveredDate || selectedDate
  const displayStats = displayDate ? (stats?.dailyStats?.[displayDate] as DailyStats | undefined) : null
  const isPreview = !!hoveredDate && hoveredDate !== selectedDate

  const activeGoals = (goals ?? []).filter((g) => !g.is_completed)

  const plannedMap = useMemo(() => {
    const map: Record<string, { total: number; items: Array<{ label: string; amount: number }> }> = {}
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

  const maxMonthlyVal = useMemo(() =>
    Math.max(...monthlyData.map(m => m.income + m.expenses + m.goals), 1),
    [monthlyData]
  )

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm transition-all duration-200 pt-0">
      <div className="flex flex-row items-center justify-between border-b border-border bg-muted/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Spending Rhythm</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {granularity === "yearly" ? "Yearly view — monthly aggregates." :
             granularity === "weekly" ? "Weekly view — active week." :
             granularity === "daily" ? "Daily view — single day." :
             "Calendar pressure and goal motion."}
          </p>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
          <div>
            {granularity === "yearly" ? (
              <div>
                <div className="flex items-end gap-1 h-64">
                  {monthlyData.map((m) => {
                    const total = m.income + m.expenses + m.goals
                    const incomeH = maxMonthlyVal > 0 ? (m.income / maxMonthlyVal) * 100 : 0
                    const expH = maxMonthlyVal > 0 ? (m.expenses / maxMonthlyVal) * 100 : 0
                    const goalsH = maxMonthlyVal > 0 ? (m.goals / maxMonthlyVal) * 100 : 0
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="w-full h-56 flex flex-col justify-end gap-[1px] relative">
                          {m.goals > 0 && (
                            <div
                              className="w-full rounded-t-[3px] bg-[oklch(57%_0.16_220/55%)] transition-all duration-300 group-hover:opacity-80"
                              style={{ height: `${goalsH}%` }}
                            />
                          )}
                          {m.expenses > 0 && (
                            <div
                              className="w-full bg-[oklch(60%_0.18_25/55%)] transition-all duration-300 group-hover:opacity-80"
                              style={{ height: `${expH}%` }}
                            />
                          )}
                          {m.income > 0 && (
                            <div
                              className="w-full rounded-b-[3px] bg-[oklch(58%_0.14_160/55%)] transition-all duration-300 group-hover:opacity-80"
                              style={{ height: `${incomeH}%` }}
                            />
                          )}
                          {total === 0 && <div className="w-full h-full bg-muted/30 rounded-[3px]" />}
                        </div>
                        <span className="text-[9px] text-muted-foreground font-medium">{monthShort[m.month]}</span>
                        {total > 0 && (
                          <span className="text-[8px] text-muted-foreground/70 font-medium -mt-0.5">{formatCompact(total)}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-4 px-1">
                  {[
                    ["bg-[oklch(58%_0.14_160/55%)]", "Income"],
                    ["bg-[oklch(60%_0.18_25/55%)]", "Expenses"],
                    ["bg-[oklch(57%_0.16_220/55%)]", "Goals"],
                    ["border-b-2 border-dashed border-cyan-400/60 h-0 w-2.5", "Planned"],
                  ].map(([cls, label], i) => (
                    <span key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className={cn("size-2.5 rounded-[2px] inline-block shrink-0", cls)} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : granularity === "daily" ? (
              <div className="flex justify-center py-8">
                {allDays[Math.min(periodOffset, daysInMonth - 1)] && (
                  <div className="w-48 h-48">
                    <DayCellButton
                      day={allDays[Math.min(periodOffset, daysInMonth - 1)]}
                      isToday={allDays[Math.min(periodOffset, daysInMonth - 1)].dateKey === todayStr}
                      isSelected={allDays[Math.min(periodOffset, daysInMonth - 1)].dateKey === selectedDate}
                      isHovered={allDays[Math.min(periodOffset, daysInMonth - 1)].dateKey === hoveredDate}
                      hasPlanned={!!plannedMap[allDays[Math.min(periodOffset, daysInMonth - 1)].dateKey]}
                      onClick={() => handleCellClick(allDays[Math.min(periodOffset, daysInMonth - 1)])}
                      onMouseEnter={() => previewHeatDay(allDays[Math.min(periodOffset, daysInMonth - 1)].dateKey)}
                      onMouseLeave={clearHeatPreview}
                    />
                  </div>
                )}
              </div>
            ) : granularity === "weekly" ? (
              <div className="flex gap-1 py-4">
                <div className="grid grid-cols-7 gap-1 flex-1">
                  {weekDays.map((day) => (
                    <DayCellButton
                      key={day.dateKey}
                      day={day}
                      isToday={day.dateKey === todayStr}
                      isSelected={day.dateKey === selectedDate}
                      isHovered={day.dateKey === hoveredDate}
                      hasPlanned={!!plannedMap[day.dateKey]}
                      onClick={() => handleCellClick(day)}
                      onMouseEnter={() => previewHeatDay(day.dateKey)}
                      onMouseLeave={clearHeatPreview}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 gap-1">
                      {week.map((day, dayIdx) => {
                        if (!day) return <div key={`empty-${dayIdx}`} className="aspect-square" />
                        return (
                          <DayCellButton
                            key={day.dateKey}
                            day={day}
                            isToday={day.dateKey === todayStr}
                            isSelected={day.dateKey === selectedDate}
                            isHovered={day.dateKey === hoveredDate}
                            hasPlanned={!!plannedMap[day.dateKey]}
                            onClick={() => handleCellClick(day)}
                            onMouseEnter={() => previewHeatDay(day.dateKey)}
                            onMouseLeave={clearHeatPreview}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-4 px-1">
                  {[
                    ["bg-[oklch(58%_0.14_160/55%)]", "Income"],
                    ["bg-[oklch(60%_0.18_25/55%)]", "Expenses"],
                    ["bg-[oklch(57%_0.16_220/55%)]", "Goals"],
                    ["border-b-2 border-dashed border-cyan-400/60 h-0 w-2.5", "Planned"],
                    ["bg-amber-400 size-1.5 rounded-full ring-[1.5px] ring-white dark:ring-gray-900", "Subscription"],
                    ["ring-[1.5px] ring-foreground bg-transparent", "Selected"],
                  ].map(([cls, label], i) => (
                    <span key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className={cn("size-2.5 rounded-[2px] inline-block shrink-0", cls)} />
                      {label}
                    </span>
                  ))}
                </div>
              </>
            )}

            {granularity !== "yearly" && activeGoals.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <GoalRail activeGoals={activeGoals} />
              </div>
            )}
          </div>

          <RightPane
            displayDate={displayDate}
            displayStats={displayStats ?? null}
            isPreview={isPreview}
            month={month}
            plannedItems={displayDate ? plannedMap[displayDate]?.items : undefined}
          />
        </div>

        {granularity === "yearly" && activeGoals.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <GoalRail activeGoals={activeGoals} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RightPane({ displayDate, displayStats, isPreview, month, plannedItems }: {
  displayDate: string | null
  displayStats: DailyStats | null
  isPreview: boolean
  month: number
  plannedItems?: Array<{ _id: string; label: string; amount: number }>
}) {
  const hasContent = displayStats || (plannedItems && plannedItems.length > 0)
  if (!displayDate || !hasContent) {
    return (
      <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col h-full min-h-[300px]">
        <h4 className="text-sm font-semibold text-foreground mb-3">Active Subscriptions</h4>
        <div className="flex flex-col gap-2">
          {SUBSCRIPTIONS.map((sub, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/50 border border-border/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-medium text-foreground truncate">{sub.name}</span>
                  <span className="text-[10px] text-muted-foreground">{sub.cadence}</span>
                </div>
              </div>
              <span className="text-[12px] font-semibold tabular-nums text-foreground shrink-0 ml-2">
                {currencyExact(sub.amount)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-auto pt-3 text-center">Hover or click a day to view its breakdown.</p>
      </div>
    )
  }

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col h-full min-h-[300px]">
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
          <h4 className="text-sm font-semibold text-foreground">
            {monthNames[month]} {parseInt(displayDate.split("-")[2], 10)}
          </h4>
          {isPreview ? (
            <span className="text-[10px] bg-muted-foreground/10 text-muted-foreground px-2 py-0.5 rounded-full font-medium">Preview</span>
          ) : (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Locked</span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {displayStats && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">Income</span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{currencyExact(displayStats.income || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600 dark:text-red-400 font-medium text-xs">Spend</span>
                <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">{currencyExact(displayStats.expenses || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">Goals</span>
                <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">{currencyExact(displayStats.goals || 0)}</span>
              </div>
              <div className="h-[1px] bg-border my-1" />
            </>
          )}

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
            {plannedItems && plannedItems.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Planned Income</p>
                {plannedItems.map((item, idx) => (
                  <div key={item._id} className="border border-cyan-400/20 bg-cyan-400/5 rounded-lg px-3 py-2">
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="size-1.5 rounded-full border border-dashed border-cyan-400/70 shrink-0" />
                        <span className="text-[12px] text-cyan-600 dark:text-cyan-400 font-medium truncate">{item.label}</span>
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums shrink-0 text-cyan-600 dark:text-cyan-400">
                        +{currencyExact(item.amount)}
                      </span>
                    </div>
                    <PlannedIncomeAllocations incomePlanId={item._id} />
                  </div>
                ))}
                <div className="h-[1px] bg-border/50 my-1" />
              </>
            )}

            {displayStats && (
              <>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transactions</p>
                {displayStats.txs && displayStats.txs.length > 0 ? (
                  displayStats.txs.map((tx: DailyTx, idx: number) => {
                    const isSub = tx.category === "Software & Tools" || tx.category === "Media"
                    return (
                      <div key={idx} className="flex justify-between items-baseline gap-2">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isSub && <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />}
                            <span className="text-[12px] text-foreground truncate">{tx.description}</span>
                          </div>
                          {tx.category && <span className="text-[10px] text-muted-foreground truncate">{tx.category}</span>}
                        </div>
                        <span className={cn(
                          "text-[12px] font-medium tabular-nums shrink-0",
                          tx.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                        )}>
                          {tx.amount > 0 ? '+' : ''}{currencyExact(Math.abs(tx.amount))}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">No transactions recorded.</p>
                )}
              </>
            )}

            {!displayStats && (!plannedItems || plannedItems.length === 0) && (
              <p className="text-xs text-muted-foreground">No data for this day.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlannedIncomeAllocations({ incomePlanId }: { incomePlanId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allocations = useQuery(api.allocations.getAllocationsForPlan as any, { incomePlanId })

  if (!allocations) return <div className="h-2 bg-muted/30 rounded animate-pulse" />

  if (allocations.length === 0) return null

  const total = allocations.reduce((s: number, a: { amount: number }) => s + a.amount, 0)

  return (
    <div className="flex flex-col gap-1.5 mt-1 mb-2 pl-4">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/40">
        {allocations.map((a: { accountName: string; amount: number; category: string }, i: number) => {
          const pct = total > 0 ? (a.amount / total) * 100 : 0
          if (pct < 1) return null
          return (
            <div
              key={a.accountName + i}
              className="transition-all"
              style={{ width: `${pct}%`, backgroundColor: allocColors[i % allocColors.length], opacity: 0.8 }}
            />
          )
        })}
      </div>
      <div className="flex flex-col gap-0.5">
        {allocations.map((a: { accountName: string; amount: number; category: string }, i: number) => (
          <div key={a.accountName + i} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: allocColors[i % allocColors.length] }} />
              <span className="text-muted-foreground truncate">{a.accountName}</span>
              <span className="text-[10px] text-muted-foreground/60">{categoryLabels[a.category] ?? a.category}</span>
            </div>
            <span className="font-medium tabular-nums text-foreground shrink-0 ml-2">{currencyExact(a.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoalRail({ activeGoals }: { activeGoals: GoalData[] }) {
  return (
    <div className="flex flex-col gap-3">
      <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
        <CarouselContent className="-ml-4">
          {activeGoals.map((goal) => (
            <CarouselItem key={goal._id} className="pl-4 basis-auto">
              <GoalCard goal={goal} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  )
}
