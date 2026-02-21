"use client"

import { useState } from "react"
import {
  Check,
  Circle,
  Link2,
  Loader2,
  X,
  PartyPopper,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import {
  formatCurrency,
  allocColors,
  categoryLabels,
} from "./income-shared"
import { Goal } from "@/types/goals"
import { AllocationMatchDialog } from "./allocation-match-dialog"
import { Separator } from "../ui/separator"

interface DistributionChecklistProps {
  incomePlanId: Id<"income_plans">
  userId: Id<"users">
}

// ─── Inline editable amount ───────────────────────────────────────────────────

function EditableAmount({
  value,
  onCommit,
  strikethrough,
}: {
  value: number
  onCommit: (v: number) => void
  strikethrough?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed) && parsed !== value) onCommit(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        type="number"
        className="w-24 h-6 text-xs text-right tabular-nums px-1"
        value={draft}
        min={0}
        step={50}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value))
        setEditing(true)
      }}
      className={cn(
        "text-xs font-medium tabular-nums transition-colors hover:text-primary hover:underline",
        strikethrough ? "text-muted-foreground line-through" : "text-foreground"
      )}
      title="Click to edit"
    >
      {formatCurrency(value)}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DistributionChecklist({
  incomePlanId,
  userId,
}: DistributionChecklistProps) {
  const checklist = useQuery(api.allocations.getDistributionChecklist, {
    incomePlanId,
  })
  const accounts = useQuery(api.accounts.listAccounts, { userId })
  const goals = useQuery(api.goals.getGoals, { userId }) as Goal[] | undefined

  const unmatchTx = useMutation(api.allocations.unmatchAllocationTransaction)
  const addRecord = useMutation(api.allocations.addAllocationRecord)
  const deleteRecord = useMutation(api.allocations.deleteAllocationRecord)
  const updateAmount = useMutation(api.allocations.updateAllocationAmount)
  const markComplete = useMutation(api.allocations.markAllocationComplete)
  const unmarkComplete = useMutation(api.allocations.unmarkAllocationComplete)

  const [matchingItemId, setMatchingItemId] = useState<Id<"allocation_records"> | null>(null)
  const [matchingItemInfo, setMatchingItemInfo] = useState<{
    accountName: string
    category: string
    amount: number
    remainingAmount: number
  } | undefined>()

  if (!checklist) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="size-3 animate-spin" />
        Loading distribution...
      </div>
    )
  }

  const availableAccounts =
    accounts?.filter(
      (acc) => !checklist.items.some((item) => item.accountId === acc._id)
    ) ?? []

  return (
    <div className="flex flex-col gap-3 mt-3">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          {checklist.completedCount}/{checklist.totalItems} distributed
        </span>
        <div className="flex items-center gap-2">
          {checklist.unallocated > 0 && (
            <span className="text-[11px] text-amber-600 tabular-nums">
              {formatCurrency(checklist.unallocated)} extra
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] gap-0.5 text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
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
                      className="gap-2 text-xs"
                      onClick={() =>
                        addRecord({
                          incomePlanId,
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
        </div>
      </div>

      {/* ── Completion banner ── */}
      {checklist.isComplete && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <PartyPopper className="size-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Income fully distributed!
          </span>
        </div>
      )}

      {/* ── Allocation rows ── */}
      <div className="flex flex-col gap-1">
        {checklist.items.map((item, i) => {
          const isComplete = item.status === "complete"
          const isPartial = item.status === "partial"

          const goalPart = item.goalName
            ? `${item.goalEmoji ?? ""} ${item.goalName}`.trim()
            : null
          const displayName = goalPart
            ? `${goalPart} · ${item.accountName}`
            : item.accountName

          return (
            <div
              key={item._id}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-2.5 transition-all",
                isComplete
                  ? "bg-emerald-500/[0.04]"
                  : "bg-gray-100/70 dark:bg-zinc-800/60 hover:bg-muted/50"
              )}
            >
              {/* Toggle complete */}
              <button
                className="shrink-0 size-4 ml-2"
                title={isComplete ? "Mark pending" : "Mark complete"}
                onClick={() =>
                  isComplete
                    ? unmarkComplete({ allocationRecordId: item._id })
                    : markComplete({ allocationRecordId: item._id })
                }
              >
                {isComplete ? (
                  <div className="size-4 rounded-full bg-emerald-500 flex items-center justify-center animate-check-bounce">
                    <Check className="size-2.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <Circle
                    className={cn(
                      "size-4 transition-colors",
                      isPartial
                        ? "text-amber-500"
                        : "text-muted-foreground/30 group-hover:text-muted-foreground/50"
                    )}
                  />
                )}
              </button>

              {/* Color dot */}
              <div
                className="size-2 rounded-full shrink-0 ml-2"
                style={{ backgroundColor: allocColors[i % allocColors.length] }}
              />

              {/* Name */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-xs font-medium truncate block",
                    isComplete ? "text-muted-foreground line-through" : "text-foreground"
                  )}
                >
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {categoryLabels[item.category] ?? item.category}
                </span>
              </div>

              {/* Amounts + actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isPartial && (
                  <span className="text-xs text-amber-600 tabular-nums">
                    {formatCurrency(item.matchedAmount)}&nbsp;/
                  </span>
                )}

                <EditableAmount
                  value={item.amount}
                  onCommit={(v) =>
                    updateAmount({ recordId: item._id, amount: v })
                  }
                  strikethrough={isComplete}
                />

                {/* Match to transaction */}
                {!isComplete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Match to transaction"
                    onClick={() => {
                      setMatchingItemId(item._id)
                      setMatchingItemInfo({
                        accountName: displayName,
                        category: item.category,
                        amount: item.amount,
                        remainingAmount: item.remainingAmount,
                      })
                    }}
                  >
                    <Link2 className="size-3" />
                  </Button>
                )}

                {/* Delete row */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  title="Remove allocation"
                  onClick={() => deleteRecord({ recordId: item._id })}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Matched transactions ── */}
      {checklist.items.some((item) => item.matches.length > 0) && (
        <>
          <Separator className="mt-1" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground font-medium mb-1">
              Matched transactions
            </span>
            {checklist.items.flatMap((item) =>
              item.matches.map((m) => (
                <div
                  key={m._id}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-2.5 py-0.5 group/match"
                >
                  <Link2 className="size-2.5 shrink-0 text-emerald-500" />
                  <span className="truncate flex-1">
                    {m.transaction?.description ?? "Transaction"}
                  </span>
                  <span className="tabular-nums shrink-0 text-emerald-600">
                    {formatCurrency(m.amount)}
                  </span>
                  <button
                    onClick={() => unmatchTx({ matchId: m._id })}
                    className="shrink-0 opacity-0 group-hover/match:opacity-100 hover:text-destructive transition-all"
                    title="Remove match"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Match dialog ── */}
      <AllocationMatchDialog
        allocationRecordId={matchingItemId}
        allocationInfo={matchingItemInfo}
        userId={userId}
        open={matchingItemId !== null}
        onOpenChange={(v) => {
          if (!v) {
            setMatchingItemId(null)
            setMatchingItemInfo(undefined)
          }
        }}
      />
    </div>
  )
}