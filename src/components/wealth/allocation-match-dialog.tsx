"use client"

import { useState } from "react"
import { Link2, Loader2, Calendar } from "lucide-react"
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
import { formatCurrency, categoryLabels } from "./income-shared"

interface AllocationMatchDialogProps {
  allocationRecordId: Id<"allocation_records"> | null
  allocationInfo?: {
    accountName: string
    category: string
    amount: number
    remainingAmount: number
  }
  userId: Id<"users">
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function AllocationMatchDialog({
  allocationRecordId,
  allocationInfo,
  userId,
  open,
  onOpenChange,
}: AllocationMatchDialogProps) {
  const [selectedTxId, setSelectedTxId] = useState<Id<"transactions"> | null>(null)
  const [customAmount, setCustomAmount] = useState<string>("")
  const [matching, setMatching] = useState(false)

  const suggestions = useQuery(
    api.allocations.getSuggestedTransactionsForAllocation,
    allocationRecordId && open
      ? { allocationRecordId, userId }
      : "skip"
  )

  const matchAllocation = useMutation(api.allocations.matchAllocationTransaction)

  const selectedTx = suggestions?.find((t) => t._id === selectedTxId)

  async function handleMatch() {
    if (!allocationRecordId || !selectedTxId || !selectedTx) return
    setMatching(true)
    try {
      const amount = customAmount
        ? parseFloat(customAmount)
        : Math.abs(selectedTx.amount)
      if (isNaN(amount) || amount <= 0) return

      await matchAllocation({
        allocationRecordId,
        transactionId: selectedTxId,
        amount,
      })
      onOpenChange(false)
      setSelectedTxId(null)
      setCustomAmount("")
    } finally {
      setMatching(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v)
      if (!v) {
        setSelectedTxId(null)
        setCustomAmount("")
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Match Transaction</DialogTitle>
          <DialogDescription>
            Select a transaction to match to this allocation.
          </DialogDescription>
        </DialogHeader>

        {allocationInfo && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 border px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{allocationInfo.accountName}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {categoryLabels[allocationInfo.category] ?? allocationInfo.category}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(allocationInfo.remainingAmount)} remaining
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                of {formatCurrency(allocationInfo.amount)} target
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {suggestions === undefined && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Finding transactions...</span>
            </div>
          )}
          {suggestions?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No matching transactions found within 30 days.
            </p>
          )}
          {suggestions?.map((tx) => (
            <button
              key={tx._id}
              onClick={() => {
                setSelectedTxId(tx._id)
                setCustomAmount("")
              }}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                selectedTxId === tx._id
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-sm font-medium truncate">
                  {tx.description}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {format(new Date(tx.date), "MMM d")}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                <span className={cn(
                  "text-sm font-semibold tabular-nums",
                  tx.amount > 0 ? "text-emerald-600" : "text-foreground"
                )}>
                  {formatCurrency(Math.abs(tx.amount))}
                </span>
                {tx.amountDiff > 0.01 && allocationInfo && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatCurrency(tx.amountDiff)} diff
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {selectedTx && allocationInfo &&
          Math.abs(Math.abs(selectedTx.amount) - allocationInfo.remainingAmount) > 0.01 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Custom amount:</span>
            <Input
              type="number"
              className="w-32 h-7 text-xs text-right tabular-nums"
              placeholder={String(Math.abs(selectedTx.amount))}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              min={0}
              step={0.01}
            />
          </div>
        )}

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
            Match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
