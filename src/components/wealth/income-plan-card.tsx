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
  ShieldCheck,
  Check,
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
import { Goal } from "@/types/goals"

const statusIcons = {
  planned: Clock,
  matched: CircleDashed,
  completed: PartyPopper,
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
      className="w-full flex flex-col gap-2 text-left cursor-pointer group px-6 py-6"
    >
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        {allocations.map((a, i) => (
          <div
            key={a._id}
            className="h-full transition-all"
            style={{
              width: `${(a.amount / total) * 100}%`,
              backgroundColor: allocColors[i % allocColors.length],
              opacity: a.is_forecast ? 0.4 : 1,
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-1">
        {allocations.map((a, i) => (
          <div key={a._id} className="flex items-center gap-1.5" style={{ opacity: a.is_forecast ? 0.55 : 1 }}>
            <div
              className="size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: allocColors[i % allocColors.length] }}
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {a.accountName} · {formatCurrency(a.amount)}
              {/* {a.is_forecast ? " ·" : ""} */}
            </span>
            {/* {a.is_forecast && (
              <span className="text-xs text-muted-foreground/60 italic">forecast</span>
            )} */}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
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

// ─── Allocation Rows (works for planned and matched) ─────────────────────────

function AllocationRows({
  allocations,
  userId,
  planId,
  isMatched,
}: {
  allocations: AllocationRecord[]
  userId: Id<"users">
  planId: Id<"income_plans">
  isMatched: boolean
}) {
  const updateAmount = useMutation(api.allocations.updateAllocationAmount)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)
  const addRecord = useMutation(api.allocations.addAllocationRecord)
  const deleteRecord = useMutation(api.allocations.deleteAllocationRecord)

  const accounts = useQuery(api.accounts.listAccounts, { userId })
  const goals = useQuery(api.goals.getGoals, { userId }) as Goal[] | undefined

  const availableAccounts =
    accounts?.filter(
      (acc) => !allocations.some((a) => a.accountId === acc._id)
    ) ?? []

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div className="flex flex-col gap-1.5">
        {allocations.map((a, i) => {
          const linkedGoal = goals?.find(
            (g) => g.linked_account?._id === a.accountId && !g.is_completed
          )
          const goalPart = linkedGoal
            ? `${linkedGoal.emoji ?? ""} ${linkedGoal.name}`.trim()
            : null
          const displayName = goalPart
            ? `${goalPart} · ${a.accountName}`
            : a.accountName

          const verStatus = a.verification_status ?? "pending"

          return (
            <div
              key={a._id}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-2.5",
                verStatus === "verified"
                  ? "bg-emerald-500/[0.04]"
                  : "bg-gray-100/70 dark:bg-zinc-800/60"
              )}
            >
              <div
                className="size-2.5 rounded-full shrink-0 ml-2"
                style={{
                  backgroundColor: allocColors[i % allocColors.length],
                  opacity: a.is_forecast ? 0.5 : 1,
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

              {/* Verification badge (matched plans only) */}
              {isMatched && (
                <div className="shrink-0">
                  {verStatus === "verified" ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                      <ShieldCheck className="size-3" />
                      Verified
                    </span>
                  ) : verStatus === "reserved" ? (
                    <span className="text-[10px] text-sky-600">Reserved</span>
                  ) : null}
                </div>
              )}

              {/* Editable amount (planned plans only) */}
              {!isMatched ? (
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
              ) : (
                <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">
                  {formatCurrency(a.amount)}
                </span>
              )}

              {/* Delete (planned only) */}
              {!isMatched && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  title="Remove allocation"
                  onClick={() => deleteRecord({ recordId: a._id })}
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer (planned only) */}
      {!isMatched && (
        <div className="flex items-center justify-between pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3" />
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
                    (g) => g.linked_account?._id === acc._id && !g.is_completed
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
                            {linkedGoal.emoji ?? "🎯"}{" "}
                            {linkedGoal.name}
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
            variant="ghost"
            className="h-6 text-xs gap-1"
            onClick={() => runAllocations({ userId, incomePlanId: planId })}
          >
            <RotateCcw className="size-3" />
            Reset to default
          </Button>
        </div>
      )}
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
  onMatchClick: (plan: IncomePlan, preSelectedTxId?: Id<"transactions">) => void
}) {
  const [showAllocations, setShowAllocations] = useState(false)

  const suggestedMatches = useQuery(
    api.incomePlans.getSuggestedMatches,
    plan.status === "planned" ? { planId: plan._id, userId } : "skip"
  )
  const smartMatch = suggestedMatches?.find(
    (s) => !s.alreadyMatched && s.amountDiff / plan.expected_amount < 0.05
  )

  const allocations = useQuery(api.allocations.getAllocationsForPlan, {
    incomePlanId: plan._id,
  }) as AllocationRecord[] | undefined

  // Derive "completed" status: matched + all allocations verified
  const isCompleted =
    plan.status === "matched" &&
    !!allocations &&
    allocations.length > 0 &&
    allocations.every((a) => a.verification_status === "verified")

  const effectiveStatus = isCompleted
    ? ("completed" as const)
    : (plan.status as keyof typeof statusConfig)
  const config = statusConfig[effectiveStatus] ?? statusConfig.planned
  const StatusIcon = statusIcons[effectiveStatus] ?? Clock

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
    <Card className="border border-border transition-colors relative overflow-hidden">
      {config.accentColor && (
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: config.accentColor }}
        />
      )}
      <CardContent className="p-0">
        {/* ── Main row ── */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <div className="flex flex-1 flex-col gap-2 min-w-0">
            {/* Label + status icon/badge on the right */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground truncate">
                {plan.label}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    config.dotClass,
                    isCompleted && "animate-check-bounce"
                  )}
                >
                  <StatusIcon className="size-2.5" />
                </div>
                <Badge className={cn("text-[10px] shrink-0 border", config.badgeClass)}>
                  {config.label}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">

              {/* Date + recurrency grouped (different things, same row) */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {formatDate(plan.expected_date)}
                </span>
                {plan.recurrence !== "once" && (
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                    {plan.recurrence}
                  </Badge>
                )}
              </div>
            </div>

            {/* Conditional: received date & amount diff */}
            {((plan.date_received && plan.date_received !== plan.expected_date) || hasDiff) && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
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
            )}
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
                      onClick={() => {
                        if (window.confirm(`Mark "${plan.label}" as missed? This will delete its allocations.`)) {
                          markMissed({ planId: plan._id })
                        }
                      }}
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
                  onClick={() => {
                    if (window.confirm(`Permanently delete "${plan.label}"? This cannot be undone.`)) {
                      deletePlan({ planId: plan._id })
                    }
                  }}
                  className="gap-2 text-destructive"
                >
                  <X className="size-3.5" />
                  Delete plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Smart Match CTA ── */}
        {isPlanned && smartMatch && (
          <div className="border-t border-emerald-500/20 bg-emerald-500/[0.07] px-6 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 leading-snug">
                  Found {formatCurrency(smartMatch.amount)} from {smartMatch.description}
                </span>
                <span className="text-[11px] text-emerald-600/80">
                  {new Date(smartMatch.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · Is this it?
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onMatchClick(plan, smartMatch._id)}
                >
                  <Check className="size-3" />
                  Yes, match it
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onMatchClick(plan)}
                >
                  Not this one
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Progress bar ── */}
        {allocations && allocations.length > 0 && (
          <div className="border-t border-border">
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
            {/* <div className="border-t border-border px-6 pt-3 pb-3"> */}
            <div className="px-6 pb-3">
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
              ) : plan.status !== "missed" ? (
                <AllocationRows
                  allocations={allocations}
                  userId={userId}
                  planId={plan._id}
                  isMatched={isMatched}
                />
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
