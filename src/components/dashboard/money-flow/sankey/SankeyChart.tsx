"use client"

import { useRef, useMemo, useCallback } from "react"
import type { FlowHierarchyNode } from "../shared/types"
import { computeSankeyLayout, W, H, levelXs } from "./sankey-layout"
import { SankeyLinks } from "./SankeyLinks"
import { SankeyNodes } from "./SankeyNodes"

interface SankeyChartProps {
  totalIncome: number
  flowNodes: FlowHierarchyNode[]
  zoom: number
}

const LEVEL_CAPTIONS = ["Source", "Flow", "Groups", "Categories"]

export function SankeyChart({ totalIncome, flowNodes, zoom }: SankeyChartProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const panState = useRef<{ startX: number; startY: number; left: number; top: number } | null>(null)
  const savedUserSelect = useRef("")

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = viewportRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    panState.current = { startX: e.clientX, startY: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    savedUserSelect.current = document.body.style.userSelect
    document.body.style.userSelect = "none"
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const ps = panState.current
    const el = viewportRef.current
    if (!ps || !el) return
    el.scrollLeft = ps.left - (e.clientX - ps.startX)
    el.scrollTop = ps.top - (e.clientY - ps.startY)
  }, [])

  const handlePointerUp = useCallback(() => {
    if (panState.current) {
      document.body.style.userSelect = savedUserSelect.current
      panState.current = null
    }
  }, [])

  const layout = useMemo(
    () => computeSankeyLayout(totalIncome, flowNodes),
    [totalIncome, flowNodes]
  )

  const captions = useMemo(
    () => LEVEL_CAPTIONS.map((l, i) => (
      <text key={l} x={levelXs[i]} y={H - 4} fontSize={8} fill="currentColor" className="fill-muted-foreground/60" textAnchor="middle">
        {l}
      </text>
    )),
    []
  )

  return (
    <div
      ref={viewportRef}
      className="cc-sankey-viewport overflow-auto scrollbar-hide cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ maxHeight: H + "px" }}
    >
      <svg
        className="cc-sankey"
        style={{
          width: (zoom * 100).toFixed(0) + "%",
          height: (H * zoom).toFixed(0) + "px",
          minWidth: W + "px",
          display: "block",
        }}
        viewBox={"0 0 " + W + " " + H}
        preserveAspectRatio="xMidYMid meet"
      >
        <SankeyLinks links={layout.links} />
        <SankeyNodes nodes={layout.nodes} />
        {captions}
      </svg>
    </div>
  )
}
