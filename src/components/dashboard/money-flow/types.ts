export type FlowType = "fundamental" | "flexible" | "wealth"

export const FLOW_TYPES: Record<FlowType, { label: string; plural: string; color: string; order: number }> = {
  fundamental: { label: "Fundamental", plural: "Fundamentals", color: "#534ab7", order: 1 },
  flexible: { label: "Flexible", plural: "Flexible", color: "#d85a30", order: 2 },
  wealth: { label: "Wealth Building", plural: "Wealth Building", color: "#1d9e75", order: 3 },
}

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
}

export interface SankeyLink {
  source: SankeyNode
  target: SankeyNode
  amount: number
  color: string
  title: string
}
