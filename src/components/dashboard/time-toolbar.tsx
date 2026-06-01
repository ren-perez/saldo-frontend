"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDashboard, type Granularity } from "./dashboard-context"

const monthShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const granularities: { key: Granularity; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
]

export function TimeToolbar() {
  const { month, year, handleMonthChange, goToToday, granularity, setGranularity, periodOffset, setPeriodOffset } = useDashboard()
  const now = useMemo(() => new Date(), [])

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [month, year])
  const weekCount = useMemo(() => Math.ceil(daysInMonth / 7), [daysInMonth])
  const currentWeekOffset = useMemo(() => Math.floor((now.getDate() - 1) / 7), [now])

  const isCurrentPeriod = month === now.getMonth() && year === now.getFullYear()

  const isAtCurrentView = isCurrentPeriod && (
    granularity === "monthly"
    || granularity === "yearly"
    || (granularity === "weekly" && periodOffset === currentWeekOffset)
    || (granularity === "daily" && periodOffset === now.getDate() - 1)
  )

  function nav(delta: number) {
    if (granularity === "daily") {
      const newOffset = periodOffset + delta
      if (newOffset < 0) {
        const prevMonth = month === 0 ? 11 : month - 1
        const prevYear = month === 0 ? year - 1 : year
        const prevDays = new Date(prevYear, prevMonth + 1, 0).getDate()
        setPeriodOffset(prevDays + newOffset)
        handleMonthChange(-1)
      } else if (newOffset >= daysInMonth) {
        setPeriodOffset(newOffset - daysInMonth)
        handleMonthChange(1)
      } else {
        setPeriodOffset(newOffset)
      }
    } else if (granularity === "weekly") {
      const newOffset = periodOffset + delta
      if (newOffset < 0) {
        const prevMonth = month === 0 ? 11 : month - 1
        const prevYear = month === 0 ? year - 1 : year
        const prevWeekCount = Math.ceil(new Date(prevYear, prevMonth + 1, 0).getDate() / 7)
        setPeriodOffset(prevWeekCount + newOffset)
        handleMonthChange(-1)
      } else if (newOffset >= weekCount) {
        setPeriodOffset(newOffset - weekCount)
        handleMonthChange(1)
      } else {
        setPeriodOffset(newOffset)
      }
    } else {
      handleMonthChange(delta * (granularity === "yearly" ? 12 : 1))
    }
  }

  return (
    <div className="sticky top-[76px] z-20 bg-card/80 backdrop-blur-[12px] border border-border/80 rounded-xl shadow-sm p-[10px_16px] mt-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => nav(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-bold leading-none tracking-tight text-foreground block text-[15px]">
            {formatPeriodLabel(month, year, granularity, periodOffset)}
          </span>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => nav(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px]" onClick={goToToday} disabled={isAtCurrentView}>
            Today
          </Button>
          <div className="flex bg-muted/60 rounded-lg p-0.5">
            {granularities.map((g) => (
              <button
                key={g.key}
                onClick={() => setGranularity(g.key)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all whitespace-nowrap",
                  granularity === g.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatPeriodLabel(month: number, year: number, granularity: Granularity, periodOffset: number): string {
  if (granularity === "yearly") return `${year}`
  if (granularity === "monthly") return `${monthShort[month]} ${String(year).slice(2)}`
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  if (granularity === "weekly") {
    const wkStart = periodOffset * 7 + 1
    const wkEnd = Math.min(wkStart + 6, daysInMonth)
    return `Wk ${periodOffset + 1} · ${monthShort[month]} ${wkStart}–${wkEnd}`
  }
  const day = Math.min(periodOffset + 1, daysInMonth)
  return `${monthShort[month]} ${day}, ${year}`
}
