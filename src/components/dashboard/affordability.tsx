"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Activity,
  Building2,
  CircleAlert,
  Calendar,
  ArrowRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { currency, currencyExact, formatDateShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDashboard } from "./dashboard-context"

const typeIcons: Record<string, React.ElementType> = {
  checking: Wallet,
  savings: PiggyBank,
  investment: TrendingUp,
  credit: CreditCard,
}

const BAR_COLORS: Record<string, string> = {
  checking: "#3b82f6",
  savings: "#10b981",
  credit: "#ef4444",
  investment: "#8b5cf6",
}

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
export function Affordability({ accounts = [], dashboardStats, budgetContext, incomeSummary, goals = [], accountBalanceHistories = {} }: any) {
  const [itemAmount, setItemAmount] = useState(300)
  const { month, year } = useDashboard()

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

  const operatingCash = useMemo(
    () =>
      accounts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((a: any) => a.type === "checking")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((s: number, a: any) => s + (a.balance ?? 0), 0),
    [accounts]
  )

  const creditExposure = useMemo(
    () =>
      Math.abs(
        accounts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((a: any) => a.type === "credit")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .reduce((s: number, a: any) => s + Math.min(0, a.balance ?? 0), 0)
      ),
    [accounts]
  )

  const emergencyReserve = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const efGoal = goals.find((g: any) => g.name.toLowerCase().includes("emergency"))
    if (efGoal) return efGoal.current_amount ?? efGoal.total_amount
    return accounts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((a: any) => a.type === "savings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((s: number, a: any) => s + (a.balance ?? 0), 0)
  }, [goals, accounts])

  const flowMap = useMemo(() => {
    const map = new Map<string, { inflow: number; outflow: number }>()
    if (dashboardStats?.accountFlows) {
      for (const f of dashboardStats.accountFlows) {
        map.set(f.accountId, { inflow: f.inflow, outflow: f.outflow })
      }
    }
    return map
  }, [dashboardStats])

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

  function balanceChart(balanceHistory: Array<{ date: string; balance: number }>, color: string) {
    if (!balanceHistory.length) return <span className="text-[10px] text-muted-foreground/60 px-1">No history</span>
    const w = 172, h = 42, pad = 4
    const values = balanceHistory.map((p) => p.value ?? p.balance)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(1, max - min)
    const latest = values[values.length - 1]
    const first = values[0]
    const change = latest - first
    const label = `${currencyExact(latest)}${balanceHistory.length > 1 ? ` · ${change >= 0 ? "+" : ""}${currencyExact(change)}` : ""}`

    if (values.length <= 3) {
      const barW = Math.max(3, (w - pad * 2) / values.length - 2)
      const bars = balanceHistory.map((p, i) => {
        const val = p.value ?? p.balance
        const bh = Math.max(3, ((val - min) / span) * (h - 12) + 3)
        const x = pad + i * ((w - pad * 2) / values.length)
        const y = h - pad - bh
        return (
          <rect
            key={i}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            width={barW.toFixed(1)}
            height={bh.toFixed(1)}
            rx="1.5"
            fill={color}
            opacity={val < 0 ? "0.5" : "0.82"}
          />
        )
      })
      return (
        <div className="cc-balance-chart" title={label}>
          <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
            {bars}
            <line x1="0" y1={h - pad} x2={w} y2={h - pad} stroke="oklch(0.3 0 0)" strokeWidth="1" />
          </svg>
          <span className="text-[9px] text-muted-foreground tabular-nums truncate">{label}</span>
        </div>
      )
    }

    const pts = values.map((v, i) => {
      const x = values.length === 1 ? w / 2 : pad + i * ((w - pad * 2) / (values.length - 1))
      const y = h - pad - ((v - min) / span) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return (
      <div className="cc-balance-chart" title={label}>
        <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="0" y1={h - pad} x2={w} y2={h - pad} stroke="oklch(0.3 0 0)" strokeWidth="1" />
        </svg>
        <span className="text-[9px] text-muted-foreground tabular-nums truncate">{label}</span>
      </div>
    )
  }

  return (
    <Card className="cc-module-card flex flex-col pt-0">
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

        {/* ════════════════════════════════════════
            Feature 3 — Account rail KPIs
           ════════════════════════════════════════ */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-border p-2.5 rounded-lg bg-card text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Operating</p>
            <strong className="text-xs text-blue-500 tabular-nums">
              {currency(operatingCash)}
            </strong>
            <p className="text-[9px] text-muted-foreground">cash</p>
          </div>
          <div className="border border-border p-2.5 rounded-lg bg-card text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Credit</p>
            <strong className="text-xs text-red-500 tabular-nums">
              {currency(creditExposure)}
            </strong>
            <p className="text-[9px] text-muted-foreground">exposure</p>
          </div>
          <div className="border border-border p-2.5 rounded-lg bg-card text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Reserve</p>
            <strong className="text-xs text-emerald-500 tabular-nums">
              {currency(emergencyReserve)}
            </strong>
            <p className="text-[9px] text-muted-foreground">emergency</p>
          </div>
        </div>

        {/* ════════════════════════════════════════
            Features 4+5 — Per-account line charts
            + Account combo texture
           ════════════════════════════════════════ */}
        {accounts.length > 0 && (
          <div className="border border-border rounded-xl bg-muted/20">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Accounts</p>
              <span className="text-[10px] text-muted-foreground">
                {accounts.length} active
              </span>
            </div>
            <div className="divide-y divide-border">
              {accounts.map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (account: any) => {
                  const Icon = typeIcons[account.type] ?? Wallet
                  const acctFlow = flowMap.get(account._id) ?? { inflow: 0, outflow: 0 }
                  const balance = account.balance ?? 0
                  const color = BAR_COLORS[account.type] ?? "#6b7280"
                  const balanceHistory = accountBalanceHistories[account._id] ?? []
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const periodTxCount = balanceHistory.filter((p: any) => {
                    const d = p.date ?? ""
                    return d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)
                  }).length
                  const goalName = account.linkedGoals?.[0]?.name ?? null
                  const goalEmoji = account.linkedGoals?.[0]?.emoji ?? null

                  const freshnessText = account.lastUploadedAt
                    ? formatDateShort(account.lastUploadedAt)
                    : "New"

                  return (
                    <Link
                      key={account._id}
                      href={`/transactions?accountId=${account._id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0,1fr) auto minmax(148px,172px) auto",
                        gap: "9px",
                        padding: "8px 10px",
                        alignItems: "center",
                      }}
                      className="hover:bg-muted/50 transition-colors group"
                    >
                      {/* Account main: name + meta */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <Icon className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium truncate group-hover:text-foreground transition-colors">
                            {account.name}
                          </span>
                          {goalEmoji && (
                            <span className="text-[10px]" title={goalName ?? ""}>
                              {goalEmoji}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate mt-px">
                          <span className="capitalize">{account.type}</span>
                          {goalName && (
                            <>
                              <span> · </span>
                              <span>{goalName}</span>
                            </>
                          )}
                          <span> · </span>
                          <span>{freshnessText}</span>
                        </p>
                      </div>

                      {/* Txn badge */}
                      {periodTxCount > 0 && (
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 leading-none",
                            periodTxCount > 20
                              ? "bg-amber-500/10 text-amber-600"
                              : periodTxCount > 5
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {periodTxCount}
                          <span className="hidden sm:inline"> txns</span>
                        </span>
                      )}

                      {/* Balance chart: line chart + label */}
                      {balanceChart(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        balanceHistory.map((p: any) => ({ date: p.date ?? "", balance: p.value ?? p.balance })),
                        color
                      )}

                      {/* Period outflow */}
                      <div className="text-right min-w-[60px]">
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            acctFlow.outflow > 0 ? "text-red-500" : "text-muted-foreground"
                          )}
                        >
                          {acctFlow.outflow > 0
                            ? currency(acctFlow.outflow)
                            : currency(balance)}
                        </span>
                      </div>
                    </Link>
                  )
                }
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {accounts.length === 0 && (
          <div className="border border-dashed border-border rounded-xl p-6 text-center">
            <Wallet className="size-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No accounts linked yet.</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Add accounts to see affordability rails.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
