"use client"

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { currencyExact } from "@/lib/format"

interface WaterfallRowProps {
  label: string
  amount: number
  color: string
  type: "plus" | "minus"
  isOpen?: boolean
  isFocused?: boolean
  hasChildren?: boolean
  onToggle?: () => void
  onFocus?: () => void
  children?: React.ReactNode
  depth?: number
  endSlot?: React.ReactNode
  className?: string
}

export function WaterfallRow({
  label,
  amount,
  color,
  type,
  isOpen = false,
  isFocused = false,
  hasChildren = false,
  onToggle,
  onFocus,
  children,
  depth = 0,
  endSlot,
  className,
}: WaterfallRowProps) {
  return (
    <div className="flex flex-col">
      <div
        id={"flowrow-" + label}
        className={cn(
          "flex items-center gap-3 py-2 px-1 rounded-md transition-colors",
          depth === 0 ? "cursor-default" : "cursor-pointer hover:bg-muted/30",
          isFocused && "bg-muted/40 ring-1 ring-primary/20",
          depth > 0 && "ml-" + Math.min(depth * 3, 6),
          className
        )}
        onClick={() => {
          if (hasChildren && onToggle) onToggle()
          if (onFocus) onFocus()
        }}
      >
        <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="flex-1 text-xs font-medium text-foreground truncate">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              type === "plus" ? "text-emerald-600" : "text-foreground"
            )}
          >
            {type === "plus" ? "+" : "-"}{currencyExact(amount)}
          </span>
          {endSlot}
          {hasChildren && (
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          )}
        </div>
      </div>

      {isOpen && hasChildren && (
        <div
          className={cn(
            "flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150",
            depth === 0 ? "pl-5 pr-2 py-1 border-l ml-2 border-border/50" : "pl-3"
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}
