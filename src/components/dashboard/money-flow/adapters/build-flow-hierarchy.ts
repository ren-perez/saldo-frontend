import type { FlowType, FlowHierarchyNode, FlowTransaction } from "../shared/types"
import { FLOW_TYPES, INCOME_COLOR, UNALLOCATED_COLOR } from "../shared/flow-colors"
import { cleanFlowId } from "../shared/hierarchy-utils"

interface BackendFlowRow {
  id: string
  cls: FlowType
  label: string
  amount: number
  color: string
  groups: {
    name: string
    amount: number
    color: string
    categories: { name: string; amount: number; color: string }[]
  }[]
}

interface TopCategoryGroup {
  groupName: string
  groupId: string
  amount: number
  categories: { name: string; categoryId: string; amount: number }[]
}

interface IncomePlanItem {
  _id: string
  label: string
  expected_amount: number
  actual_amount?: number
  status: string
  expected_date: string
  recurrence?: string
}

interface DailyDay {
  income?: number
  expenses?: number
  goals?: number
  txs?: { description: string; amount: number; category?: string }[]
}

interface BuildOpts {
  backendFlowRows: BackendFlowRow[]
  dailyStats: Record<string, DailyDay>
  totalIncome: number
  totalGoals: number
  topCategoryGroups: TopCategoryGroup[]
  incomePlans: IncomePlanItem[]
}

export interface HierarchyResult {
  incomeNode: FlowHierarchyNode
  flowNodes: FlowHierarchyNode[]
  incomeTxs: FlowTransaction[]
  runningRemainder: number
}

function buildTxnsByCategory(dailyStats: Record<string, DailyDay>): Map<string, FlowTransaction[]> {
  const map = new Map<string, FlowTransaction[]>()
  for (const dayKey of Object.keys(dailyStats)) {
    const day = dailyStats[dayKey]
    const txs = day?.txs ?? []
    for (const tx of txs) {
      if (tx.amount <= 0) {
        const cat = tx.category ?? "Uncategorized"
        if (!map.has(cat)) map.set(cat, [])
        map.get(cat)!.push({ date: dayKey, description: tx.description, amount: tx.amount })
      }
    }
  }
  for (const [, txns] of map) {
    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
  return map
}

function buildIncomeTxs(dailyStats: Record<string, DailyDay>): FlowTransaction[] {
  const txns: FlowTransaction[] = []
  for (const dayKey of Object.keys(dailyStats)) {
    const day = dailyStats[dayKey]
    const txs = day?.txs ?? []
    for (const tx of txs) {
      if (tx.amount > 0) {
        txns.push({ date: dayKey, description: tx.description, amount: tx.amount })
      }
    }
  }
  txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return txns
}

export function buildFlowHierarchy(opts: BuildOpts): HierarchyResult {
  const { backendFlowRows, dailyStats, totalIncome, totalGoals, topCategoryGroups, incomePlans } = opts

  const txnsByCategory = buildTxnsByCategory(dailyStats)
  const incomeTxs = buildIncomeTxs(dailyStats)

  // Sort plans: matched/completed → planned → missed
  const planOrder: Record<string, number> = { matched: 0, completed: 0, planned: 1, missed: 2 }
  const sortedPlans = [...incomePlans].sort((a, b) => {
    const ao = planOrder[a.status] ?? 3
    const bo = planOrder[b.status] ?? 3
    return ao - bo || a.expected_date.localeCompare(b.expected_date)
  })

  // Build income node with plan children
  const incomeNode: FlowHierarchyNode = {
    id: "income",
    kind: "income",
    label: "Income",
    amount: totalIncome,
    color: INCOME_COLOR,
    parentId: null,
    children: sortedPlans.map((plan) => ({
      id: "plan-" + plan._id,
      kind: "income" as const,
      label: plan.label,
      amount: plan.actual_amount ?? plan.expected_amount,
      color: INCOME_COLOR,
      parentId: "income",
      children: [],
      incomePlanId: plan._id,
      status: plan.status,
      expectedDate: plan.expected_date,
      recurrence: plan.recurrence,
      expectedAmount: plan.expected_amount,
      actualAmount: plan.actual_amount,
    })),
    transactions: incomeTxs,
  }

  // Build flow class nodes
  let flowNodes: FlowHierarchyNode[]

  if (backendFlowRows.length > 0) {
    flowNodes = backendFlowRows.map((br) => {
      const classId = "class-" + br.id
      return {
        id: classId,
        kind: "flow-class" as const,
        label: br.label,
        amount: br.amount,
        color: br.color,
        parentId: "income",
        children: br.groups.map((bg) => {
          const groupId = classId + "-group-" + cleanFlowId(bg.name)
          return {
            id: groupId,
            kind: "group" as const,
            label: bg.name,
            amount: bg.amount,
            color: bg.color,
            parentId: classId,
            children: bg.categories.map((bc) => ({
              id: groupId + "-cat-" + cleanFlowId(bc.name),
              kind: "category" as const,
              label: bc.name,
              amount: bc.amount,
              color: bc.color,
              parentId: groupId,
              children: [],
              transactions: txnsByCategory.get(bc.name) ?? [],
            })),
          }
        }),
      }
    })
  } else {
    // Fallback: build from topCategoryGroups
    const flowMapData: Record<string, {
      cls: FlowType
      label: string
      amt: number
      color: string
      groupsMap: Record<string, { name: string; amount: number; color: string; categories: { name: string; amount: number; color: string; transactions: FlowTransaction[] }[] }>
    }> = {}

    for (const cls of Object.keys(FLOW_TYPES) as FlowType[]) {
      const ft = FLOW_TYPES[cls]
      flowMapData[cls] = { cls, label: ft.label, amt: 0, color: ft.color, groupsMap: {} }
    }

    for (const group of topCategoryGroups) {
      for (const cat of group.categories) {
        if (cat.amount <= 0) continue
        const ft = "flexible" as FlowType
        const entry = flowMapData[ft]
        if (!entry) continue
        entry.amt += cat.amount
        const groupKey = group.groupId || cleanFlowId(group.groupName)
        if (!entry.groupsMap[groupKey]) {
          entry.groupsMap[groupKey] = { name: group.groupName, amount: 0, color: entry.color, categories: [] }
        }
        const grp = entry.groupsMap[groupKey]
        grp.amount += cat.amount
        grp.categories.push({ name: cat.name, amount: cat.amount, color: grp.color, transactions: txnsByCategory.get(cat.name) ?? [] })
      }
    }

    if (totalGoals > 0) {
      const wealthEntry = flowMapData["wealth"]
      wealthEntry.amt += totalGoals
      const gk = "goals"
      if (!wealthEntry.groupsMap[gk]) {
        wealthEntry.groupsMap[gk] = { name: "Goals", amount: 0, color: "#1d9e75", categories: [] }
      }
      wealthEntry.groupsMap[gk].amount += totalGoals
      wealthEntry.groupsMap[gk].categories.push({ name: "Goal transfers", amount: totalGoals, color: "#1d9e75", transactions: [] })
    }

    flowNodes = (Object.keys(FLOW_TYPES) as FlowType[])
      .map((cls) => {
        const entry = flowMapData[cls]
        const ft = FLOW_TYPES[cls]
        const classId = "class-" + cleanFlowId(cls)
        const groups = Object.values(entry.groupsMap).filter((g) => g.amount > 0).sort((a, b) => b.amount - a.amount)
        return {
          id: classId,
          kind: "flow-class" as const,
          label: ft.label,
          amount: entry.amt,
          color: ft.color,
          parentId: "income",
          children: groups.map((bg) => {
            const groupId = classId + "-group-" + cleanFlowId(bg.name)
            return {
              id: groupId,
              kind: "group" as const,
              label: bg.name,
              amount: bg.amount,
              color: bg.color,
              parentId: classId,
              children: bg.categories.map((bc) => ({
                id: groupId + "-cat-" + cleanFlowId(bc.name),
                kind: "category" as const,
                label: bc.name,
                amount: bc.amount,
                color: bc.color,
                parentId: groupId,
                children: [],
                transactions: bc.transactions,
              })),
            }
          }),
        }
      })
      .filter((r) => r.amount > 0)
      .sort((a, b) => FLOW_TYPES[a.id.replace("class-", "") as FlowType]?.order - FLOW_TYPES[b.id.replace("class-", "") as FlowType]?.order)
  }

  const allocatedTotal = flowNodes.reduce((s, r) => s + r.amount, 0)
  const runningRemainder = totalIncome - allocatedTotal

  // Inject unallocated node when income exceeds total flows
  if (runningRemainder > 1) {
    flowNodes = [
      ...flowNodes,
      {
        id: "unallocated",
        kind: "flow-class",
        label: "Unallocated",
        amount: runningRemainder,
        color: UNALLOCATED_COLOR,
        parentId: "income",
        children: [],
      },
    ]
  }

  return { incomeNode, flowNodes, incomeTxs, runningRemainder }
}
