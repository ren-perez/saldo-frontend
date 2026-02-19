"use client"

import { useState, useMemo } from "react"
import {
  Check,
  Clock,
  AlertTriangle,
  Plus,
  DollarSign,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { IncomePlan, formatCurrency } from "./income-shared"
import { IncomePlanCard } from "./income-plan-card"
import { IncomeFormDialog } from "./income-form-dialog"
import { MatchIncomeDialog } from "./match-income-dialog"

// ─── Month Summary ────────────────────────────────────────────────────────────

function MonthSummary({ plans }: { plans: IncomePlan[] }) {
  const matched = plans.filter((p) => p.status === "matched")
  const missed = plans.filter((p) => p.status === "missed")
  const planned = plans.filter((p) => p.status === "planned")

  const totalReceived = matched.reduce(
    (s, p) => s + (p.actual_amount ?? p.expected_amount),
    0
  )

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {matched.length > 0 && (
        <span className="flex items-center gap-1 text-emerald-600">
          <Check className="size-3" />
          {formatCurrency(totalReceived)} received
        </span>
      )}
      {planned.length > 0 && (
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {planned.length} pending
        </span>
      )}
      {missed.length > 0 && (
        <span className="flex items-center gap-1 text-destructive">
          <AlertTriangle className="size-3" />
          {missed.length} missed
        </span>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IncomeTimeline() {
  const { convexUser } = useConvexUser()
  const userId = convexUser?._id

  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<IncomePlan | null>(null)

  // Plan → Transaction match (from plan card dropdown)
  const [matchingPlan, setMatchingPlan] = useState<IncomePlan | null>(null)
  const [planMatchOpen, setPlanMatchOpen] = useState(false)

  const plans = useQuery(
    api.incomePlans.listIncomePlans,
    userId ? { userId } : "skip"
  ) as IncomePlan[] | undefined

  // Group by month, newest first
  const grouped = useMemo(() => {
    if (!plans) return []
    const groups = new Map<string, IncomePlan[]>()
    const sorted = [...plans].sort((a, b) =>
      b.expected_date.localeCompare(a.expected_date)
    )
    sorted.forEach((p) => {
      const key = p.expected_date.slice(0, 7)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    })
    return Array.from(groups.entries()).map(([key, items]) => {
      const [year, month] = key.split("-")
      const label = new Date(
        parseInt(year),
        parseInt(month) - 1,
        1
      ).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
      const totalExpected = items.reduce((s, p) => s + p.expected_amount, 0)
      return { key, label, totalExpected, items }
    })
  }, [plans])

  function handleEdit(plan: IncomePlan) {
    setEditingPlan(plan)
    setFormOpen(true)
  }

  // Plan card → "Match to transaction"
  function handleMatchClick(plan: IncomePlan) {
    setMatchingPlan(plan)
    setPlanMatchOpen(true)
  }

  if (!userId) return null

  return (
    <div className="flex flex-col gap-8">
      {/* ── Income Plans Timeline ── */}
      <div className="flex flex-col gap-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Income Plans
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your planned and tracked income by month
            </p>
          </div>
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => {
              setEditingPlan(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-3.5" />
            Add Income
          </Button>
        </div>

        {/* Loading */}
        {plans === undefined && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" />
            <span>Loading income plans...</span>
          </div>
        )}

        {/* Empty state */}
        {plans?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No income planned</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add your first income to start tracking and allocating.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingPlan(null)
                  setFormOpen(true)
                }}
                className="gap-1.5 mt-1"
              >
                <Plus className="size-3.5" />
                Add Income
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Month groups */}
        <div className="flex flex-col gap-6">
          {grouped.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              {/* Month header */}
              <div className="flex items-center gap-3 py-1 sticky top-0 bg-background z-10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                  {group.label}
                </h3>
                <div className="flex-1 h-px bg-border" />
                <div className="flex items-center gap-3 shrink-0">
                  <MonthSummary plans={group.items} />
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    {formatCurrency(group.totalExpected)}
                  </span>
                </div>
              </div>

              {/* Plan cards */}
              <div className="flex flex-col gap-2">
                {group.items.map((plan) => (
                  <IncomePlanCard
                    key={plan._id}
                    plan={plan}
                    userId={userId}
                    onEdit={handleEdit}
                    onMatchClick={handleMatchClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modals ── */}
      <IncomeFormDialog
        plan={editingPlan}
        userId={userId}
        open={formOpen}
        onOpenChange={(v: boolean) => {
          setFormOpen(v)
          if (!v) setEditingPlan(null)
        }}
      />

      {/* Plan → Transaction match (from plan card) */}
      <MatchIncomeDialog
        plan={matchingPlan}
        userId={userId}
        open={planMatchOpen}
        onOpenChange={(v: boolean) => {
          setPlanMatchOpen(v)
          if (!v) setMatchingPlan(null)
        }}
      />

    </div>
  )
}
