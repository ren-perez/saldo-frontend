"use client"

import { useState } from "react"
import {
  Clock,
  AlertTriangle,
  Settings2,
  X,
  Unlink,
  Ban,
  RotateCcw,
  Calendar,
  Loader2,
  Link2,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  CircleDashed,
  Plus,
  Trash2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import {
  IncomePlan,
  AllocationRecord,
  statusConfig,
  allocColors,
  categoryLabels,
  formatCurrency,
  formatDate,
} from "./income-shared"
import { DistributionChecklist } from "./distribution-checklist"

const statusIcons = {
  planned: Clock,
  matched: CircleDashed,
  distributed: PartyPopper,
  missed: AlertTriangle,
} as const

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBarOnly({
  allocations,
  total,
  onClick,
  isOpen,
}: {
  allocations: AllocationRecord[]
  total: number
  onClick: () => void
  isOpen: boolean
}) {
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0)
  const unallocated = Math.max(0, total - totalAllocated)

  return (
    <button
      onClick={onClick}
      className="w-full flex flex-col gap-1.5 text-left cursor-pointer group"
    >
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        {allocations.map((a, i) => (
          <div
            key={a._id}
            className="h-full transition-all"
            style={{
              width: `${(a.amount / total) * 100}%`,
              backgroundColor: allocColors[i % allocColors.length],
              opacity: a.is_forecast ? 0.5 : 1,
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatCurrency(totalAllocated)} of {formatCurrency(total)} allocated
        </span>
        <div className="flex items-center gap-1">
          {unallocated > 0 && (
            <span className="text-amber-600">
              {formatCurrency(unallocated)} unallocated
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Editable Allocation Rows (planned / forecast) ───────────────────────────

function EditableAllocationRows({
  allocations,
  userId,
  planId,
}: {
  allocations: AllocationRecord[]
  userId: Id<"users">
  planId: Id<"income_plans">
}) {
  const updateAmount = useMutation(api.allocations.updateAllocationAmount)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)
  const addRecord = useMutation(api.allocations.addAllocationRecord)
  const deleteRecord = useMutation(api.allocations.deleteAllocationRecord)

  const accounts = useQuery(api.accounts.listAccounts, { userId })
  const goals = useQuery(api.goals.getGoals, { userId })

  const availableAccounts =
    accounts?.filter(
      (acc) => !allocations.some((a) => a.accountId === acc._id)
    ) ?? []

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div className="flex flex-col gap-1.5">
        {allocations.map((a, i) => {
          const linkedGoal = goals?.find(
            (g: any) => g.linked_account?._id === a.accountId && !g.is_completed
          )
          const goalPart = linkedGoal
            ? `${(linkedGoal as any).emoji ?? ""} ${(linkedGoal as any).name}`.trim()
            : null
          const displayName = goalPart
            ? `${goalPart} · ${a.accountName}`
            : a.accountName

          return (
            <div
              key={a._id}
              className="group flex items-center gap-2.5 rounded-md bg-gray-100/70 dark:bg-zinc-800/60 px-2.5 py-2.5"
            >
              <div
                className="size-2.5 rounded-full shrink-0 ml-2"
                style={{
                  backgroundColor: allocColors[i % allocColors.length],
                  opacity: 0.5,
                }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground truncate block">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {categoryLabels[a.category] ?? a.category}
                </span>
              </div>
              <Input
                type="number"
                className="w-24 h-7 text-xs text-right tabular-nums"
                defaultValue={a.amount}
                min={0}
                step={50}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val !== a.amount) {
                    updateAmount({ recordId: a._id, amount: val })
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                title="Remove allocation"
                onClick={() => deleteRecord({ recordId: a._id })}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-2.5" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {availableAccounts.length === 0 ? (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                All accounts already added
              </DropdownMenuItem>
            ) : (
              availableAccounts.map((acc) => {
                const linkedGoal = goals?.find(
                  (g: any) => g.linked_account?._id === acc._id && !g.is_completed
                )
                return (
                  <DropdownMenuItem
                    key={acc._id}
                    className="text-xs gap-2"
                    onClick={() =>
                      addRecord({
                        incomePlanId: planId,
                        accountId: acc._id as Id<"accounts">,
                        amount: 0,
                        category: "savings",
                      })
                    }
                  >
                    {linkedGoal ? (
                      <span className="flex flex-col gap-0">
                        <span>
                          {(linkedGoal as any).emoji ?? "🎯"}{" "}
                          {(linkedGoal as any).name}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {acc.name}
                        </span>
                      </span>
                    ) : (
                      acc.name
                    )}
                  </DropdownMenuItem>
                )
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1"
          onClick={() => runAllocations({ userId, incomePlanId: planId })}
        >
          <RotateCcw className="size-2.5" />
          Reset to rules
        </Button>
      </div>
    </div>
  )
}

// ─── Income Plan Card ─────────────────────────────────────────────────────────

export function IncomePlanCard({
  plan,
  userId,
  onEdit,
  onMatchClick,
}: {
  plan: IncomePlan
  userId: Id<"users">
  onEdit: (plan: IncomePlan) => void
  onMatchClick: (plan: IncomePlan) => void
}) {
  const [showAllocations, setShowAllocations] = useState(false)

  const allocations = useQuery(api.allocations.getAllocationsForPlan, {
    incomePlanId: plan._id,
  }) as AllocationRecord[] | undefined

  const checklist = useQuery(
    api.allocations.getDistributionChecklist,
    plan.status === "matched" ? { incomePlanId: plan._id } : "skip"
  )

  const isFullyDistributed =
    plan.status === "matched" && checklist?.isComplete === true
  const effectiveStatus = isFullyDistributed
    ? ("distributed" as const)
    : (plan.status as keyof typeof statusConfig)
  const config = statusConfig[effectiveStatus]
  const StatusIcon = statusIcons[effectiveStatus]

  const unmatch = useMutation(api.incomePlans.unmatchIncomePlan)
  const markMissed = useMutation(api.incomePlans.markMissed)
  const markPlanned = useMutation(api.incomePlans.markPlanned)
  const deletePlan = useMutation(api.incomePlans.deleteIncomePlan)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  const displayAmount = plan.actual_amount ?? plan.expected_amount
  const hasDiff =
    plan.actual_amount !== undefined &&
    plan.actual_amount !== plan.expected_amount
  const isMatched = plan.status === "matched"
  const isPlanned = plan.status === "planned"

  return (
    <Card className={cn("border transition-colors", config.rowClass)}>
      <CardContent className="p-0">
        {/* ── Main row ── */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
              config.dotClass,
              isFullyDistributed && "animate-check-bounce"
            )}
          >
            <StatusIcon className="size-3.5" />
          </div>

          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">
                {plan.label}
              </span>
              <Badge className={cn("text-[10px] shrink-0 border", config.badgeClass)}>
                {isFullyDistributed ? "Distributed" : config.label}
              </Badge>
              {plan.recurrence !== "once" && (
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                  {plan.recurrence}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDate(plan.expected_date)}
              </span>
              {plan.date_received && plan.date_received !== plan.expected_date && (
                <span className="text-emerald-600">
                  Received {formatDate(plan.date_received)}
                </span>
              )}
              {hasDiff && (
                <span
                  className={
                    plan.actual_amount! > plan.expected_amount
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }
                >
                  {plan.actual_amount! > plan.expected_amount ? "+" : ""}
                  {formatCurrency(plan.actual_amount! - plan.expected_amount)} vs expected
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(displayAmount)}
              </div>
              {hasDiff && (
                <div className="text-[10px] text-muted-foreground tabular-nums line-through">
                  {formatCurrency(plan.expected_amount)}
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                  <span className="sr-only">Actions</span>
                  <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="14" r="1.5" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {plan.status === "planned" && (
                  <>
                    <DropdownMenuItem onClick={() => onMatchClick(plan)} className="gap-2">
                      <Link2 className="size-3.5" />
                      Match to transaction
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(plan)} className="gap-2">
                      <Settings2 className="size-3.5" />
                      Edit plan
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => markMissed({ planId: plan._id })}
                      className="gap-2 text-destructive"
                    >
                      <Ban className="size-3.5" />
                      Mark as missed
                    </DropdownMenuItem>
                  </>
                )}
                {plan.status === "matched" && (
                  <>
                    <DropdownMenuItem
                      onClick={async () => {
                        await unmatch({ planId: plan._id })
                        await runAllocations({ userId, incomePlanId: plan._id })
                      }}
                      className="gap-2"
                    >
                      <Unlink className="size-3.5" />
                      Unmatch transaction
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(plan)} className="gap-2">
                      <Settings2 className="size-3.5" />
                      Edit plan
                    </DropdownMenuItem>
                  </>
                )}
                {plan.status === "missed" && (
                  <DropdownMenuItem
                    onClick={() => markPlanned({ planId: plan._id })}
                    className="gap-2"
                  >
                    <RotateCcw className="size-3.5" />
                    Mark as planned
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => deletePlan({ planId: plan._id })}
                  className="gap-2 text-destructive"
                >
                  <X className="size-3.5" />
                  Delete plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Progress bar ── */}
        {allocations && allocations.length > 0 && (
          <div className="border-t border-border px-4 pt-6 pb-6">
            <ProgressBarOnly
              allocations={allocations}
              total={displayAmount}
              onClick={() => setShowAllocations((s) => !s)}
              isOpen={showAllocations}
            />
          </div>
        )}

        {/* ── Allocation detail panel ── */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-in-out",
            showAllocations ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border px-4 pt-3 pb-3">
              {allocations === undefined ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Loading allocations...
                </div>
              ) : allocations.length === 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">No allocations yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs gap-1"
                    onClick={() => runAllocations({ userId, incomePlanId: plan._id })}
                  >
                    Run allocations
                  </Button>
                </div>
              ) : isPlanned ? (
                <EditableAllocationRows
                  allocations={allocations}
                  userId={userId}
                  planId={plan._id}
                />
              ) : isMatched ? (
                <DistributionChecklist incomePlanId={plan._id} userId={userId} />
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {plan.notes && (
          <div className="border-t border-border px-4 py-2 bg-muted/10">
            <p className="text-xs text-muted-foreground italic">{plan.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}