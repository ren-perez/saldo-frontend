"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Search, SlidersHorizontal, X } from "lucide-react"

// ── Flow type metadata ──────────────────────────────────────────────────────

type FlowType = "fundamental" | "flexible" | "wealth"

const FLOWS: Record<FlowType, { label: string; short: string; color: string; description: string }> = {
  fundamental: {
    label: "Fundamental",
    short: "Core",
    color: "#534ab7",
    description: "Essential, recurring needs",
  },
  flexible: {
    label: "Flexible",
    short: "Flex",
    color: "#d85a30",
    description: "Discretionary spending",
  },
  wealth: {
    label: "Wealth",
    short: "Wealth",
    color: "#1d9e75",
    description: "Investments & savings",
  },
}

const FLOW_ORDER: FlowType[] = ["fundamental", "flexible", "wealth"]

// ── Types ───────────────────────────────────────────────────────────────────

interface CategoryRow {
  _id: string
  name: string
  groupName: string
  flow: FlowType | undefined
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FlowPill({
  type,
  active,
  onClick,
}: {
  type: FlowType
  active: boolean
  onClick: () => void
}) {
  const meta = FLOWS[type]
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 select-none",
        active
          ? "text-white shadow-sm"
          : "text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50"
      )}
      style={active ? { backgroundColor: meta.color } : undefined}
      title={meta.label}
    >
      {meta.short}
    </button>
  )
}

function CategoryItem({
  cat,
  onSetFlow,
}: {
  cat: CategoryRow
  onSetFlow: (id: string, flow: FlowType | undefined) => void
}) {
  const activeColor = cat.flow ? FLOWS[cat.flow].color : undefined

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        cat.flow ? "hover:bg-muted/20" : "hover:bg-muted/30"
      )}
    >
      {/* Flow accent dot */}
      <span
        className="size-1.5 rounded-full shrink-0 transition-colors duration-200"
        style={{ backgroundColor: activeColor ?? "hsl(var(--muted-foreground) / 0.25)" }}
      />

      {/* Name + group */}
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-medium text-foreground truncate block leading-tight">
          {cat.name}
        </span>
      </div>

      {/* Flow selectors */}
      <div className="flex items-center gap-0.5 shrink-0">
        {FLOW_ORDER.map((ft) => (
          <FlowPill
            key={ft}
            type={ft}
            active={cat.flow === ft}
            onClick={() => onSetFlow(cat._id, cat.flow === ft ? undefined : ft)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main dialog ────────────────────────────────────────────────────────────

export function ConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { convexUser } = useConvexUser()
  const [search, setSearch] = useState("")

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

  const rows = useMemo((): CategoryRow[] => {
    if (!categories) return []
    return categories
      .map((c) => ({
        _id: c._id,
        name: c.name,
        groupName: c.groupId ? (groupMap.get(c.groupId) ?? "Uncategorized") : "Uncategorized",
        flow: c.stsFlowType as FlowType | undefined,
      }))
      .sort((a, b) => {
        if (a.groupName !== b.groupName) return a.groupName.localeCompare(b.groupName)
        return a.name.localeCompare(b.name)
      })
  }, [categories, groupMap])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.groupName.toLowerCase().includes(q))
  }, [rows, search])

  const grouped = useMemo(() => {
    const gs = new Map<string, CategoryRow[]>()
    for (const c of filtered) {
      if (!gs.has(c.groupName)) gs.set(c.groupName, [])
      gs.get(c.groupName)!.push(c)
    }
    return Array.from(gs.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Per-flow counts and totals for the distribution bar
  const stats = useMemo(() => {
    const counts: Record<FlowType, number> = { fundamental: 0, flexible: 0, wealth: 0 }
    let unclassified = 0
    for (const r of rows) {
      if (r.flow) counts[r.flow]++
      else unclassified++
    }
    const classified = counts.fundamental + counts.flexible + counts.wealth
    const total = classified + unclassified
    return { counts, unclassified, classified, total }
  }, [rows])

  async function handleSetFlow(categoryId: string, flow: FlowType | undefined) {
    if (!convexUser) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (setFlowType as any)({ categoryId, stsFlowType: flow ?? null })
  }

  const isLoading = categories === undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[15px] font-semibold leading-tight">
                Flow Classification
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                Classify your spending categories into behavioral flows. Changes update the Sankey chart and Waterfall instantly.
              </DialogDescription>
            </div>
          </div>

          {/* Distribution bar */}
          {!isLoading && stats.total > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/50 gap-px">
                {FLOW_ORDER.map((ft) => {
                  const pct = (stats.counts[ft] / stats.total) * 100
                  if (pct < 0.5) return null
                  return (
                    <div
                      key={ft}
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: FLOWS[ft].color }}
                    />
                  )
                })}
                {stats.unclassified > 0 && (
                  <div
                    className="h-full flex-1 rounded-full bg-border/60"
                    title={`${stats.unclassified} unclassified`}
                  />
                )}
              </div>
              <div className="flex items-center gap-4">
                {FLOW_ORDER.map((ft) => (
                  <div key={ft} className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: FLOWS[ft].color }} />
                    <span className="text-[11px] text-muted-foreground">
                      {FLOWS[ft].label}
                      <span className="ml-1 font-medium text-foreground">{stats.counts[ft]}</span>
                    </span>
                  </div>
                ))}
                {stats.unclassified > 0 && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="size-1.5 rounded-full shrink-0 bg-muted-foreground/30" />
                    <span className="text-[11px] text-muted-foreground">
                      Unclassified
                      <span className="ml-1 font-medium text-amber-500">{stats.unclassified}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Search ── */}
        <div className="px-6 py-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search categories or groups…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-[12px] bg-muted/40 border border-transparent focus:border-border focus:bg-background rounded-md outline-none transition-colors placeholder:text-muted-foreground/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Flow type legend ── */}
        <div className="px-6 py-2.5 flex items-center gap-1 border-b border-border/30 bg-muted/10">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mr-auto">Category</span>
          {FLOW_ORDER.map((ft) => (
            <div key={ft} className="flex items-center gap-1 px-2.5 min-w-[56px] justify-center">
              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: FLOWS[ft].color }} />
              <span className="text-[10px] font-medium text-muted-foreground/70">{FLOWS[ft].short}</span>
            </div>
          ))}
        </div>

        {/* ── Category list ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-1 px-4 py-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-muted/30 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="size-10 rounded-full bg-muted/40 flex items-center justify-center mb-3">
                <SlidersHorizontal className="size-4 text-muted-foreground/50" />
              </div>
              <p className="text-[13px] font-medium text-foreground mb-1">No categories yet</p>
              <p className="text-[11px] text-muted-foreground/70 max-w-[240px] leading-relaxed">
                Create categories in the Transactions page to start classifying your spending flows.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="text-[13px] text-muted-foreground">No results for &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="px-3 py-2">
              {grouped.map(([groupName, cats]) => (
                <div key={groupName} className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {groupName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">{cats.length}</span>
                  </div>
                  <div className="flex flex-col">
                    {cats.map((cat) => (
                      <CategoryItem key={cat._id} cat={cat} onSetFlow={handleSetFlow} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/10 flex items-center gap-3">
          <p className="text-[11px] text-muted-foreground/60 flex-1 leading-relaxed">
            Fundamentals are essential costs, Flexible is discretionary, Wealth captures goal contributions.
            Categories default to Flexible if unclassified.
          </p>
          <button
            onClick={() => onOpenChange(false)}
            className="px-3.5 py-1.5 rounded-md bg-foreground text-background text-[12px] font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
