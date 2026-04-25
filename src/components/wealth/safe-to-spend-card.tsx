"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { format } from "date-fns"
import { Wallet, ShieldCheck, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { currencyExact } from "@/lib/format"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function SafeToSpendCard({ userId }: { userId: Id<"users"> }) {
  const now = new Date()
  const monthKey = format(now, "yyyy-MM")
  const data = useQuery(api.allocations.getMonthlyBudgetContext, { userId, monthKey })

  if (data === undefined) return null

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

  const hasBreakdown = data.verifiedPool > 0 || data.reservedPool > 0

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 shadow-sm cursor-default">
          {/* Main stat */}
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

          {/* Divider */}
          <div className="w-px h-3.5 bg-border/80 hidden sm:block" />

          {/* Progress bar */}
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
              {/* Pacing marker */}
              <div
                className="absolute top-0 bottom-0 w-[1.5px] bg-background"
                style={{ left: `${pacingRate * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground hidden md:inline">
              of {currencyExact(data.totalPool)}
            </span>
          </div>
        </div>
      </TooltipTrigger>

      {hasBreakdown && (
        <TooltipContent side="bottom" className="flex flex-col gap-1.5 text-xs p-3 min-w-[200px]">
          <p className="font-medium text-foreground mb-0.5">Pool breakdown</p>
          {data.verifiedPool > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <ShieldCheck className="size-3" />
                Verified (transferred)
              </span>
              <span className="tabular-nums font-medium">{currencyExact(data.verifiedPool)}</span>
            </div>
          )}
          {data.reservedPool > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-sky-600">
                <Clock className="size-3" />
                Reserved (pending transfer)
              </span>
              <span className="tabular-nums font-medium">{currencyExact(data.reservedPool)}</span>
            </div>
          )}
          {data.pendingPool > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Forecast</span>
              <span className="tabular-nums font-medium">{currencyExact(data.pendingPool)}</span>
            </div>
          )}
          <div className="border-t border-border/60 mt-0.5 pt-1.5 flex justify-between">
            <span className="text-muted-foreground">Spent this month</span>
            <span className="tabular-nums font-medium">{currencyExact(data.totalSpent)}</span>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
}
