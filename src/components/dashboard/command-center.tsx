"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useDashboard, type Granularity } from "./dashboard-context"

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CommandCenter({ stats: _stats, accounts: _accounts }: any) {
  void _stats; void _accounts
  const { month, year, granularity, periodOffset } = useDashboard()
  const periodLabel = formatPeriodLabel(month, year, granularity, periodOffset)

  const items = [
    { label: "System health", value: "Nominal", sub: "cashflow score 82 / 99", color: "bg-emerald-500", textColor: "text-emerald-500" },
    { label: "Runway", value: "$45.20/day", sub: "14 days to paycheck", color: "bg-emerald-500", textColor: "text-emerald-500" },
    { label: "Protected capital", value: "$6,800", sub: "reserve + core rails", color: "bg-blue-500", textColor: "text-blue-500" },
    { label: "Next paycheck", value: "$4,376", sub: "planned relief event", color: "bg-amber-500", textColor: "text-amber-500" },
    { label: "Goal automation", value: "Automation live", sub: "21% Roth · 31% EF", color: "bg-emerald-500", textColor: "text-emerald-500" },
  ]

  return (
    <Card className="grid grid-cols-1 md:grid-cols-[minmax(260px,0.74fr)_minmax(0,1.26fr)] gap-4 p-4 border border-border/80 bg-card/80 backdrop-blur-md shadow-sm">
      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1">Apollo Command Center</p>
        <h2 className="text-2xl font-bold tracking-tight leading-none mb-2">Mission control for {periodLabel}</h2>
        <p className="text-xs text-muted-foreground leading-snug">
          The dashboard is reading income timing, protected obligations, safe spending, and goal discipline as one operating system.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {items.map((item, idx) => (
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
    </Card>
  )
}
