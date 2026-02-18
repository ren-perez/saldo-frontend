"use client"

import { useState } from "react"
import {
  Check,
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
  Lock,
  ChevronUp,
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
  formatCurrency,
  formatDate,
} from "./income-shared"

const statusIcons = {
  planned: Clock,
  matched: Check,
  missed: AlertTriangle,
} as const

// ─── Editable Allocation Panel ────────────────────────────────────────────────

function AllocationPanel({
  allocations,
  total,
  editable,
  userId,
  planId,
}: {
  allocations: AllocationRecord[]
  total: number
  editable: boolean
  userId: Id<"users">
  planId: Id<"income_plans">
}) {
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0)
  const unallocated = Math.max(0, total - totalAllocated)
  const updateAmount = useMutation(api.allocations.updateAllocationAmount)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  return (
    <div className="flex flex-col gap-3">
      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
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
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {formatCurrency(totalAllocated)} of {formatCurrency(total)}{" "}
            allocated
          </span>
          {unallocated > 0 && (
            <span className="text-amber-600">
              {formatCurrency(unallocated)} unallocated
            </span>
          )}
        </div>
      </div>

      {/* Allocation rows */}
      <div className="flex flex-col gap-1.5">
        {allocations.map((a, i) => (
          <div
            key={a._id}
            className="flex items-center gap-2.5 rounded-md bg-background px-2.5 py-1.5"
          >
            <div
              className="size-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: allocColors[i % allocColors.length],
                opacity: a.is_forecast ? 0.5 : 1,
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground truncate block">
                {a.accountName}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {a.category}
              </span>
            </div>
            {editable ? (
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium tabular-nums text-foreground">
                  {formatCurrency(a.amount)}
                </span>
                <Lock className="size-3 text-muted-foreground/50" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      {editable && (
        <div className="flex items-center justify-end pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] gap-1"
            onClick={async () => {
              await runAllocations({ userId, incomePlanId: planId })
            }}
          >
            <RotateCcw className="size-2.5" />
            Reset to rules
          </Button>
        </div>
      )}

      {!editable && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Lock className="size-2.5" />
          Allocations are locked after matching
        </p>
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
  onMatchClick: (plan: IncomePlan) => void
}) {
  const [showAllocations, setShowAllocations] = useState(false)

  const config = statusConfig[plan.status]
  const StatusIcon = statusIcons[plan.status]

  const allocations = useQuery(
    api.allocations.getAllocationsForPlan,
    showAllocations ? { incomePlanId: plan._id } : "skip"
  ) as AllocationRecord[] | undefined

  const unmatch = useMutation(api.incomePlans.unmatchIncomePlan)
  const markMissed = useMutation(api.incomePlans.markMissed)
  const markPlanned = useMutation(api.incomePlans.markPlanned)
  const deletePlan = useMutation(api.incomePlans.deleteIncomePlan)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  const displayAmount = plan.actual_amount ?? plan.expected_amount
  const hasDiff =
    plan.actual_amount !== undefined &&
    plan.actual_amount !== plan.expected_amount
  const canEditAllocations = plan.status === "planned"

  return (
    <Card className={cn("border transition-colors", config.rowClass)}>
      <CardContent className="p-0">
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Status dot */}
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
              config.dotClass
            )}
          >
            <StatusIcon className="size-3.5" />
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">
                {plan.label}
              </span>
              <Badge
                className={cn("text-[10px] shrink-0 border", config.badgeClass)}
              >
                {config.label}
              </Badge>
              {plan.recurrence !== "once" && (
                <Badge
                  variant="outline"
                  className="text-[10px] capitalize shrink-0"
                >
                  {plan.recurrence}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDate(plan.expected_date)}
              </span>
              {plan.date_received &&
                plan.date_received !== plan.expected_date && (
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
                  {formatCurrency(plan.actual_amount! - plan.expected_amount)} vs
                  expected
                </span>
              )}
            </div>
          </div>

          {/* Amount + actions */}
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

            {/* Toggle allocations */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-7 text-muted-foreground",
                showAllocations && "text-primary bg-primary/10"
              )}
              onClick={() => setShowAllocations((s) => !s)}
              title={showAllocations ? "Hide allocations" : "View allocations"}
            >
              {showAllocations ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <Settings2 className="size-3.5" />
              )}
            </Button>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                >
                  <span className="sr-only">Actions</span>
                  <svg
                    className="size-3.5"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <circle cx="8" cy="2" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="14" r="1.5" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {plan.status === "planned" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onMatchClick(plan)}
                      className="gap-2"
                    >
                      <Link2 className="size-3.5" />
                      Match to transaction
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEdit(plan)}
                      className="gap-2"
                    >
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
                        await runAllocations({
                          userId,
                          incomePlanId: plan._id,
                        })
                      }}
                      className="gap-2"
                    >
                      <Unlink className="size-3.5" />
                      Unmatch transaction
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEdit(plan)}
                      className="gap-2"
                    >
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

        {/* Allocations panel */}
        {showAllocations && (
          <div className="border-t border-border px-4 py-3 bg-muted/20">
            {allocations === undefined ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Loading allocations...
              </div>
            ) : allocations.length === 0 ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  No allocation rules applied.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs gap-1"
                  onClick={async () => {
                    await runAllocations({
                      userId,
                      incomePlanId: plan._id,
                    })
                  }}
                >
                  Run allocations
                </Button>
              </div>
            ) : (
              <AllocationPanel
                allocations={allocations}
                total={displayAmount}
                editable={canEditAllocations}
                userId={userId}
                planId={plan._id}
              />
            )}
          </div>
        )}

        {/* Notes */}
        {plan.notes && (
          <div className="border-t border-border px-4 py-2 bg-muted/10">
            <p className="text-xs text-muted-foreground italic">{plan.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
