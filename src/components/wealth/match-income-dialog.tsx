"use client"

import { useState } from "react"
import { Link2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { IncomePlan, formatCurrency, formatDate } from "./income-shared"

interface SuggestedMatch {
  _id: Id<"transactions">
  amount: number
  date: number
  description: string
  amountDiff: number
  dateDiff: number
  alreadyMatched: boolean
}

export function MatchIncomeDialog({
  plan,
  userId,
  open,
  onOpenChange,
}: {
  plan: IncomePlan | null
  userId: Id<"users">
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [selectedTxId, setSelectedTxId] = useState<Id<"transactions"> | null>(
    null
  )
  const [matching, setMatching] = useState(false)

  const suggestions = useQuery(
    api.incomePlans.getSuggestedMatches,
    plan && open ? { planId: plan._id, userId } : "skip"
  )

  const matchPlan = useMutation(api.incomePlans.matchIncomePlan)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  async function handleMatch() {
    if (!plan || !selectedTxId) return
    setMatching(true)
    try {
      await matchPlan({ planId: plan._id, transactionId: selectedTxId })
      await runAllocations({ userId, incomePlanId: plan._id })
      onOpenChange(false)
      setSelectedTxId(null)
    } finally {
      setMatching(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Match Income</DialogTitle>
          <DialogDescription>
            {plan
              ? `Link a real transaction to "${plan.label}" (expected ${formatCurrency(plan.expected_amount)} on ${formatDate(plan.expected_date)})`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
          {suggestions === undefined && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Finding matches...</span>
            </div>
          )}
          {suggestions?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No income transactions found within 7 days of the expected date.
            </p>
          )}
          {suggestions?.map((tx: SuggestedMatch) => (
            <button
              key={tx._id}
              onClick={() => setSelectedTxId(tx._id)}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                selectedTxId === tx._id
                  ? "border-primary bg-primary/5"
                  : tx.alreadyMatched
                    ? "border-border opacity-50"
                    : "border-border"
              )}
              disabled={tx.alreadyMatched}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium truncate max-w-[260px]">
                  {tx.description}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(tx.date), "MMM d, yyyy")}
                  {tx.alreadyMatched && (
                    <span className="ml-2 text-warning">Already matched</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                <span className="text-sm font-semibold tabular-nums text-emerald-600">
                  {formatCurrency(tx.amount)}
                </span>
                {tx.amountDiff > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatCurrency(tx.amountDiff)} diff
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMatch}
            disabled={!selectedTxId || matching}
            className="gap-1.5"
          >
            {matching && <Loader2 className="size-3.5 animate-spin" />}
            <Link2 className="size-3.5" />
            Match & Run Allocations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
