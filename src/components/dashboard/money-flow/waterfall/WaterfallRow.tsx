"use client"

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { currencyExact } from "@/lib/format"
import { useMoneyFlowInteraction } from "../context/money-flow-context"

const DEPTH_PX = 12

interface WaterfallRowProps {
  nodeId: string
  label: string
  amount: number
  color: string
  type: "plus" | "minus"
  hasChildren?: boolean
  depth?: number
  endSlot?: React.ReactNode
  className?: string
  parentAmount?: number
  children?: React.ReactNode
}

export function WaterfallRow({
  nodeId,
  label,
  amount,
  color,
  type,
  hasChildren = false,
  depth = 0,
  endSlot,
  className,
  parentAmount,
  children,
}: WaterfallRowProps) {
  const { focusedFlowKey, hoveredFlowKey, openNodes, focusFlow, hoverFlow, toggleNode } = useMoneyFlowInteraction()
  const isOpen = !!openNodes[nodeId]
  const isFocused = focusedFlowKey === nodeId
  const isHovered = hoveredFlowKey === nodeId && !isFocused

  const proportion = parentAmount && parentAmount > 0 ? amount / parentAmount : null

  const handleClick = () => {
    const closing = hasChildren && isOpen
    if (hasChildren) toggleNode(nodeId)
    if (!closing) focusFlow(nodeId)
  }

  return (
    <div className="flex flex-col">
      <div
        id={"flowrow-" + nodeId}
        className={cn(
          "flex flex-col rounded overflow-hidden",
          hasChildren && "cursor-pointer",
          !hasChildren && depth > 0 && "cursor-pointer",
          className
        )}
        style={{ marginLeft: depth * DEPTH_PX }}
        onClick={hasChildren || depth > 0 ? handleClick : undefined}
        onMouseEnter={() => hoverFlow(nodeId)}
        onMouseLeave={() => hoverFlow(null)}
      >
        {/* Row header */}
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-1 rounded transition-colors",
            (isFocused || isHovered) && "bg-muted/30",
            isFocused && "ring-1 ring-inset ring-primary/15",
          )}
        >
          {/* Dot indicator */}
          <span
            className="size-1.5 rounded-full shrink-0 opacity-70"
            style={{ backgroundColor: color }}
          />
          <span className="flex-1 text-xs font-medium text-foreground truncate">{label}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {proportion !== null && (
              <span className="text-[10px] tabular-nums text-muted-foreground/50 min-w-[26px] text-right">
                {Math.round(proportion * 100)}%
              </span>
            )}
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                type === "plus" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}
            >
              {type === "plus" ? "+" : "−"}{currencyExact(amount)}
            </span>
            {endSlot}
            {hasChildren && (
              <ChevronDown
                className={cn(
                  "size-3 text-muted-foreground/60 transition-transform shrink-0",
                  isOpen && "rotate-180"
                )}
              />
            )}
          </div>
        </div>

        {/* Proportion bar */}
        {proportion !== null && (
          <div className="h-px w-full bg-border/20">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${(proportion * 100).toFixed(1)}%`,
                backgroundColor: color,
                opacity: 0.45,
              }}
            />
          </div>
        )}
      </div>

      {/* Children */}
      {isOpen && hasChildren && (
        <div
          className="flex flex-col gap-px animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            paddingLeft: (depth + 1) * DEPTH_PX,
            borderLeft: "1px solid hsl(var(--border) / 0.4)",
            marginLeft: depth * DEPTH_PX + 6,
            paddingTop: 2,
            paddingBottom: 4,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
