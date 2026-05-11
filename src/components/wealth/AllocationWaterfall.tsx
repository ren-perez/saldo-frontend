"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { formatCurrency } from "./income-shared"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, RotateCcw, Loader2, ArrowRight } from "lucide-react"
import { Goal } from "@/types/goals"

// ─── Section config aligned with dashboard flow colors ────────────────────────

type FlowSection = "fundamental" | "discretionary" | "goals"

const SECTION_CONFIG: Record<FlowSection, { label: string; color: string; categories: string[] }> = {
  fundamental:   { label: "Fundamental",   color: "#534ab7", categories: ["savings", "debt"] },
  discretionary: { label: "Discretionary", color: "#d85a30", categories: ["spending"] },
  goals:         { label: "Goals",         color: "#1d9e75", categories: ["investing"] },
}

function categoryToSection(category: string): FlowSection {
  if (category === "savings" || category === "debt") return "fundamental"
  if (category === "spending") return "discretionary"
  return "goals"
}

// Real amount coloring:
// - spending: over budget → amber, within → emerald
// - savings/investing/debt: reached target → emerald, in progress → muted
function realAmountClass(realAmount: number, planned: number, category: string): string {
  const isSpending = category === "spending"
  if (isSpending) {
    return realAmount > planned ? "text-amber-500 font-medium" : "text-emerald-600"
  }
  return realAmount >= planned ? "text-emerald-600" : "text-muted-foreground"
}

type AllocWithReal = {
  _id: Id<"allocation_records">
  accountId: Id<"accounts">
  accountName: string
  goalName: string | null
  goalEmoji: string | null
  label: string | null
  category: string
  amount: number
  realAmount: number
  is_forecast: boolean
}

// ─── Main waterfall component ─────────────────────────────────────────────────

export function AllocationWaterfall({
  incomePlanId,
  userId,
  isPlanned,
}: {
  incomePlanId: Id<"income_plans">
  userId: Id<"users">
  isPlanned: boolean
}) {
  const records = useQuery(api.allocations.getAllocationsWithReal, { incomePlanId }) as AllocWithReal[] | undefined
  const accounts = useQuery(api.accounts.listAccounts, { userId })
  const goals = useQuery(api.goals.getGoals, { userId }) as Goal[] | undefined

  const updateAmount = useMutation(api.allocations.updateAllocationAmount)
  const addRecord = useMutation(api.allocations.addAllocationRecord)
  const deleteRecord = useMutation(api.allocations.deleteAllocationRecord)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  if (records === undefined) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="size-3 animate-spin" />
        Loading...
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-between text-xs text-muted-foreground py-2">
        <span>No allocations configured.</span>
        {isPlanned && (
          <Button size="sm" variant="outline" className="h-6 text-xs gap-1"
            onClick={() => runAllocations({ userId, incomePlanId })}>
            Run allocations
          </Button>
        )}
      </div>
    )
  }

  const totalPlanned = records.reduce((s, r) => s + r.amount, 0)
  const totalReal = records.reduce((s, r) => s + r.realAmount, 0)
  const remaining = Math.round((totalPlanned - totalReal) * 100) / 100

  const sections = (["fundamental", "discretionary", "goals"] as FlowSection[])
    .map((key) => ({ key, rows: records.filter((r) => categoryToSection(r.category) === key) }))
    .filter((s) => s.rows.length > 0)

  const availableAccounts = accounts?.filter((acc) => !records.some((r) => r.accountId === acc._id)) ?? []

  return (
    <div className="flex flex-col gap-0">
      {/* Column headers */}
      <div className="flex items-center justify-end gap-0 mb-2">
        <span className="w-24 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 pr-1">
          Planned
        </span>
        <span className="w-24 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Real
        </span>
      </div>

      {/* Sections */}
      {sections.map(({ key, rows }, sIdx) => (
        <div key={key} className={cn(sIdx > 0 && "mt-3")}>
          {/* Section header row */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: SECTION_CONFIG[key].color }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">
              {SECTION_CONFIG[key].label}
            </span>
          </div>

          {/* Allocation rows */}
          {rows.map((record) => {
            const displayName = record.label ?? record.accountName
            const isGoal = !!record.goalName
            const rClass = realAmountClass(record.realAmount, record.amount, record.category)

            return (
              <div
                key={record._id}
                className="group flex items-start gap-2 py-1.5 pl-3.5 rounded-sm hover:bg-muted/30 transition-colors"
              >
                {/* Name + optional goal link */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground leading-none block truncate">{displayName}</span>
                  {isGoal && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                      <ArrowRight className="size-2.5 shrink-0" />
                      {record.accountName}
                    </span>
                  )}
                </div>

                {/* Planned amount */}
                <div className="w-24 text-right shrink-0">
                  {isPlanned ? (
                    <Input
                      type="number"
                      className="h-6 text-xs text-right tabular-nums w-full"
                      defaultValue={record.amount}
                      min={0}
                      step={50}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val) && val !== record.amount) {
                          updateAmount({ recordId: record._id, amount: val })
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(record.amount)}
                    </span>
                  )}
                </div>

                {/* Real amount */}
                <div className="w-24 text-right shrink-0 flex items-center justify-end gap-1">
                  <span className={cn("text-xs tabular-nums font-medium", rClass)}>
                    {formatCurrency(record.realAmount)}
                  </span>
                  {isPlanned && (
                    <button
                      onClick={() => deleteRecord({ recordId: record._id })}
                      className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground/40 hover:text-destructive transition-opacity ml-1 leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* Total row */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border">
        <span className="flex-1 text-xs font-semibold text-foreground">Total</span>
        <span className="w-24 text-right text-xs tabular-nums font-semibold text-muted-foreground">
          {formatCurrency(totalPlanned)}
        </span>
        <div className="w-24 text-right flex items-center justify-end gap-1.5">
          <span className={cn(
            "text-xs tabular-nums font-semibold",
            remaining >= 0 ? "text-emerald-600" : "text-amber-500"
          )}>
            {formatCurrency(totalReal)}
          </span>
          <span className={cn(
            "text-[10px] tabular-nums",
            remaining >= 0 ? "text-muted-foreground/60" : "text-amber-500"
          )}>
            {remaining >= 0
              ? `${formatCurrency(remaining)} left`
              : `${formatCurrency(Math.abs(remaining))} over`}
          </span>
        </div>
      </div>

      {/* Add + reset controls (planned plans only) */}
      {isPlanned && (
        <div className="flex items-center justify-between pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"
                className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground">
                <Plus className="size-3" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {availableAccounts.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  All accounts already added
                </DropdownMenuItem>
              ) : (
                availableAccounts.map((acc) => {
                  const linkedGoal = goals?.find(
                    (g) => g.linked_account?._id === acc._id && !g.is_completed
                  )
                  return (
                    <DropdownMenuItem
                      key={acc._id}
                      className="text-xs gap-2"
                      onClick={() => addRecord({
                        incomePlanId,
                        accountId: acc._id as Id<"accounts">,
                        amount: 0,
                        category: "savings",
                      })}
                    >
                      {linkedGoal ? (
                        <span className="flex flex-col gap-0">
                          <span>{linkedGoal.emoji ?? "🎯"} {linkedGoal.name}</span>
                          <span className="text-muted-foreground text-[10px]">{acc.name}</span>
                        </span>
                      ) : acc.name}
                    </DropdownMenuItem>
                  )
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1"
            onClick={() => runAllocations({ userId, incomePlanId })}>
            <RotateCcw className="size-3" />
            Reset to default
          </Button>
        </div>
      )}
    </div>
  )
}
