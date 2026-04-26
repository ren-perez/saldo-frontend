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

type PacingState = "on-track" | "warning" | "over"

function getPacingState(spentPct: number, pacingPct: number, isOver: boolean): PacingState {
  if (isOver) return "over"
  if (spentPct > 0.78 && spentPct > pacingPct + 0.08) return "warning"
  return "on-track"
}

export function SafeToSpendCard({
  userId,
  className,
}: {
  userId: Id<"users">
  className?: string
}) {
  const now = new Date()
  const monthKey = format(now, "yyyy-MM")
  const data = useQuery(api.allocations.getMonthlyBudgetContext, { userId, monthKey })

  if (data === undefined) return null

  if (data.totalPool === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground",
          "shadow-[0_1px_2px_0_oklch(0%_0_0_/_8%),_0_6px_20px_-4px_oklch(0%_0_0_/_16%)]",
          className
        )}
      >
        <Wallet className="size-3.5 shrink-0" />
        <span>No spending rule set</span>
      </div>
    )
  }

  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const totalDays = daysInMonth(year, month)
  const daysPassed = now.getDate()

  const pacingPct = daysPassed / totalDays
  const spentPct = data.totalPool > 0 ? data.totalSpent / data.totalPool : 0
  const isOver = data.remaining < 0

  const pacing = getPacingState(spentPct, pacingPct, isOver)

  const reservedPct = Math.min(100, (data.reservedPool / data.totalPool) * 100)
  const verifiedPct = Math.min(100, (data.verifiedPool / data.totalPool) * 100)
  const spentBarPct = Math.min(100, spentPct * 100)
  const pacingBarPct = Math.min(100, pacingPct * 100)

  const showBreakdown = data.verifiedPool > 0 || data.reservedPool > 0
  const showDivider = data.verifiedPool > 0 && data.reservedPool > 0

  return (
    <div
      className={cn(
        "flex items-center w-full overflow-hidden",
        "rounded-xl border bg-card",
        "shadow-[0_1px_2px_0_oklch(0%_0_0_/_8%),_0_6px_20px_-4px_oklch(0%_0_0_/_16%)]",
        className
      )}
    >
      {/* ── A: Remaining (hero number) ── */}
      <div className="flex flex-col justify-center pl-5 pr-4 py-3.5 gap-0.5 shrink-0">
        <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground/60">
          Safe to spend
        </span>
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "text-[17px] font-semibold tabular-nums tracking-tight leading-none transition-colors",
              isOver ? "text-destructive" : "text-foreground"
            )}
          >
            {currencyExact(Math.abs(data.remaining))}
          </span>
          <span
            className={cn(
              "text-[11px] font-medium leading-none",
              isOver ? "text-destructive/60" : "text-muted-foreground"
            )}
          >
            {isOver ? "over" : "left"}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-border shrink-0" />

      {/* ── B: Bar + spend context ── */}
      <div className="flex flex-col justify-center flex-1 px-4 py-3.5 gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-muted-foreground truncate">
            {currencyExact(data.totalSpent)} spent
            <span className="text-muted-foreground/30"> · </span>
            <span className="text-muted-foreground/60">of {currencyExact(data.totalPool)}</span>
          </span>
          <PacingBadge state={pacing} />
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
          {/* Reserved zone */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary/20 transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${reservedPct}%` }}
          />
          {/* Verified zone */}
          <div
            className="absolute top-0 h-full rounded-full bg-primary/40 transition-[left,width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ left: `${reservedPct}%`, width: `${verifiedPct}%` }}
          />
          {/* Divider between reserved / verified */}
          {showDivider && (
            <div
              className="absolute top-0 h-full w-px bg-card z-[3] transition-[left] duration-500"
              style={{ left: `calc(${reservedPct}% - 0.5px)` }}
            />
          )}
          {/* Spend fill */}
          <div
            className={cn(
              "absolute left-0 top-0 h-full rounded-full z-[4] transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
              pacing === "over" ? "bg-destructive/70" : pacing === "warning" ? "bg-amber-500/60" : "bg-primary/70"
            )}
            style={{ width: `${spentBarPct}%` }}
          />
          {/* Pacing tick */}
          <div
            className={cn(
              "absolute top-[-1px] bottom-[-1px] w-[2px] rounded-sm z-[5]",
              pacing === "over" ? "bg-destructive" : pacing === "warning" ? "bg-amber-500" : "bg-primary"
            )}
            style={{ left: `calc(${pacingBarPct}% - 1px)` }}
          />
        </div>
      </div>

      {/* Separator + breakdown */}
      {showBreakdown && (
        <>
          <div className="w-px h-8 bg-border shrink-0" />

          {/* ── C: Pool breakdown ── */}
          <div className="flex flex-col justify-center pr-5 pl-4 py-3.5 gap-1 shrink-0">
            {data.verifiedPool > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                <span className="text-[10px] text-muted-foreground flex-1">Verified</span>
                <span className="text-[10px] font-semibold tabular-nums text-foreground">
                  {currencyExact(data.verifiedPool)}
                </span>
              </div>
            )}
            {data.reservedPool > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/25 shrink-0" />
                <span className="text-[10px] text-muted-foreground flex-1">Reserved</span>
                <span className="text-[10px] font-semibold tabular-nums text-foreground">
                  {currencyExact(data.reservedPool)}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PacingBadge({ state }: { state: PacingState }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide shrink-0 transition-all duration-150",
        state === "on-track" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
        state === "warning"  && "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
        state === "over"     && "bg-destructive/10 text-destructive border-destructive/20"
      )}
    >
      {state === "on-track" ? "On track" : state === "warning" ? "Slow down" : "Over budget"}
    </span>
  )
}
