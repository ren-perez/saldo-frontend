"use client"

import { useState, useEffect } from "react"
import { Link2, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { IncomePlan, AllocationRecord, formatCurrency, formatDate } from "./income-shared"

interface SuggestedMatch {
  _id: Id<"transactions">
  amount: number
  date: number
  description: string
  amountDiff: number
  dateDiff: number
  alreadyMatched: boolean
}

interface DiffAllocation {
  recordId: Id<"allocation_records">
  accountName: string
  amount: number
}

export function MatchIncomeDialog({
  plan,
  userId,
  open,
  onOpenChange,
  preSelectedTxId,
}: {
  plan: IncomePlan | null
  userId: Id<"users">
  open: boolean
  onOpenChange: (v: boolean) => void
  preSelectedTxId?: Id<"transactions">
}) {
  const [selectedTxId, setSelectedTxId] = useState<Id<"transactions"> | null>(null)
  const [matching, setMatching] = useState(false)
  const [diffAllocations, setDiffAllocations] = useState<DiffAllocation[]>([])

  useEffect(() => {
    if (open && preSelectedTxId) {
      setSelectedTxId(preSelectedTxId)
    } else if (!open) {
      setSelectedTxId(null)
      setDiffAllocations([])
    }
  }, [open, preSelectedTxId])

  const suggestions = useQuery(
    api.incomePlans.getSuggestedMatches,
    plan && open ? { planId: plan._id, userId } : "skip"
  )

  const allocations = useQuery(
    api.allocations.getAllocationsForPlan,
    plan && open ? { incomePlanId: plan._id } : "skip"
  ) as AllocationRecord[] | undefined

  const matchPlan = useMutation(api.incomePlans.matchIncomePlan)
  const verifyAllocations = useMutation(api.allocations.verifyAllocations)

  // Selected transaction from suggestions list
  const selectedTx = suggestions?.find((tx) => tx._id === selectedTxId)
  const hasDiff = selectedTx && plan
    ? Math.abs(selectedTx.amount - plan.expected_amount) > 0.01
    : false

  // Initialise diff allocations when a mismatched tx is selected
  useEffect(() => {
    if (!hasDiff || !allocations || !selectedTx || !plan) {
      setDiffAllocations([])
      return
    }
    const ratio = plan.expected_amount > 0 ? selectedTx.amount / plan.expected_amount : 1
    setDiffAllocations(
      allocations.map((a) => ({
        recordId: a._id,
        accountName: a.goalName
          ? `${a.goalEmoji ?? ""} ${a.goalName} · ${a.accountName}`.trim()
          : a.accountName,
        amount: Math.round(a.amount * ratio * 100) / 100,
      }))
    )
  }, [selectedTxId, hasDiff, allocations?.length])

  const diffTotal = diffAllocations.reduce((s, a) => s + a.amount, 0)
  const actualAmount = selectedTx?.amount ?? 0
  const diffBalance = Math.abs(diffTotal - actualAmount)
  const diffBalanced = diffBalance < 0.02

  function distributeEvenly() {
    if (!selectedTx || diffAllocations.length === 0) return
    const per = Math.round((selectedTx.amount / diffAllocations.length) * 100) / 100
    const remainder = Math.round((selectedTx.amount - per * (diffAllocations.length - 1)) * 100) / 100
    setDiffAllocations((prev) =>
      prev.map((a, i) => ({
        ...a,
        amount: i === prev.length - 1 ? remainder : per,
      }))
    )
  }

  async function handleMatch() {
    if (!plan || !selectedTxId) return
    setMatching(true)
    try {
      await matchPlan({
        planId: plan._id,
        transactionId: selectedTxId,
        customAllocations: hasDiff && diffAllocations.length > 0
          ? diffAllocations.map((a) => ({ recordId: a.recordId, amount: a.amount }))
          : undefined,
      })
      // Fire-and-forget passive verification
      verifyAllocations({ planId: plan._id }).catch(() => {})
      onOpenChange(false)
      setSelectedTxId(null)
      setDiffAllocations([])
    } finally {
      setMatching(false)
    }
  }

  const confirmDisabled = !selectedTxId || matching || (hasDiff && !diffBalanced)

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

        {/* Transaction list */}
        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
          {suggestions === undefined && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Finding matches...</span>
            </div>
          )}
          {suggestions?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No income transactions found within 14 days of the expected date.
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

        {/* Diff resolver — shown when selected tx has amount mismatch */}
        {hasDiff && selectedTx && plan && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Amount mismatch — adjust allocations
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Received {formatCurrency(selectedTx.amount)}, expected {formatCurrency(plan.expected_amount)}.
                  Allocations must total {formatCurrency(selectedTx.amount)}.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {diffAllocations.map((a, i) => (
                <div key={a.recordId} className="flex items-center gap-2">
                  <span className="text-xs text-foreground flex-1 truncate">{a.accountName}</span>
                  <Input
                    type="number"
                    className="w-24 h-7 text-xs text-right tabular-nums"
                    value={a.amount}
                    min={0}
                    step={50}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        setDiffAllocations((prev) =>
                          prev.map((item, idx) => (idx === i ? { ...item, amount: val } : item))
                        )
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={distributeEvenly}
              >
                Distribute evenly
              </Button>
              <span
                className={cn(
                  "text-xs tabular-nums font-medium",
                  diffBalanced ? "text-emerald-600" : "text-amber-600"
                )}
              >
                Total: {formatCurrency(diffTotal)}
                {!diffBalanced && ` (need ${formatCurrency(actualAmount)})`}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMatch}
            disabled={confirmDisabled}
            className="gap-1.5"
          >
            {matching && <Loader2 className="size-3.5 animate-spin" />}
            <Link2 className="size-3.5" />
            Confirm Match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
