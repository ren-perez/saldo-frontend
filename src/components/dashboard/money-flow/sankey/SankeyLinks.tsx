"use client"

import { useMemo } from "react"
import { useMoneyFlowInteraction } from "../context/money-flow-context"
import { formatAmt } from "../shared/hierarchy-utils"
import { nodeW } from "./sankey-layout"
import type { SankeyLink } from "../shared/types"

interface SankeyLinksProps {
  links: SankeyLink[]
}

export function SankeyLinks({ links }: SankeyLinksProps) {
  const { focusedFlowKey, hoveredFlowKey, sankeyFocus, hoverFlow } = useMoneyFlowInteraction()

  const paths = useMemo(() => {
    const sorted = [...links].sort((a, b) => b.amount - a.amount)

    return sorted.map((l) => {
      const sw = Math.max(1, l.w)
      const sy = l.source.nextOutY + sw / 2
      const ty = l.target.nextInY + sw / 2
      l.source.nextOutY += sw + 1
      l.target.nextInY += sw + 1

      const sx = l.source.x + nodeW
      const tx = l.target.x
      const c1x = sx + 54
      const c2x = tx - 54

      // Focus ID: for category-level links, use the parent (group) as focus target
      const focusId = l.target.level === 3 ? l.source.id : l.target.id
      const isFocused = focusedFlowKey === focusId
      const isHovered = hoveredFlowKey === focusId
      const isUnallocated = l.target.isUnallocated

      let opacity: number
      if (focusedFlowKey) {
        opacity = isFocused ? 0.6 : 0.12
      } else if (hoveredFlowKey) {
        opacity = isHovered ? 0.5 : 0.18
      } else {
        opacity = 0.35
      }

      return (
        <path
          key={l.source.id + "->" + l.target.id}
          className="sankey-link"
          onClick={() => sankeyFocus(focusId)}
          onMouseEnter={() => hoverFlow(focusId)}
          onMouseLeave={() => hoverFlow(null)}
          d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${sy.toFixed(1)}, ${c2x.toFixed(1)} ${ty.toFixed(1)}, ${tx.toFixed(1)} ${ty.toFixed(1)}`}
          stroke={l.color}
          strokeWidth={sw.toFixed(2)}
          strokeDasharray={isUnallocated ? "4 3" : undefined}
          fill="none"
          opacity={opacity}
          style={{ cursor: "pointer", transition: "opacity 120ms ease" }}
        >
          <title>{l.title + " " + formatAmt(l.amount)}</title>
        </path>
      )
    })
  }, [links, focusedFlowKey, hoveredFlowKey, sankeyFocus, hoverFlow])

  return <>{paths}</>
}
