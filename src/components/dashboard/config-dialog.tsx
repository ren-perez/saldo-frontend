"use client"

import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const FLOW_TYPE_COLORS: Record<string, string> = {
  fundamental: "#534ab7",
  flexible: "#d85a30",
  wealth: "#1d9e75",
}

const FLOW_TYPE_LABELS: Record<string, string> = {
  fundamental: "Fundamental",
  flexible: "Flexible",
  wealth: "Wealth Building",
}

const FLOW_TYPE_ORDER = ["fundamental", "flexible", "wealth"]

const goalRules = [
  { name: "Emergency fund", account: "360 Savings ...0244", rule: "$20,000 target", status: "$6,266 funded · 31% · ~11 months at current pace", color: "#1d9e75" },
  { name: "Roth IRA", account: "Fidelity account", rule: "$7,000 annual limit", status: "$1,450 contributed · 21% · $694/mo needed to max by Dec", color: "#534ab7" },
  { name: "Operating buffer", account: "360 Checking ...7729", rule: "Keep above rent reserve", status: "Auto-replenishes on paycheck · currently $409", color: "#3b7ed4" },
]

interface CategoryWithGroup {
  _id: string
  name: string
  groupName: string
  flow: string | undefined
  amount: number
}

export function ConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { convexUser } = useConvexUser()

  const categories = useQuery(
    convexUser ? api.categories.listCategories : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) as Array<{ _id: string; name: string; groupId?: string; stsFlowType?: string }> | undefined

  const categoryGroups = useQuery(
    convexUser ? api.categories.listCategoryGroups : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) as Array<{ _id: string; name: string }> | undefined

  const setFlowType = useMutation(api.categories.setFlowType)

  const groupMap = useMemo(() => {
    const m = new Map<string, string>()
    if (categoryGroups) for (const g of categoryGroups) m.set(g._id, g.name)
    return m
  }, [categoryGroups])

  const categoriesWithGroups = useMemo((): CategoryWithGroup[] => {
    if (!categories) return []
    return categories.map((c) => ({
      _id: c._id,
      name: c.name,
      groupName: c.groupId ? (groupMap.get(c.groupId) ?? "Uncategorized") : "Uncategorized",
      flow: c.stsFlowType,
      amount: 0,
    })).sort((a, b) => {
      if (a.groupName !== b.groupName) return a.groupName.localeCompare(b.groupName)
      return a.name.localeCompare(b.name)
    })
  }, [categories, groupMap])

  const grouped = useMemo(() => {
    const gs = new Map<string, CategoryWithGroup[]>()
    for (const c of categoriesWithGroups) {
      if (!gs.has(c.groupName)) gs.set(c.groupName, [])
      gs.get(c.groupName)!.push(c)
    }
    return Array.from(gs.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [categoriesWithGroups])

  const totals: Record<string, { amount: number; pct: number }> = useMemo(() => {
    const t: Record<string, number> = { fundamental: 0, flexible: 0, wealth: 0 }
    for (const c of categoriesWithGroups) {
      if (c.flow) t[c.flow] += Math.max(c.amount, 1)
    }
    const total = t.fundamental + t.flexible + t.wealth
    return {
      fundamental: { amount: t.fundamental, pct: total > 0 ? Math.round((t.fundamental / total) * 100) : 33 },
      flexible: { amount: t.flexible, pct: total > 0 ? Math.round((t.flexible / total) * 100) : 33 },
      wealth: { amount: t.wealth, pct: total > 0 ? Math.round((t.wealth / total) * 100) : 34 },
    }
  }, [categoriesWithGroups])

  async function handleToggleFlow(categoryId: string, currentFlow: string | undefined) {
    if (!convexUser) return
    const order = FLOW_TYPE_ORDER
    const idx = currentFlow ? order.indexOf(currentFlow) : -1
    const nextFlow = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : order[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (setFlowType as any)({ categoryId, stsFlowType: nextFlow || undefined })
  }

  function fmt(amount: number): string {
    return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* ── Goal links & rules ── */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold">Goal links &amp; rules</p>
              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                persistent layer
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Standing mapping between accounts, goals, and protected flows. These rules do not change when the period changes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {goalRules.map((rule) => (
                <div key={rule.name} className="bg-muted/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="size-2 rounded-full shrink-0" style={{ background: rule.color }} />
                    <span className="text-[13px] font-medium">{rule.name}</span>
                    <span className="ml-auto text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                      {rule.rule}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{rule.account}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{rule.status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Flow mapping ── */}
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-semibold mb-3">Flow mapping</p>

            {/* Proportion bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-muted mb-4">
              {FLOW_TYPE_ORDER.map((ft) => (
                <span
                  key={ft}
                  className="h-full transition-all duration-300"
                  style={{ width: `${totals[ft].pct}%`, background: FLOW_TYPE_COLORS[ft] }}
                />
              ))}
            </div>

            {/* Summary panels */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {FLOW_TYPE_ORDER.map((ft) => (
                <div key={ft} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[13px] font-semibold" style={{ color: FLOW_TYPE_COLORS[ft] }}>{FLOW_TYPE_LABELS[ft]}</p>
                  <p className="text-lg font-bold" style={{ color: FLOW_TYPE_COLORS[ft] }}>{fmt(totals[ft].amount)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{totals[ft].pct}% of mapped</p>
                </div>
              ))}
            </div>

            {/* Category rows grouped */}
            {categories === undefined ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Loading categories...</div>
            ) : categoriesWithGroups.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">No categories found. Create categories in the Categories page first.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {grouped.map(([groupName, cats]) => (
                  <div key={groupName}>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{groupName}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {cats.map((cat) => (
                        <div key={cat._id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-foreground truncate">{cat.name}</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {FLOW_TYPE_ORDER.map((ft) => (
                              <button
                                key={ft}
                                onClick={() => handleToggleFlow(cat._id, cat.flow)}
                                className={cn(
                                  "text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all",
                                  cat.flow === ft
                                    ? "border-[var(--flow-color)] bg-[var(--flow-color)]/10 text-[var(--flow-color)]"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                                style={{ "--flow-color": FLOW_TYPE_COLORS[ft] } as React.CSSProperties}
                              >
                                {FLOW_TYPE_LABELS[ft]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
              This flow mapper is the bridge between the reports and the command center.
              Changing a category here immediately changes the Money Flow Sankey, Waterfall, Safe to Spend reserves, and the category ledger.
              Categories default to Flexible. Toggle through Fundamental → Flexible → Wealth Building.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
