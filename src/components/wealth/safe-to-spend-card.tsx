"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { format } from "date-fns"
import { Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { currencyExact } from "@/lib/format"

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function SafeToSpendCard({ userId }: { userId: Id<"users"> }) {
  const now = new Date()
  const monthKey = format(now, "yyyy-MM")
  const data = useQuery(api.allocations.getMonthlyBudgetContext, { userId, monthKey })

  if (data === undefined) return null

  // Empty state: A minimal outline badge
  if (data.totalPool === 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-border/80 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        <Wallet className="size-3 shrink-0" />
        <span>No spending rule set</span>
      </div>
    )
  }

  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const totalDays = daysInMonth(year, month)
  const daysPassed = now.getDate()
  const pacingRate = daysPassed / totalDays
  const spendRate = data.totalPool > 0 ? data.totalSpent / data.totalPool : 0
  
  const isOverPacing = spendRate > pacingRate + 0.05
  const isOverBudget = data.remaining < 0
  const progressPct = Math.min(100, (data.totalSpent / data.totalPool) * 100)

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 shadow-sm">
      {/* Main Stat */}
      <div className="flex items-baseline gap-1.5">
        <Wallet className="size-3.5 text-muted-foreground self-center hidden sm:block" />
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
          Safe to spend:
        </span>
        <span 
          className={cn("text-sm font-semibold tabular-nums tracking-tight", {
            "text-destructive": isOverBudget,
            "text-foreground": !isOverBudget,
          })}
        >
          {currencyExact(Math.abs(data.remaining))}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {isOverBudget ? "over" : "left"}
        </span>
      </div>

      {/* Visual Divider */}
      <div className="w-px h-3.5 bg-border/80 hidden sm:block" />

      {/* Micro Progress Bar & Context */}
      <div className="flex items-center gap-2">
        <div className="relative h-1.5 w-16 sm:w-20 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", {
              "bg-primary/80": !isOverPacing && !isOverBudget,
              "bg-amber-500/80": isOverPacing && !isOverBudget,
              "bg-destructive/80": isOverBudget,
            })}
            style={{ width: `${progressPct}%` }}
          />
          {/* Pacing Marker */}
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-background"
            style={{ left: `${pacingRate * 100}%` }}
          />
        </div>
        
        {/* Only show the limit on larger screens where there is space */}
        <span className="text-xs text-muted-foreground hidden md:inline">
          of {currencyExact(data.totalPool)}
        </span>
      </div>
    </div>
  )
}