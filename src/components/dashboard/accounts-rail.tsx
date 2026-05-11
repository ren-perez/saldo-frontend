"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { currency, formatDateShort } from "@/lib/format"
import { Wallet, PiggyBank, TrendingUp, CreditCard } from "lucide-react"

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

function balanceChart(balanceHistory: Array<{ date: string; balance: number }>, color: string) {
  if (!balanceHistory.length) return <span className="text-[10px] text-muted-foreground/60 px-1">No history</span>
  const w = 172, h = 42, pad = 4
  const values = balanceHistory.map((p) => p.balance)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const latest = values[values.length - 1]
  const first = values[0]
  const change = latest - first
  const label = `${currency(latest)}${balanceHistory.length > 1 ? ` · ${change >= 0 ? "+" : ""}${currency(change)}` : ""}`

  if (values.length <= 3) {
    const barW = Math.max(3, (w - pad * 2) / values.length - 2)
    const bars = balanceHistory.map((p, i) => {
      const val = p.balance
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

type AccountsRailProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accounts: any[]
  operatingCash: number
  creditExposure: number
  emergencyReserve: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flowMap: Map<string, { inflow: number; outflow: number }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accountBalanceHistories: Record<string, any[]>
  month: number
  year: number
}

export function AccountsRail({
  accounts,
  operatingCash,
  creditExposure,
  emergencyReserve,
  flowMap,
  accountBalanceHistories,
  month,
  year,
}: AccountsRailProps) {
  if (accounts.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl p-6 text-center">
        <Wallet className="size-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No accounts linked yet.</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          Add accounts to see affordability rails.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-xl bg-muted/20">
      {/* Header with inline KPI trio */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-wrap gap-2">
        <p className="text-xs font-semibold text-foreground">Accounts</p>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-blue-500 tabular-nums font-medium">
            <span className="text-muted-foreground mr-1">cash</span>{currency(operatingCash)}
          </span>
          <span className="text-[10px] text-red-500 tabular-nums font-medium">
            <span className="text-muted-foreground mr-1">credit</span>{currency(creditExposure)}
          </span>
          <span className="text-[10px] text-emerald-500 tabular-nums font-medium">
            <span className="text-muted-foreground mr-1">reserve</span>{currency(emergencyReserve)}
          </span>
          <span className="text-[10px] text-muted-foreground">{accounts.length} active</span>
        </div>
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
                  gridTemplateColumns: "1fr 2.33fr",
                  gap: "12px",
                  padding: "8px 10px",
                  alignItems: "center",
                }}
                className="hover:bg-muted/50 transition-colors group"
              >
                {/* Left: Account main with name, meta, and txn badge */}
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Icon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium truncate group-hover:text-foreground transition-colors">
                      {account.name}
                    </span>
                  </div>
                  {goalName && (
                    <p className="text-[9px] text-muted-foreground truncate flex items-center gap-1">
                      {goalEmoji && <span>{goalEmoji}</span>}
                      <span>{goalName}</span>
                    </p>
                  )}
                  <p className="text-[9px] text-muted-foreground truncate">
                    <span className="capitalize">{account.type}</span>
                    <span> · </span>
                    <span className="text-muted-foreground/70">updated</span>
                    <span> </span>
                    <span>{freshnessText}</span>
                  </p>
                  {periodTxCount > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit leading-none",
                        periodTxCount > 20
                          ? "bg-amber-500/10 text-amber-600"
                          : periodTxCount > 5
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {periodTxCount}
                      <span className="hidden sm:inline"> transactions</span>
                    </span>
                  )}
                </div>

                {/* Right: Balance chart + Period outflow */}
                <div className="flex items-center justify-end gap-3">
                  {balanceChart(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    balanceHistory.map((p: any) => ({ date: p.date ?? "", balance: p.value ?? p.balance })),
                    color
                  )}
                  <div className="text-right min-w-[44px]">
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
                </div>
              </Link>
            )
          }
        )}
      </div>
    </div>
  )
}
