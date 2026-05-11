"use client"

import { useState, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { MoneyFlowProvider, useMoneyFlowLayout, useResizeHandler } from "./context/money-flow-context"
import { useMoneyFlowData } from "./hooks/use-money-flow-data"
import { SankeyChart } from "./sankey/SankeyChart"
import { Waterfall } from "./waterfall/Waterfall"

// ── Types (matching dashboard page props) ─────────────────────────────────────

interface IncomeSummary {
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

export interface MoneyFlowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any
  incomeSummary?: IncomeSummary | null
  goals?: GoalData[] | null
  incomePlans?: IncomePlanItem[]
}

// ── Inner grid (needs layout context) ────────────────────────────────────────

function MoneyFlowGrid({ stats, incomeSummary, goals, incomePlans }: MoneyFlowProps) {
  const { moneyFlowSplit } = useMoneyFlowLayout()
  const [sankeyZoom, setSankeyZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const { beginResize } = useResizeHandler(containerRef)

  const data = useMoneyFlowData({ stats, incomeSummary, goals, incomePlans })

  const zoomIn = useCallback(() => setSankeyZoom((z) => Math.min(2, +(z + 0.15).toFixed(2))), [])
  const zoomOut = useCallback(() => setSankeyZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2))), [])
  const zoomReset = useCallback(() => setSankeyZoom(1), [])

  return (
    <div
      ref={containerRef}
      className="cc-flow"
      style={{
        display: "grid",
        gridTemplateColumns: `minmax(0, ${moneyFlowSplit.toFixed(1)}fr) 8px minmax(0, ${(100 - moneyFlowSplit).toFixed(1)}fr)`,
      }}
    >
      {/* ── Sankey panel ── */}
      <div className="cc-flow-col min-w-0 overflow-hidden">
        <div className="cc-sankey-head flex items-center justify-between px-3 pt-3 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Source to Flow to Groups
          </span>
          <div className="flex items-center gap-1" aria-label="Sankey zoom controls">
            <button
              onClick={zoomOut}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 size-6 flex items-center justify-center rounded transition-colors"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={zoomReset}
              className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors tabular-nums"
              title="Reset zoom"
            >
              {Math.round(sankeyZoom * 100)}%
            </button>
            <button
              onClick={zoomIn}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 size-6 flex items-center justify-center rounded transition-colors"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
        <div className="px-1">
          <SankeyChart
            totalIncome={data.totalIncome}
            flowNodes={data.flowNodes}
            zoom={sankeyZoom}
          />
        </div>
      </div>

      {/* ── Resize divider ── */}
      <div
        className="bg-border cursor-col-resize hover:bg-primary/50 transition-colors relative"
        onPointerDown={beginResize}
        title="Drag to resize"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* ── Waterfall panel ── */}
      <div className="cc-flow-col cc-waterfall-col flex flex-col min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1">
          Waterfall
        </p>
        <Waterfall
          incomeNode={data.incomeNode}
          flowNodes={data.flowNodes}
          totalIncome={data.totalIncome}
          runningRemainder={data.runningRemainder}
          matchedTotal={data.matchedTotal}
          plannedTotal={data.plannedTotal}
          expectedTotal={data.expectedTotal}
        />
      </div>
    </div>
  )
}

// ── Public export ─────────────────────────────────────────────────────────────

export function MoneyFlow(props: MoneyFlowProps) {
  return (
    <MoneyFlowProvider>
      <Card className="cc-module-card overflow-hidden pt-0">
        <div className="border-b border-border px-4 py-3 flex justify-between items-center bg-muted/10">
          <p className="text-sm font-semibold text-foreground">Money flow</p>
        </div>
        <MoneyFlowGrid {...props} />
      </Card>
    </MoneyFlowProvider>
  )
}
