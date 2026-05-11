import { cn } from "@/lib/utils"
import { formatCompact, hasSubscriptions } from "./utils"
import { MIN_LABEL_PCT, type DayCell } from "./types"

export function DayCellButton({ day, isToday, isSelected, isHovered, hasPlanned, onClick, onMouseEnter, onMouseLeave }: {
  day: DayCell
  isToday: boolean
  isSelected: boolean
  isHovered: boolean
  hasPlanned: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const { income, expenses, goals: g, txs } = day.stats
  const total = income + expenses + g
  const hasActivity = total > 0
  const incomePct = hasActivity ? (income / total) * 100 : 0
  const expPct = hasActivity ? (expenses / total) * 100 : 0
  const goalsPct = hasActivity ? (g / total) * 100 : 0
  const hasSub = hasSubscriptions(txs)

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative w-full aspect-square rounded-[6px] overflow-hidden transition-all duration-150 outline-none",
        !hasActivity && "bg-muted/40",
        isToday && !isSelected && !isHovered && "ring-[1.5px] ring-gray-400/90",
        isSelected && "ring-2 ring-primary ring-offset-1 dark:ring-offset-background",
        isHovered && !isSelected && "ring-2 ring-primary/40",
        !isSelected && hasActivity && "hover:ring-2 hover:ring-primary/30",
        hasSub && "after:absolute after:right-1 after:bottom-1 after:size-1.5 after:rounded-full after:bg-amber-400 after:ring-[1.5px] after:ring-white dark:after:ring-gray-900 after:z-10"
      )}
    >
      {hasActivity && (
        <div className="absolute inset-0 flex flex-col">
          {income > 0 && (
            <div style={{ height: `${incomePct}%` }} className="bg-[oklch(58%_0.14_160/55%)] flex items-center justify-center overflow-hidden shrink-0">
              {incomePct >= MIN_LABEL_PCT && <span className="text-[10px] font-bold leading-none text-[oklch(85%_0.1_160/90)]">{formatCompact(income)}</span>}
            </div>
          )}
          {expenses > 0 && (
            <div style={{ height: `${expPct}%` }} className="bg-[oklch(60%_0.18_25/55%)] flex items-center justify-center overflow-hidden shrink-0">
              {expPct >= MIN_LABEL_PCT && <span className="text-[10px] font-bold leading-none text-[oklch(88%_0.1_25/90)]">{formatCompact(expenses)}</span>}
            </div>
          )}
          {g > 0 && (
            <div style={{ height: `${goalsPct}%` }} className="bg-[oklch(57%_0.16_220/55%)] flex items-center justify-center overflow-hidden shrink-0">
              {goalsPct >= MIN_LABEL_PCT && <span className="text-[10px] font-bold leading-none text-[oklch(85%_0.1_220/90)]">{formatCompact(g)}</span>}
            </div>
          )}
        </div>
      )}
      {hasPlanned && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] z-10 border-b-2 border-dashed border-cyan-400/60" />
      )}
      <span className={cn("absolute top-1 left-1.5 text-[9px] font-semibold z-10 tabular-nums", hasActivity ? "text-white/90" : "text-muted-foreground/90")}>
        {day.dayNum}
      </span>
    </button>
  )
}
