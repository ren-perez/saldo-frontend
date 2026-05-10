"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { currencyExact } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { SankeyChart } from "@/components/dashboard/money-flow/sankey-chart"
import { WaterfallRow } from "@/components/dashboard/money-flow/waterfall-row"
import type { FlowRow, FlowTransaction, FlowType } from "@/components/dashboard/money-flow/types"
import { FLOW_TYPES } from "@/components/dashboard/money-flow/types"

interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  totalReimbursements: number
  totalGoals: number
  netFlow: number
  topCategoryGroups: {
    groupName: string
    groupId: string
    amount: number
    categories: { name: string; categoryId: string; amount: number }[]
  }[]
  flowRows?: BackendFlowRow[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dailyStats?: Record<string, any>
}

interface BackendFlowRow {
  id: string
  cls: FlowType
  label: string
  amount: number
  color: string
  groups: {
    name: string
    amount: number
    color: string
    categories: { name: string; amount: number; color: string }[]
  }[]
}

function cleanFlowId(s: string): string {
  return String(s).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoalData = any

interface IncomePlanItem {
  _id: string
  label: string
  expected_amount: number
  actual_amount?: number
  status: string
  expected_date: string
  recurrence?: string
}

interface MoneyFlowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any
  incomeSummary?: IncomeSummary | null
  goals?: GoalData[] | null
  incomePlans?: IncomePlanItem[]
}

export function MoneyFlow({ stats, incomeSummary, goals, incomePlans }: MoneyFlowProps) {
  const typedStats = stats as DashboardStats | undefined

  const [moneyFlowSplit, setMoneyFlowSplit] = useState(60)
  const [sankeyZoom, setSankeyZoom] = useState(1)
  const [focusedFlowKey, setFocusedFlowKey] = useState<string | null>(null)
  const [openTxns, setOpenTxns] = useState<Record<string, boolean>>({})
  const flowRef = useRef<HTMLDivElement>(null)

  const toggleTxns = useCallback((key: string) => {
    setOpenTxns((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const focusFlow = useCallback((key: string | null) => {
    setFocusedFlowKey((prev) => (prev === key ? null : key))
    if (key) {
      setOpenTxns((prev) => ({ ...prev, [key]: true }))
    }
  }, [])

  const totalIncome = typedStats?.totalIncome ?? 5800
  const totalExpenses = typedStats?.totalExpenses ?? 0
  const totalGoals = typedStats?.totalGoals ?? 400
  const dailyStats = useMemo(() => typedStats?.dailyStats ?? {}, [typedStats?.dailyStats])
  const backendFlowRows = useMemo(() => typedStats?.flowRows ?? [], [typedStats?.flowRows])

  // ── Cashflow Score ──
  const unallocated = Math.max(0, totalIncome - totalExpenses - totalGoals)
  const unallocatedPct = totalIncome > 0 ? (unallocated / totalIncome) * 100 : 0
  const expenseLoadPct = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const rothGoal = (goals ?? []).find((g: GoalData) => /roth|ira|retirement/i.test(g.name))
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

  const scoreRingColor =
    cashflowScore >= 80 ? "stroke-emerald-500" :
    cashflowScore >= 60 ? "stroke-blue-500" :
    cashflowScore >= 40 ? "stroke-amber-500" :
    "stroke-red-500"

  // ── Income indicators ──
  const matchedTotal = incomeSummary?.thisMonth?.totalMatched ?? 0
  const plannedTotal = incomeSummary?.thisMonth?.totalPlanned ?? 0
  const expectedTotal = matchedTotal + plannedTotal || totalIncome

  function compactCurrency(v: number): string {
    if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1) + "M"
    if (v >= 1_000) return "$" + (v / 1_000).toFixed(1) + "k"
    return "$" + Math.round(v)
  }

  // ── Build transactions-by-category lookup from dailyStats ──
  const txnsByCategory = useMemo(() => {
    const map = new Map<string, FlowTransaction[]>()
    for (const dayKey of Object.keys(dailyStats)) {
      const day = dailyStats[dayKey]
      const txs = day?.txs ?? []
      for (const tx of txs) {
        const cat = tx.category ?? "Uncategorized"
        if (!map.has(cat)) map.set(cat, [])
        map.get(cat)!.push({
          date: dayKey,
          description: tx.description,
          amount: tx.amount,
        })
      }
    }
    for (const [, txns] of map) {
      txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
    return map
  }, [dailyStats])

  // ── Build FlowRows from backend data (enriched with transactions) ──
  const flowRows = useMemo((): FlowRow[] => {
    if (backendFlowRows.length > 0) {
      return backendFlowRows.map((br) => ({
        id: br.id,
        cls: br.cls,
        label: br.label,
        amount: br.amount,
        color: br.color,
        groups: br.groups.map((bg) => ({
          name: bg.name,
          amount: bg.amount,
          color: bg.color,
          categories: bg.categories.map((bc) => ({
            name: bc.name,
            amount: bc.amount,
            color: bc.color,
            transactions: txnsByCategory.get(bc.name) ?? [],
          })),
        })),
      }))
    }

    // Fallback: build from topCategoryGroups (legacy)
    const topGroups = typedStats?.topCategoryGroups ?? []
    const flowMapData: Record<string, {
      cls: FlowType
      label: string
      amt: number
      color: string
      groupsMap: Record<string, { name: string; amount: number; color: string; categories: { name: string; amount: number; color: string; transactions: FlowTransaction[] }[] }>
    }> = {}

    for (const cls of Object.keys(FLOW_TYPES) as FlowType[]) {
      const ft = FLOW_TYPES[cls]
      flowMapData[cls] = { cls, label: ft.label, amt: 0, color: ft.color, groupsMap: {} }
    }

    for (const group of topGroups) {
      for (const cat of group.categories) {
        if (cat.amount <= 0) continue
        const ft = "flexible"
        const entry = flowMapData[ft]
        if (!entry) continue
        entry.amt += cat.amount
        const groupKey = group.groupId || cleanFlowId(group.groupName)
        if (!entry.groupsMap[groupKey]) {
          entry.groupsMap[groupKey] = { name: group.groupName, amount: 0, color: entry.color, categories: [] }
        }
        const grp = entry.groupsMap[groupKey]
        grp.amount += cat.amount
        grp.categories.push({ name: cat.name, amount: cat.amount, color: grp.color, transactions: txnsByCategory.get(cat.name) ?? [] })
      }
    }

    if (totalGoals > 0) {
      const wealthEntry = flowMapData["wealth"]
      wealthEntry.amt += totalGoals
      const gk = "goals"
      if (!wealthEntry.groupsMap[gk]) {
        wealthEntry.groupsMap[gk] = { name: "Goals", amount: 0, color: "#1d9e75", categories: [] }
      }
      wealthEntry.groupsMap[gk].amount += totalGoals
      wealthEntry.groupsMap[gk].categories.push({ name: "Goal transfers", amount: totalGoals, color: "#1d9e75", transactions: [] })
    }

    return (Object.keys(FLOW_TYPES) as FlowType[])
      .map((cls) => {
        const entry = flowMapData[cls]
        const ft = FLOW_TYPES[cls]
        const groups = Object.values(entry.groupsMap).filter((g) => g.amount > 0).sort((a, b) => b.amount - a.amount)
        return { id: cleanFlowId(cls), cls, label: ft.label, amount: entry.amt, color: ft.color, groups }
      })
      .filter((r) => r.amount > 0)
      .sort((a, b) => FLOW_TYPES[a.cls].order - FLOW_TYPES[b.cls].order)
  }, [backendFlowRows, typedStats?.topCategoryGroups, totalGoals, txnsByCategory])

  // ── Income plans (sorted: matched/completed → planned → missed) ──
  const sortedPlans = useMemo(() => {
    const order: Record<string, number> = { matched: 0, completed: 0, planned: 1, missed: 2 }
    return [...(incomePlans ?? [])].sort((a, b) => {
      const ao = order[a.status] ?? 3
      const bo = order[b.status] ?? 3
      return ao - bo || a.expected_date.localeCompare(b.expected_date)
    })
  }, [incomePlans])

  // ── Income transactions from dailyStats ──
  const incomeTxs = useMemo(() => {
    const txns: FlowTransaction[] = []
    for (const dayKey of Object.keys(dailyStats)) {
      const day = dailyStats[dayKey]
      const txs = day?.txs ?? []
      for (const tx of txs) {
        if (tx.amount > 0) {
          txns.push({ date: dayKey, description: tx.description, amount: tx.amount })
        }
      }
    }
    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return txns
  }, [dailyStats])

  // ── Running remainder for waterfall footer ──
  const runningRemainder = useMemo(() => {
    let r = totalIncome
    for (const row of flowRows) {
      r -= row.amount
    }
    return r
  }, [totalIncome, flowRows])

  const zoomIn = useCallback(() => setSankeyZoom((z) => Math.min(2, +(z + 0.15).toFixed(2))), [])
  const zoomOut = useCallback(() => setSankeyZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2))), [])
  const zoomReset = useCallback(() => setSankeyZoom(1), [])

  const beginResize = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = flowRef.current
    if (!el) return
    e.preventDefault()
    document.body.classList.add("is-resizing-flow")
    const handleMove = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const split = ((ev.clientX - rect.left) / rect.width) * 100
      setMoneyFlowSplit(Math.max(40, Math.min(75, split)))
    }
    const handleUp = () => {
      document.body.classList.remove("is-resizing-flow")
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }, [])

  return (
    <Card className="cc-module-card overflow-hidden pt-0">
      <div className="border-b border-border px-4 py-3 flex justify-between items-center bg-muted/10">
        <p className="text-sm font-semibold text-foreground">Money flow</p>
        <div className="flex items-center gap-3">
          <div className="relative size-7 shrink-0 flex items-center justify-center">
            <svg className="size-7 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted-foreground/20" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                className={scoreRingColor}
                strokeWidth="3"
                strokeDasharray={`${(cashflowScore / 99) * 97.3} 97.3`}
                strokeLinecap="round"
              />
            </svg>
            <span className={cn("absolute text-[9px] font-bold tabular-nums", scoreColor)}>
              {cashflowScore}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{unallocatedPct.toFixed(0)}% unalloc</span>
            <span className="text-muted-foreground/20">·</span>
            <span>{expenseLoadPct.toFixed(0)}% expense</span>
            {rothAutomated && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-0.5">
                Roth auto
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div
        ref={flowRef}
        className="cc-flow"
        style={{
          display: "grid",
          gridTemplateColumns: `minmax(0, ${moneyFlowSplit.toFixed(1)}fr) 8px minmax(0, ${(100 - moneyFlowSplit).toFixed(1)}fr)`,
        }}
      >
        {/* Sankey */}
        <div className="cc-flow-col min-w-0 overflow-hidden">
          <div className="cc-sankey-head flex items-center justify-between px-3 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Source to Flow to Groups
            </span>
            <div className="cc-zoom-controls flex items-center gap-1" aria-label="Sankey zoom controls">
              <button onClick={zoomOut} className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 size-6 flex items-center justify-center rounded transition-colors" title="Zoom out">-</button>
              <button onClick={zoomReset} className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors tabular-nums" title="Reset zoom">{Math.round(sankeyZoom * 100)}%</button>
              <button onClick={zoomIn} className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 size-6 flex items-center justify-center rounded transition-colors" title="Zoom in">+</button>
            </div>
          </div>
          <div className="px-1">
            <SankeyChart
              totalIncome={totalIncome}
              rows={flowRows}
              zoom={sankeyZoom}
              focusedFlowKey={focusedFlowKey}
              onFocus={focusFlow}
            />
          </div>
        </div>

        {/* Divider */}
        <div
          className="bg-border cursor-col-resize hover:bg-primary/50 transition-colors relative"
          onPointerDown={beginResize}
          title="Drag to resize Money Flow panels"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Waterfall */}
        <div className="cc-flow-col cc-waterfall-col flex flex-col min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">
            Waterfall
          </p>
          <div className="cc-waterfall-scroll flex-1 overflow-y-auto px-3 pb-2 max-h-[400px] space-y-0.5">
            <WaterfallRow
              label="Income"
              amount={totalIncome}
              color="#1d9e75"
              type="plus"
              isFocused={focusedFlowKey === "income"}
              hasChildren={sortedPlans.length > 0 || incomeTxs.length > 0}
              isOpen={!!openTxns["income"]}
              onToggle={() => toggleTxns("income")}
              onFocus={() => focusFlow("income")}
              endSlot={
                <span className="flex items-center gap-1.5 text-[10px] tabular-nums ml-1">
                  <span className="flex items-center gap-1 text-muted-foreground/70 dark:text-muted-foreground/50" title="Expected income (unmatched planned)">
                    <span className="size-1.5 rounded-full bg-muted-foreground/50 dark:bg-muted-foreground/30" />
                    {compactCurrency(expectedTotal)}
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Planned income">
                    <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                    {compactCurrency(plannedTotal)}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Matched income (received)">
                    <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    {compactCurrency(matchedTotal)}
                  </span>
                </span>
              }
            >
              {sortedPlans.map((plan) => {
                const planKey = "plan-" + plan._id
                const planAmt = plan.actual_amount ?? plan.expected_amount
                return (
                  <WaterfallRow
                    key={planKey}
                    label={plan.label}
                    amount={planAmt}
                    color="#1d9e75"
                    type="plus"
                    isFocused={focusedFlowKey === planKey}
                    hasChildren={true}
                    isOpen={!!openTxns[planKey]}
                    onToggle={() => toggleTxns(planKey)}
                    onFocus={() => focusFlow(planKey)}
                    depth={1}
                  >
                    <div className="flex items-center gap-2 py-1.5 px-1 text-[10px] text-muted-foreground">
                      <span>{plan.expected_date}</span>
                      {plan.recurrence && plan.recurrence !== "once" && (
                        <span className="capitalize opacity-50">{plan.recurrence}</span>
                      )}
                    </div>
                  </WaterfallRow>
                )
              })}
              {incomeTxs.map((tx, i) => (
                <div key={"inc-" + i} className="flex items-baseline gap-2 py-1.5 px-1 border-b border-border/30 last:border-0">
                  <span className="text-[10px] text-muted-foreground shrink-0 w-20">{tx.date}</span>
                  <span className="flex-1 text-[11px] text-muted-foreground truncate">{tx.description}</span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">+{currencyExact(tx.amount)}</span>
                </div>
              ))}
            </WaterfallRow>

            {flowRows.map((row) => {
              const flowKey = "class-" + row.id
              return (
                <WaterfallRow
                  key={flowKey}
                  label={row.label}
                  amount={row.amount}
                  color={row.color}
                  type="minus"
                  isFocused={focusedFlowKey === flowKey}
                  hasChildren={row.groups.length > 0}
                  isOpen={!!openTxns[flowKey]}
                  onToggle={() => toggleTxns(flowKey)}
                  onFocus={() => focusFlow(flowKey)}
                >
                  {row.groups.map((group) => {
                    const groupKey = flowKey + "-group-" + cleanFlowId(group.name)
                    return (
                      <WaterfallRow
                        key={groupKey}
                        label={group.name}
                        amount={group.amount}
                        color={group.color}
                        type="minus"
                        isFocused={focusedFlowKey === groupKey}
                        hasChildren={group.categories.length > 0}
                        isOpen={!!openTxns[groupKey]}
                        onToggle={() => toggleTxns(groupKey)}
                        onFocus={() => focusFlow(groupKey)}
                        depth={1}
                      >
                        {group.categories.map((cat) => {
                          const catKey = groupKey + "-cat-" + cleanFlowId(cat.name)
                          return (
                            <WaterfallRow
                              key={catKey}
                              label={cat.name}
                              amount={cat.amount}
                              color={cat.color}
                              type="minus"
                              isFocused={focusedFlowKey === catKey}
                              hasChildren={cat.transactions.length > 0}
                              isOpen={!!openTxns[catKey]}
                              onToggle={() => toggleTxns(catKey)}
                              onFocus={() => focusFlow(catKey)}
                              depth={2}
                            >
                              {cat.transactions.map((tx, i) => (
                                <div key={catKey + "-txn-" + i} className="flex items-baseline gap-2 py-1.5 px-1 border-b border-border/30 last:border-0">
                                  <span className="text-[10px] text-muted-foreground shrink-0 w-20">{tx.date}</span>
                                  <span className="flex-1 text-[11px] text-muted-foreground truncate">{tx.description}</span>
                                  <span className="text-[11px] font-medium text-foreground tabular-nums shrink-0">{currencyExact(tx.amount)}</span>
                                </div>
                              ))}
                            </WaterfallRow>
                          )
                        })}
                      </WaterfallRow>
                    )
                  })}
                </WaterfallRow>
              )
            })}
          </div>
          <div className="cc-waterfall-footer border-t border-border mx-3 py-2.5 flex justify-between items-center">
            <span className="text-xs font-medium text-foreground">Flow remainder</span>
            <span className={cn("text-sm font-bold tabular-nums", runningRemainder >= 0 ? "text-emerald-600" : "text-red-500")}>
              {runningRemainder >= 0 ? "+" : "-"}{currencyExact(Math.abs(runningRemainder))}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
