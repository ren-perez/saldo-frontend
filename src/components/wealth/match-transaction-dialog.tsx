"use client"

import { useState } from "react"
import { Link2, Loader2, Calendar, DollarSign } from "lucide-react"
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
import { formatCurrency, formatDate } from "./income-shared"

interface MatchablePlan {
  _id: Id<"income_plans">
  label: string
  expected_date: string
  expected_amount: number
  recurrence: string
  amountDiff: number
  dateDiff: number
}

interface TransactionInfo {
  _id: Id<"transactions">
  amount: number
  date: number
  description: string
  account?: { name: string } | null
}

export function MatchTransactionDialog({
  transaction,
  userId,
  open,
  onOpenChange,
}: {
  transaction: TransactionInfo | null
  userId: Id<"users">
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<Id<"income_plans"> | null>(null)
  const [matching, setMatching] = useState(false)

  const plans = useQuery(
    api.incomePlans.getPlansForTransaction,
    transaction && open
      ? { transactionId: transaction._id, userId }
      : "skip"
  )

  const matchPlan = useMutation(api.incomePlans.matchIncomePlan)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  async function handleMatch() {
    if (!transaction || !selectedPlanId) return
    setMatching(true)
    try {
      await matchPlan({ planId: selectedPlanId, transactionId: transaction._id })
      await runAllocations({ userId, incomePlanId: selectedPlanId })
      onOpenChange(false)
      setSelectedPlanId(null)
    } finally {
      setMatching(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Match to Income Plan</DialogTitle>
          <DialogDescription>
            {transaction
              ? `Select which income plan this transaction belongs to.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Transaction info */}
        {transaction && (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 border px-3 py-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
              <DollarSign className="size-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {transaction.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(new Date(transaction.date), "MMM d, yyyy")}</span>
                {transaction.account && (
                  <span className="text-muted-foreground/60">
                    {transaction.account.name}
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums text-emerald-600 shrink-0">
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        )}

        {/* Plan options */}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {plans === undefined && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Finding matching plans...</span>
            </div>
          )}
          {plans?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No planned income found within 30 days of this transaction.
            </p>
          )}
          {plans?.map((plan: MatchablePlan) => {
            const daysDiff = Math.round(plan.dateDiff / (1000 * 60 * 60 * 24))
            return (
              <button
                key={plan._id}
                onClick={() => setSelectedPlanId(plan._id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                  selectedPlanId === plan._id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{plan.label}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(plan.expected_date)}
                    </span>
                    {plan.recurrence !== "once" && (
                      <span className="capitalize">{plan.recurrence}</span>
                    )}
                    {daysDiff > 0 && (
                      <span className="text-muted-foreground/60">
                        {daysDiff}d apart
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(plan.expected_amount)}
                  </span>
                  {plan.amountDiff > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {formatCurrency(plan.amountDiff)} diff
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMatch}
            disabled={!selectedPlanId || matching}
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
