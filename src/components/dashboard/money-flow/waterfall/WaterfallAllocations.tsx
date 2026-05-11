"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"
import { currencyExact } from "@/lib/format"
import { allocColors, categoryLabels } from "@/components/wealth/income-shared"

interface Allocation {
  accountName: string
  amount: number
  category: string
}

export function WaterfallAllocations({ incomePlanId }: { incomePlanId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allocations = useQuery(api.allocations.getAllocationsForPlan as any, { incomePlanId })

  if (!allocations) {
    return <div className="h-1.5 bg-muted/30 rounded animate-pulse mx-1 mt-1 mb-2" />
  }
  if (allocations.length === 0) return null

  const total = allocations.reduce((s: number, a: Allocation) => s + a.amount, 0)

  return (
    <div className="flex flex-col gap-1 mt-1 mb-1.5">
      {/* Stacked bar */}
      <div className="flex h-1 rounded-full overflow-hidden bg-muted/40">
        {allocations.map((a: Allocation, i: number) => {
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
      {/* Breakdown */}
      <div className="flex flex-col gap-0.5">
        {allocations.map((a: Allocation, i: number) => (
          <div key={a.accountName + i} className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 min-w-0">
              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: allocColors[i % allocColors.length] }} />
              <span className="text-muted-foreground/80 truncate">{a.accountName}</span>
              <span className="text-muted-foreground/50">{categoryLabels[a.category] ?? a.category}</span>
            </div>
            <span className="font-medium tabular-nums text-foreground/80 shrink-0 ml-2">{currencyExact(a.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
