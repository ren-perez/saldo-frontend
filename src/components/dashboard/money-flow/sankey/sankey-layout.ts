import type { SankeyNode, SankeyLink, FlowHierarchyNode } from "../shared/types"

export const W = 760
export const H = 360
export const padT = 12
export const padB = 14
export const nodeW = 12
export const levelXs = [28, 245, 470, 710]
const GAP_MANY = 3
const GAP_FEW = 7
const MIN_H = 4

function gapForCount(n: number): number {
  return n > 16 ? GAP_MANY : GAP_FEW
}

export interface ComputedLayout {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

/**
 * Builds a Sankey layout from FlowHierarchyNode data using top-down flow conservation.
 *
 * Conservation rule: each node's height equals the sum of its incoming link widths,
 * and each outgoing link width is proportional to (child.amount / parent.amount) * parent.h.
 * This guarantees that link widths visually add up to the parent node height (minus inter-node gaps).
 */
export function computeSankeyLayout(
  totalIncome: number,
  flowNodes: FlowHierarchyNode[],
): ComputedLayout {
  const nodeMap = new Map<string, SankeyNode>()
  const levels: SankeyNode[][] = [[], [], [], []]
  const linkList: SankeyLink[] = []

  function getOrCreate(id: string, level: number, label: string, amount: number, color: string, isUnallocated = false): SankeyNode {
    let n = nodeMap.get(id)
    if (!n) {
      n = { id, level, label, amount, color, x: levelXs[level], y: 0, h: 0, inLinks: [], outLinks: [], nextOutY: 0, nextInY: 0, isUnallocated }
      nodeMap.set(id, n)
      levels[level].push(n)
    }
    return n
  }

  function addLink(sourceId: string, targetId: string, amount: number, color: string, title: string) {
    if (amount <= 0) return
    const s = nodeMap.get(sourceId)
    const t = nodeMap.get(targetId)
    if (!s || !t) return
    const link: SankeyLink = { source: s, target: t, amount, color, title, w: 0 }
    linkList.push(link)
    s.outLinks.push(link)
    t.inLinks.push(link)
  }

  // ── Build graph ──────────────────────────────────────────────────────────────
  const incomeId = "income"
  getOrCreate(incomeId, 0, "Flow source", totalIncome, "#1d9e75")

  for (const flowNode of flowNodes) {
    const classId = flowNode.id
    getOrCreate(classId, 1, flowNode.label, flowNode.amount, flowNode.color, flowNode.id === "unallocated")
    addLink(incomeId, classId, flowNode.amount, flowNode.color, "Flow source to " + flowNode.label)

    for (const group of flowNode.children) {
      if (group.amount <= 0) continue
      const groupId = group.id
      getOrCreate(groupId, 2, group.label, group.amount, group.color)
      addLink(classId, groupId, group.amount, group.color, flowNode.label + " to " + group.label)

      for (const cat of group.children) {
        if (cat.amount <= 0) continue
        const catId = cat.id
        getOrCreate(catId, 3, cat.label, cat.amount, cat.color)
        addLink(groupId, catId, cat.amount, cat.color, group.label + " to " + cat.label)
      }
    }
  }

  // ── Top-down flow conservation layout ───────────────────────────────────────
  // Step 1: compute income node height (fills usable space at level 0)
  const incomeNode = nodeMap.get(incomeId)!
  const l0gap = gapForCount(levels[0].length)
  const l0usable = H - padT - padB - l0gap * Math.max(0, levels[0].length - 1)
  incomeNode.h = Math.max(MIN_H, l0usable)

  // Step 2: propagate link widths and node heights top-down
  for (let level = 0; level < 3; level++) {
    for (const parentNode of levels[level]) {
      if (parentNode.amount <= 0) continue
      // Distribute parent height across outgoing links proportionally
      for (const link of parentNode.outLinks) {
        link.w = Math.max(1, (link.amount / parentNode.amount) * parentNode.h)
      }
      // Child node height = sum of its incoming link widths
      for (const link of parentNode.outLinks) {
        const child = link.target
        child.h = child.inLinks.reduce((s, l) => s + l.w, 0)
      }
    }
  }

  // Step 3: vertical positioning — sort by amount desc, stack with gaps
  for (let level = 0; level < 4; level++) {
    const levelNodes = levels[level]
    levelNodes.sort((a, b) => b.amount - a.amount)
    const gap = gapForCount(levelNodes.length)
    let y = padT
    for (const n of levelNodes) {
      n.x = levelXs[level]
      n.y = y
      n.nextOutY = y
      n.nextInY = y
      y += Math.max(MIN_H, n.h) + gap
    }
  }

  return { nodes: Array.from(nodeMap.values()), links: linkList }
}
