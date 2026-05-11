"use client"

import { useMemo } from "react"
import { useMoneyFlowInteraction } from "../context/money-flow-context"
import { formatAmt } from "../shared/hierarchy-utils"
import { nodeW } from "./sankey-layout"
import type { SankeyNode } from "../shared/types"

interface SankeyNodesProps {
  nodes: SankeyNode[]
}

export function SankeyNodes({ nodes }: SankeyNodesProps) {
  const { focusedFlowKey, hoveredFlowKey, sankeyFocus, hoverFlow } = useMoneyFlowInteraction()

  const elements = useMemo(() => {
    return nodes.map((n) => {
      const showLabel = n.level < 3 || n.h >= 7
      const label = n.label.length > 24 ? n.label.slice(0, 23) + "…" : n.label
      const anchor = n.level === 0 ? "start" : n.level === 3 ? "end" : "middle"
      const lx = n.level === 0 ? n.x + nodeW + 6 : n.level === 3 ? n.x - 6 : n.x + nodeW / 2

      // Focus ID: category nodes focus their parent group
      const focusId = n.level === 3 && n.inLinks[0] ? n.inLinks[0].source.id : n.id
      const isFocused = focusedFlowKey === focusId
      const isHovered = hoveredFlowKey === focusId

      let opacity: number
      if (focusedFlowKey) {
        opacity = isFocused ? 1 : 0.35
      } else if (hoveredFlowKey) {
        opacity = isHovered ? 1 : 0.5
      } else {
        opacity = 0.9
      }

      return (
        <g
          key={n.id}
          onClick={() => sankeyFocus(focusId)}
          onMouseEnter={() => hoverFlow(focusId)}
          onMouseLeave={() => hoverFlow(null)}
          style={{ cursor: "pointer", transition: "opacity 120ms ease", opacity }}
        >
          <rect
            x={n.x}
            y={n.y.toFixed(1)}
            width={nodeW}
            height={Math.max(2, n.h).toFixed(1)}
            rx={2}
            fill={n.color}
            strokeDasharray={n.isUnallocated ? "3 2" : undefined}
            stroke={n.isUnallocated ? n.color : "none"}
            strokeWidth={n.isUnallocated ? 1 : 0}
            fillOpacity={n.isUnallocated ? 0.4 : 1}
          >
            <title>{n.label + " " + formatAmt(n.amount)}</title>
          </rect>
          {showLabel && (
            <text
              x={lx.toFixed(1)}
              y={(n.y + Math.max(8, n.h / 2 + 3)).toFixed(1)}
              textAnchor={anchor}
              fontSize={n.level < 2 ? 10 : 8}
              fill="currentColor"
              className="fill-foreground"
              fontWeight={n.level < 2 ? "600" : "500"}
              opacity={n.isUnallocated ? 0.6 : 1}
            >
              {label}
            </text>
          )}
        </g>
      )
    })
  }, [nodes, focusedFlowKey, hoveredFlowKey, sankeyFocus, hoverFlow])

  return <>{elements}</>
}
