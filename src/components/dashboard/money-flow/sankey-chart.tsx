"use client"

import { useRef, useMemo, useCallback } from "react"
import type { FlowRow, SankeyNode, SankeyLink } from "./types"

interface SankeyChartProps {
  totalIncome: number
  rows: FlowRow[]
  zoom: number
  focusedFlowKey: string | null
  onFocus: (key: string | null) => void
}

const W = 760
const H = 360
const padT = 12
const padB = 14
const nodeW = 12
const levelXs = [28, 245, 470, 710]
const MAX_LINK = 22

function cleanId(s: string): string {
  return String(s).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
}

function formatAmt(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1000) return "$" + (abs / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return "$" + Math.round(abs).toLocaleString()
}

export function SankeyChart({ totalIncome, rows, zoom, focusedFlowKey, onFocus }: SankeyChartProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const panState = useRef<{ startX: number; startY: number; left: number; top: number } | null>(null)
  const bodyUserSelect = useRef("")

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = viewportRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    }
    bodyUserSelect.current = document.body.style.userSelect
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
      document.body.style.userSelect = bodyUserSelect.current
      panState.current = null
    }
  }, [])

  const { nodesByLevel, links } = useMemo(() => {
    const nodeMap = new Map<string, SankeyNode>()
    const levels: SankeyNode[][] = [[], [], [], []]
    const linkList: SankeyLink[] = []

    function getOrCreateNode(id: string, level: number, label: string, amount: number, color: string): SankeyNode {
      let n = nodeMap.get(id)
      if (!n) {
        n = { id, level, label, amount: 0, color, x: levelXs[level], y: 0, h: 0, inLinks: [], outLinks: [], nextOutY: 0, nextInY: 0 }
        nodeMap.set(id, n)
        levels[level].push(n)
      }
      n.amount = Math.max(n.amount, amount)
      if (color) n.color = color
      return n
    }

    function addLink(sourceId: string, targetId: string, amount: number, color: string, title: string) {
      if (amount <= 0) return
      const s = nodeMap.get(sourceId)
      const t = nodeMap.get(targetId)
      if (!s || !t) return
      const link: SankeyLink = { source: s, target: t, amount, color, title }
      linkList.push(link)
      s.outLinks.push(link)
      t.inLinks.push(link)
    }

    const visibleFlowTotal = rows.reduce((s, r) => s + r.amount, 0)
    getOrCreateNode("income", 0, visibleFlowTotal > totalIncome * 1.05 ? "Flow source + bridge" : "Flow source", Math.max(totalIncome, visibleFlowTotal), "#1d9e75")

    for (const row of rows) {
      if (row.amount <= 0) continue
      const classId = "class-" + row.id
      getOrCreateNode(classId, 1, row.label, row.amount, row.color)
      addLink("income", classId, row.amount, row.color, "Flow source to " + row.label)

      for (const group of row.groups) {
        if (group.amount <= 0) continue
        const groupId = classId + "-group-" + cleanId(group.name)
        getOrCreateNode(groupId, 2, group.name, group.amount, group.color || row.color)
        addLink(classId, groupId, group.amount, group.color || row.color, row.label + " to " + group.name)

        for (const cat of group.categories) {
          if (cat.amount <= 0) continue
          const catId = groupId + "-cat-" + cleanId(cat.name)
          getOrCreateNode(catId, 3, cat.name, cat.amount, cat.color || group.color || row.color)
          addLink(groupId, catId, cat.amount, cat.color || group.color || row.color, group.name + " to " + cat.name)
        }
      }
    }

    for (const level of levels) {
      level.sort((a, b) => b.amount - a.amount)
      const total = level.reduce((s, n) => s + n.amount, 0) || 1
      const gap = level.length > 16 ? 3 : 7
      const usable = Math.max(80, H - padT - padB - gap * Math.max(0, level.length - 1))
      let y = padT
      for (const n of level) {
        n.h = Math.max(level.length > 24 ? 3 : 5, (n.amount / total) * usable)
        n.x = levelXs[n.level]
        n.y = y
        n.nextOutY = y
        n.nextInY = y
        y += n.h + gap
      }
    }

    return { nodesByLevel: levels, links: linkList }
  }, [totalIncome, rows])

  const linkPaths = useMemo(() => {
    const sorted = [...links].sort((a, b) => b.amount - a.amount)
    const maxLink = sorted.reduce((m, l) => Math.max(m, l.amount), 1)
    return sorted.map((l) => {
      const sw = Math.max(1, Math.min(MAX_LINK, (l.amount / maxLink) * MAX_LINK))
      const sy = l.source.nextOutY + Math.min(l.source.h, sw) / 2
      const ty = l.target.nextInY + Math.min(l.target.h, sw) / 2
      l.source.nextOutY += Math.min(l.source.h, sw + 1)
      l.target.nextInY += Math.min(l.target.h, sw + 1)
      const sx = l.source.x + nodeW
      const tx = l.target.x
      const c1x = sx + 54
      const c2x = tx - 54
      const focusId = l.target.level === 3 ? l.source.id : l.target.id
      return (
        <path
          key={l.source.id + "->" + l.target.id}
          className={"sankey-link" + (focusedFlowKey === focusId ? " sankey-focus" : "")}
          onClick={() => onFocus(focusId)}
          d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${sy.toFixed(1)}, ${c2x.toFixed(1)} ${ty.toFixed(1)}, ${tx.toFixed(1)} ${ty.toFixed(1)}`}
          stroke={l.color}
          strokeWidth={sw.toFixed(2)}
          fill="none"
          opacity={focusedFlowKey && focusedFlowKey !== focusId ? 0.15 : 0.35}
        >
          <title>{l.title + " " + formatAmt(l.amount)}</title>
        </path>
      )
    })
  }, [links, focusedFlowKey, onFocus])

  const nodeElements = useMemo(() => {
    const els: React.ReactNode[] = []
    for (const level of nodesByLevel) {
      for (const n of level) {
        const showLabel = n.level < 4 || n.h >= 7
        const label = n.label.length > 24 ? n.label.slice(0, 23) + "..." : n.label
        const anchor = n.level === 0 ? "start" : n.level === 3 ? "end" : "middle"
        const lx = n.level === 0 ? n.x + nodeW + 6 : n.level === 3 ? n.x - 6 : n.x + nodeW / 2
        const focusId = n.level === 3 && n.inLinks[0] ? n.inLinks[0].source.id : n.id
        els.push(
          <g
            key={n.id}
            className={"sankey-node" + (focusedFlowKey === focusId ? " sankey-focus" : "")}
            onClick={() => onFocus(focusId)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={n.x}
              y={n.y.toFixed(1)}
              width={nodeW}
              height={Math.max(2, n.h).toFixed(1)}
              rx={3}
              fill={n.color}
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
              >
                {label}
              </text>
            )}
          </g>
        )
      }
    }
    return els
  }, [nodesByLevel, focusedFlowKey, onFocus])

  const captions = useMemo(() => {
    const labels = ["Source", "Flow", "Groups", "Categories"]
    return labels.map((l, i) => (
      <text key={l} x={levelXs[i]} y={356} fontSize={8} fill="currentColor" className="fill-muted-foreground/60" textAnchor="middle">
        {l}
      </text>
    ))
  }, [])

  return (
    <div
      ref={viewportRef}
      className="cc-sankey-viewport overflow-auto scrollbar-hide cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ maxHeight: "360px" }}
    >
      <svg
        className="cc-sankey"
        style={{ width: (zoom * 100).toFixed(0) + "%", height: (H * zoom).toFixed(0) + "px", minWidth: W + "px", display: "block" }}
        viewBox={"0 0 " + W + " " + H}
        preserveAspectRatio="xMidYMid meet"
      >
        {linkPaths}
        {nodeElements}
        {captions}
      </svg>
    </div>
  )
}
