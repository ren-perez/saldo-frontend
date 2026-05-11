export type FlowType = "fundamental" | "flexible" | "wealth"

export type NodeKind = "income" | "flow-class" | "group" | "category" | "allocation"

export interface FlowTransaction {
  date: string
  description: string
  amount: number
}

export interface FlowCategory {
  name: string
  amount: number
  color: string
  transactions: FlowTransaction[]
}

export interface FlowGroup {
  name: string
  amount: number
  color: string
  categories: FlowCategory[]
}

export interface FlowRow {
  id: string
  cls: FlowType
  label: string
  amount: number
  color: string
  groups: FlowGroup[]
}

export interface FlowHierarchyNode {
  id: string
  kind: NodeKind
  label: string
  amount: number
  color: string
  parentId: string | null
  children: FlowHierarchyNode[]
  transactions?: FlowTransaction[]
  // Income plan child fields
  incomePlanId?: string
  status?: string
  expectedDate?: string
  recurrence?: string
  expectedAmount?: number
  actualAmount?: number
}

// Sankey internal layout types
export interface SankeyNode {
  id: string
  level: number
  label: string
  amount: number
  color: string
  x: number
  y: number
  h: number
  inLinks: SankeyLink[]
  outLinks: SankeyLink[]
  nextOutY: number
  nextInY: number
  isUnallocated?: boolean
}

export interface SankeyLink {
  source: SankeyNode
  target: SankeyNode
  amount: number
  color: string
  title: string
  w: number
}
