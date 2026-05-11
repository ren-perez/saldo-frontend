import type { FlowType } from "./types"

export const FLOW_TYPES: Record<FlowType, { label: string; plural: string; color: string; order: number }> = {
  fundamental: { label: "Fundamental", plural: "Fundamentals", color: "#534ab7", order: 1 },
  flexible: { label: "Flexible", plural: "Flexible", color: "#d85a30", order: 2 },
  wealth: { label: "Wealth Building", plural: "Wealth Building", color: "#1d9e75", order: 3 },
}

export const INCOME_COLOR = "#1d9e75"
export const UNALLOCATED_COLOR = "#6b7280"
