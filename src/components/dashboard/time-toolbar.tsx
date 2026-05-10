"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDashboard, type Granularity } from "./dashboard-context"
import { ConfigDialog } from "./config-dialog"

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
  const [configOpen, setConfigOpen] = useState(false)

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

  const isNextDisabled = (granularity === "yearly" && year >= now.getFullYear())
    || (isCurrentPeriod && (
      granularity === "monthly"
      || (granularity === "weekly" && periodOffset >= currentWeekOffset)
      || (granularity === "daily" && periodOffset >= now.getDate() - 1)
    ))

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
    <>
      <div className="sticky top-[76px] z-20 flex flex-wrap justify-between items-center gap-x-3 gap-y-2 px-4 py-2.5 mt-6 mx-4 md:mx-6 bg-card/70 backdrop-blur-md border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => nav(-1)}>
            <ChevronLeft className="size-4" />
          </Button>

          <span className="text-[13px] font-medium text-foreground tabular-nums w-[92px] text-center leading-none">
            {formatPeriodLabel(month, year, granularity, periodOffset)}
          </span>

          <Button variant="ghost" size="icon" className="size-7" onClick={() => nav(1)} disabled={isNextDisabled}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

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

        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={() => setConfigOpen(true)}
          title="Configure goals, rules & flow mapping"
        >
          <Settings2 className="size-3.5" />
        </Button>
      </div>

      <ConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
    </>
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
