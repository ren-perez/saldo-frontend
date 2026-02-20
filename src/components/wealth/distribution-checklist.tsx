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
import { AllocationMatchDialog } from "./allocation-match-dialog"
import { Separator } from "../ui/separator"

interface DistributionChecklistProps {
  incomePlanId: Id<"income_plans">
  userId: Id<"users">
}

export function DistributionChecklist({
  incomePlanId,
  userId,
}: DistributionChecklistProps) {
  const checklist = useQuery(api.allocations.getDistributionChecklist, {
    incomePlanId,
  })

  const accounts = useQuery(api.accounts.listAccounts, { userId })
  const goals = useQuery(
    api.goals.getGoals,
    { userId }
  )

  const unmatchTx = useMutation(api.allocations.unmatchAllocationTransaction)
  const addRecord = useMutation(api.allocations.addAllocationRecord)
  const deleteRecord = useMutation(api.allocations.deleteAllocationRecord)

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

  if (checklist.items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No allocation rules applied.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* Summary line */}
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
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-0.5 text-muted-foreground hover:text-foreground">
                <Plus className="size-3" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {accounts
                ?.filter((acc) => !checklist.items.some((item) => item.accountId === acc._id))
                .map((acc) => {
                  const linkedGoal = goals?.find(
                    (g: { linked_account?: { _id: string } | null; is_completed?: boolean }) =>
                      g.linked_account?._id === acc._id && !g.is_completed
                  )
                  return (
                    <DropdownMenuItem
                      key={acc._id}
                      className="gap-2 text-xs"
                      onClick={() => {
                        addRecord({
                          incomePlanId,
                          accountId: acc._id as Id<"accounts">,
                          amount: 0,
                          category: "savings",
                        })
                      }}
                    >
                      {linkedGoal ? (
                        <span>
                          {(linkedGoal as { emoji?: string }).emoji ?? "🎯"} {(linkedGoal as { name: string }).name}
                          <span className="text-muted-foreground ml-1">· {acc.name}</span>
                        </span>
                      ) : (
                        <span>{acc.name}</span>
                      )}
                    </DropdownMenuItem>
                  )
                })}
              {accounts?.filter((acc) => !checklist.items.some((item) => item.accountId === acc._id)).length === 0 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  All accounts already added
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Completion celebration */}
      {checklist.isComplete && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <PartyPopper className="size-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Income fully distributed!
          </span>
        </div>
      )}

      {/* Checklist items */}
      <div className="flex flex-col gap-1">
        {checklist.items.map((item, i) => {
          const isComplete = item.status === "complete"
          const isPartial = item.status === "partial"
          const displayName = item.goalName
            ? `${item.goalEmoji ?? ""} ${item.goalName}`.trim()
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
              {/* Animated checkbox */}
              <div className="shrink-0 relative size-4 ml-2">
                {isComplete ? (
                  <div className="size-4 rounded-full bg-emerald-500 flex items-center justify-center animate-check-bounce">
                    <Check className="size-2.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <Circle
                    className={cn(
                      "size-4 transition-colors",
                      isPartial ? "text-amber-500" : "text-muted-foreground/30"
                    )}
                  />
                )}
              </div>

              {/* Color dot */}
              <div
                className="size-2 rounded-full shrink-0 ml-2"
                style={{ backgroundColor: allocColors[i % allocColors.length] }}
              />

              {/* Name + category */}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-xs font-medium truncate block",
                  isComplete ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {displayName}
                </span>
                {!item.goalName && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {categoryLabels[item.category] ?? item.category}
                  </span>
                )}
              </div>

              {/* Amount area */}
              <div className="flex items-center gap-2 shrink-0">
                {isPartial && (
                  <span className="text-xs text-amber-600 tabular-nums">
                    {formatCurrency(item.matchedAmount)}&nbsp;/
                  </span>
                )}
                <span className={cn(
                  "text-xs font-medium tabular-nums",
                  isComplete ? "text-emerald-600" : "text-foreground"
                )}>
                  {formatCurrency(item.amount)}
                </span>

                {/* Match button - only when not complete */}
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
              </div>
            </div>
          )
        })}
      </div>

      <Separator className="mt-2 mb-1" />

      {/* Matched transactions (shown as a separate section below) */}
      {checklist.items.some((item) => item.matches.length > 0) && (
        <div className="flex flex-col gap-0.5 border-border">
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
      )}

      {/* Match dialog */}
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
