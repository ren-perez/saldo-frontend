import { cn } from "@/lib/utils"
import { monthShort, type DayCell } from "./types"
import { formatCompact } from "./utils"
import { DayCellButton } from "./day-cell-button"

type CalendarHandlers = {
  plannedMap: Record<string, unknown>
  selectedDate: string | null
  hoveredDate: string | null
  todayStr: string
  onCellClick: (day: DayCell) => void
  onMouseEnter: (dateKey: string) => void
  onMouseLeave: () => void
}

const LEGEND_MONTHLY = [
  ["bg-[oklch(58%_0.14_160/55%)]", "Income"],
  ["bg-[oklch(60%_0.18_25/55%)]", "Expenses"],
  ["bg-[oklch(57%_0.16_220/55%)]", "Goals"],
  ["border-b-2 border-dashed border-cyan-400/60 h-0 w-2.5", "Planned"],
  ["bg-amber-400 size-1.5 rounded-full ring-[1.5px] ring-white dark:ring-gray-900", "Subscription"],
  ["ring-[1.5px] ring-foreground bg-transparent", "Selected"],
] as const

const LEGEND_YEARLY = [
  ["bg-[oklch(58%_0.14_160/55%)]", "Income"],
  ["bg-[oklch(60%_0.18_25/55%)]", "Expenses"],
  ["bg-[oklch(57%_0.16_220/55%)]", "Goals"],
  ["border-b-2 border-dashed border-cyan-400/60 h-0 w-2.5", "Planned"],
] as const

function CalendarLegend({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-4 px-1">
      {items.map(([cls, label], i) => (
        <span key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className={cn("size-2.5 rounded-[2px] inline-block shrink-0", cls)} />
          {label}
        </span>
      ))}
    </div>
  )
}

function CellButton({ day, handlers }: { day: DayCell; handlers: CalendarHandlers }) {
  return (
    <DayCellButton
      day={day}
      isToday={day.dateKey === handlers.todayStr}
      isSelected={day.dateKey === handlers.selectedDate}
      isHovered={day.dateKey === handlers.hoveredDate}
      hasPlanned={!!handlers.plannedMap[day.dateKey]}
      onClick={() => handlers.onCellClick(day)}
      onMouseEnter={() => handlers.onMouseEnter(day.dateKey)}
      onMouseLeave={handlers.onMouseLeave}
    />
  )
}

export function YearlyView({ monthlyData, maxMonthlyVal }: {
  monthlyData: Array<{ month: number; income: number; expenses: number; goals: number }>
  maxMonthlyVal: number
}) {
  return (
    <div>
      <div className="flex items-end gap-1 h-64">
        {monthlyData.map((m) => {
          const total = m.income + m.expenses + m.goals
          const incomeH = maxMonthlyVal > 0 ? (m.income / maxMonthlyVal) * 100 : 0
          const expH = maxMonthlyVal > 0 ? (m.expenses / maxMonthlyVal) * 100 : 0
          const goalsH = maxMonthlyVal > 0 ? (m.goals / maxMonthlyVal) * 100 : 0
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full h-56 flex flex-col justify-end gap-[1px] relative">
                {m.goals > 0 && (
                  <div className="w-full rounded-t-[3px] bg-[oklch(57%_0.16_220/55%)] transition-all duration-300 group-hover:opacity-80" style={{ height: `${goalsH}%` }} />
                )}
                {m.expenses > 0 && (
                  <div className="w-full bg-[oklch(60%_0.18_25/55%)] transition-all duration-300 group-hover:opacity-80" style={{ height: `${expH}%` }} />
                )}
                {m.income > 0 && (
                  <div className="w-full rounded-b-[3px] bg-[oklch(58%_0.14_160/55%)] transition-all duration-300 group-hover:opacity-80" style={{ height: `${incomeH}%` }} />
                )}
                {total === 0 && <div className="w-full h-full bg-muted/30 rounded-[3px]" />}
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">{monthShort[m.month]}</span>
              {total > 0 && (
                <span className="text-[8px] text-muted-foreground/70 font-medium -mt-0.5">{formatCompact(total)}</span>
              )}
            </div>
          )
        })}
      </div>
      <CalendarLegend items={LEGEND_YEARLY} />
    </div>
  )
}

export function MonthlyView({ weeks, handlers }: {
  weeks: (DayCell | null)[][]
  handlers: CalendarHandlers
}) {
  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIdx) =>
              !day
                ? <div key={`empty-${dayIdx}`} className="aspect-square" />
                : <CellButton key={day.dateKey} day={day} handlers={handlers} />
            )}
          </div>
        ))}
      </div>
      <CalendarLegend items={LEGEND_MONTHLY} />
    </>
  )
}

export function WeeklyView({ weekDays, handlers }: {
  weekDays: DayCell[]
  handlers: CalendarHandlers
}) {
  return (
    <div className="flex gap-1 py-4">
      <div className="grid grid-cols-7 gap-1 flex-1">
        {weekDays.map((day) => (
          <CellButton key={day.dateKey} day={day} handlers={handlers} />
        ))}
      </div>
    </div>
  )
}

export function DailyView({ day, handlers }: {
  day: DayCell
  handlers: CalendarHandlers
}) {
  return (
    <div className="flex justify-center py-8">
      <div className="w-48 h-48">
        <CellButton day={day} handlers={handlers} />
      </div>
    </div>
  )
}
