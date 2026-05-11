"use client"

import { useState, useMemo } from "react"
import {
  Activity,
  Building2,
  CircleAlert,
  Calendar,
  ArrowRight,
} from "lucide-react"
import { currency } from "@/lib/format"
import { cn } from "@/lib/utils"

const BILLS_GROUP_PATTERNS = [
  "housing",
  "utilities",
  "insurance",
  "subscriptions",
  "transportation",
  "debt",
  "healthcare",
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Affordability({ dashboardStats, budgetContext, incomeSummary }: any) {
  const [itemAmount, setItemAmount] = useState(300)

  const totalPool = budgetContext?.totalPool ?? 0
  const totalSpent = budgetContext?.totalSpent ?? dashboardStats?.totalExpenses ?? 0
  const remaining = budgetContext?.remaining ?? (totalPool - totalSpent)

  const billsAmount = useMemo(() => {
    if (!dashboardStats?.topCategoryGroups) return 0
    return dashboardStats.topCategoryGroups
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (g: any) =>
          BILLS_GROUP_PATTERNS.some((p) => g.groupName.toLowerCase().includes(p))
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum: number, g: any) => sum + g.amount, 0)
  }, [dashboardStats])

  const otherSpent = Math.max(0, totalSpent - billsAmount)
  const safeAfter = Math.max(0, remaining - itemAmount)
  const isAffordable = remaining >= itemAmount

  const normalizer = totalPool || 1
  const billsPct = (billsAmount / normalizer) * 100
  const otherSpentPct = (otherSpent / normalizer) * 100
  const itemPct = (itemAmount / normalizer) * 100
  const sumPct = billsPct + otherSpentPct + itemPct
  const safePct = Math.max(0, 100 - sumPct)
  const isOverBar = sumPct >= 100

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysPassed = now.getDate()
  const timePacing = daysPassed / daysInMonth
  const spendPacing = totalPool > 0 ? totalSpent / totalPool : 0

  const firstPaycheck = incomeSummary?.upcoming?.[0]

  const rentGroup = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dashboardStats?.topCategoryGroups?.find((g: any) => /housing|rent/i.test(g.groupName)),
    [dashboardStats]
  )

  const insuranceGroup = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dashboardStats?.topCategoryGroups?.find((g: any) => /insurance|subscription/i.test(g.groupName)),
    [dashboardStats]
  )

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border px-4 py-3 bg-muted/10 flex justify-between items-center gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Affordability</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Safe to spend and runway rails.</p>
        </div>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
            isAffordable
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {isAffordable ? "Safe" : "Caution"}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* ════════════════════════════════════════
            Feature 1 — Stack bar with legend
           ════════════════════════════════════════ */}
        {totalPool > 0 && (
          <div className="bg-muted/40 border border-border p-3 rounded-lg">
            <div className="flex items-center justify-between mb-3 gap-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                Can I spend $
                <input
                  type="number"
                  value={itemAmount}
                  onChange={(e) => setItemAmount(Math.max(0, Number(e.target.value)))}
                  className="w-16 text-center text-sm font-bold text-foreground bg-transparent border-b border-border outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span>on an item?</span>
              </p>
              <div className="text-right shrink-0">
                <strong
                  className={cn(
                    "block font-bold text-lg leading-none mb-0.5",
                    isAffordable ? "text-emerald-600" : "text-destructive"
                  )}
                >
                  {isAffordable ? "Safe" : "Over"}
                </strong>
                <span className="text-[10px] text-muted-foreground">
                  {isAffordable
                    ? `Leaves ${currency(safeAfter)}`
                    : `Over by ${currency(Math.abs(safeAfter))}`}
                </span>
              </div>
            </div>

            {/* Stacked bar */}
            <div className="relative h-5 w-full bg-muted rounded-full overflow-hidden">
              {billsAmount > 0 && (
                <div
                  className="absolute left-0 top-0 h-full bg-red-500/80 transition-all"
                  style={{ width: `${Math.min(100, billsPct)}%` }}
                />
              )}
              {otherSpent > 0 && (
                <div
                  className="absolute left-0 top-0 h-full bg-amber-500/80 transition-all"
                  style={{
                    width: `${Math.min(100, billsPct + otherSpentPct)}%`,
                    clipPath: `inset(0 ${100 - Math.min(100, billsPct + otherSpentPct)}% 0 ${Math.min(100, billsPct)}%)`,
                  }}
                />
              )}
              <div
                className="absolute left-0 top-0 h-full bg-foreground/90 transition-all z-10"
                style={{
                  width: `${Math.min(100, billsPct + otherSpentPct + itemPct)}%`,
                  clipPath: `inset(0 ${100 - Math.min(100, billsPct + otherSpentPct + itemPct)}% 0 ${Math.min(100, billsPct + otherSpentPct)}%)`,
                }}
              />
              {safePct > 0 && (
                <div
                  className="absolute left-0 top-0 h-full bg-blue-500/80 transition-all"
                  style={{
                    width: `100%`,
                    clipPath: `inset(0 ${100 - Math.min(100, sumPct + safePct)}% 0 ${Math.min(100, sumPct)}%)`,
                  }}
                />
              )}
              {isOverBar && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white drop-shadow-sm">OVER</span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground">
              {billsAmount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-red-500/80" />
                  Bills <strong className="text-foreground">{currency(billsAmount)}</strong>
                </span>
              )}
              {otherSpent > 0 && (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500/80" />
                  Spent <strong className="text-foreground">{currency(otherSpent)}</strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-foreground/80" />
                {currency(itemAmount)} item
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-500/80" />
                Safe after{" "}
                <strong className="text-foreground">{currency(Math.max(0, safeAfter))}</strong>
              </span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            Feature 2 — Pacing rows
           ════════════════════════════════════════ */}
        <div className="border border-border rounded-lg divide-y divide-border">
          {/* Bridge pace vs allowed cap */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Activity className="size-3" />
                Bridge pace vs allowed cap
              </p>
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  spendPacing <= timePacing
                    ? "text-emerald-500 bg-emerald-500/10"
                    : "text-amber-500 bg-amber-500/10"
                )}
              >
                {Math.round(spendPacing * 100)}% spent
              </span>
            </div>
            <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  spendPacing > 1 ? "bg-destructive/70" : "bg-amber-500/60"
                )}
                style={{ width: `${Math.min(100, spendPacing * 100)}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/60 rounded-full transition-all z-10"
                style={{ left: `${Math.min(100, timePacing * 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
              <span>Spent {currency(totalSpent)}</span>
              <span>Cap {currency(totalPool)}</span>
              <span>
                Day {daysPassed}/{daysInMonth}
              </span>
            </div>
          </div>

          {/* Rent reserve */}
          {rentGroup && (
            <div className="p-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3" />
                Rent reserve
              </p>
              <span className="text-xs font-semibold tabular-nums">
                {currency(rentGroup.amount)}
              </span>
            </div>
          )}

          {/* Insurance + subs expected */}
          {insuranceGroup && (
            <div className="p-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CircleAlert className="size-3" />
                Insurance + subs expected
              </p>
              <span className="text-xs font-semibold tabular-nums">
                {currency(insuranceGroup.amount)}
              </span>
            </div>
          )}

          {/* First paycheck */}
          {firstPaycheck && (
            <div className="p-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3" />
                First paycheck
              </p>
              <span className="text-xs font-semibold tabular-nums flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-normal">
                  {firstPaycheck.expected_date}
                </span>
                {currency(firstPaycheck.expected_amount)}
                <ArrowRight className="size-3 text-emerald-500" />
              </span>
            </div>
          )}

          {/* Fallback when no pacing data */}
          {!rentGroup && !insuranceGroup && !firstPaycheck && (
            <div className="p-3 text-center text-[11px] text-muted-foreground">
              {totalPool === 0
                ? "Set allocation rules in Income to see pacing."
                : "No upcoming payments detected."}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
