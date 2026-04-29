// src/app/income/page.tsx
"use client"

import { useState, useMemo } from "react"
import { Plus, Calendar, ArrowRight, Link2, DollarSign, Undo2, SlidersHorizontal } from "lucide-react"
import { AllocationsView } from "@/components/allocation/allocations-view"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConvexUser } from "@/hooks/useConvexUser"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { format } from "date-fns"
import { IncomeTimeline } from "@/components/wealth/income-timeline"
import { SafeToSpendCard } from "@/components/wealth/safe-to-spend-card"
import { useUnmatchedIncomeCount } from "@/components/wealth/unmatched-income-section"
import { MatchTransactionDialog } from "@/components/wealth/match-transaction-dialog"
import { formatCurrency, type UnmatchedTransaction } from "@/components/wealth/income-shared"

export default function IncomePage() {
  const { convexUser } = useConvexUser()
  const userId = convexUser?._id

  useUnmatchedIncomeCount(userId)

  const [unmatchedOpen, setUnmatchedOpen] = useState(false)
  const [matchingTx, setMatchingTx] = useState<UnmatchedTransaction | null>(null)
  const [txMatchOpen, setTxMatchOpen] = useState(false)
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)
  const [allocationRulesOpen, setAllocationRulesOpen] = useState(false)

  function handleUnmatchedTxMatch(tx: UnmatchedTransaction) {
    setMatchingTx(tx)
    setTxMatchOpen(true)
  }

  return (
    <AppLayout>
      <InitUser />
      <div className="flex flex-col gap-6 p-6">

        {/* Header + pill + actions */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* {count > 0 && (
              <Button
                variant="outline"
                onClick={() => setUnmatchedOpen(true)}
                className="gap-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-700 hover:from-amber-500/20 hover:to-amber-500/10 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400"
              >
                <Inbox className="size-4" />
                <span className="hidden sm:inline">Match Your Income</span>
                <span className="inline sm:hidden">Match</span>
              </Button>
            )} */}
            <Button
              variant="outline"
              onClick={() => setAllocationRulesOpen(true)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              {/* <SlidersHorizontal className="size-4" /> */}
              <span className="hidden sm:inline">Allocation Rules</span>
              <span className="inline sm:hidden">Rules</span>
            </Button>
            <Button className="gap-2" onClick={() => setIncomeFormOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Income</span>
              <span className="inline sm:hidden">Add</span>
            </Button>
          </div>
          {userId && <SafeToSpendCard userId={userId} />}
        </div>

        {/* Timeline */}
        <div className="">
          <IncomeTimeline
            externalFormOpen={incomeFormOpen}
            onExternalFormOpenChange={setIncomeFormOpen}
          />
        </div>

        <AllocationsView
          open={allocationRulesOpen}
          onOpenChange={setAllocationRulesOpen}
        />
      </div>

      {userId && (
        <UnmatchedIncomeModal
          userId={userId}
          open={unmatchedOpen}
          onOpenChange={setUnmatchedOpen}
          onMatchTransaction={handleUnmatchedTxMatch}
        />
      )}

      {userId && (
        <MatchTransactionDialog
          transaction={matchingTx}
          userId={userId}
          open={txMatchOpen}
          onOpenChange={(v: boolean) => {
            setTxMatchOpen(v)
            if (!v) setMatchingTx(null)
          }}
        />
      )}
    </AppLayout>
  )
}

// ─── Unmatched Income Modal ──────────────────────────────────────────────────

const PAGE_SIZE = 20

function UnmatchedIncomeModal({
  userId,
  open,
  onOpenChange,
  onMatchTransaction,
}: {
  userId: Id<"users">
  open: boolean
  onOpenChange: (v: boolean) => void
  onMatchTransaction: (tx: UnmatchedTransaction) => void
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("__all__")
  const [activeModalTab, setActiveModalTab] = useState<"unmatched" | "recent">("unmatched")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const unmatchAndReset = useMutation(api.incomePlans.unmatchAndResetAllocations)

  const transactions = useQuery(
    api.contributions.getUnallocatedTransactions,
    open
      ? {
          userId,
          accountId:
            selectedAccountId !== "__all__"
              ? (selectedAccountId as Id<"accounts">)
              : undefined,
          limit: 200,
          incomeOnly: true,
        }
      : "skip"
  )

  const accounts = useQuery(
    api.goals.getGoalAccounts,
    open ? { userId } : "skip"
  )

  const incomePlans = useQuery(
    api.incomePlans.listIncomePlans,
    open ? { userId } : "skip"
  )

  const positive = useMemo(
    () => (transactions ?? []).filter((t) => t.amount > 0),
    [transactions]
  )

  // Recently matched plans (sorted by date_received descending)
  const recentlyMatched = useMemo(() => {
    return (incomePlans ?? [])
      .filter((p) => p.status === "matched")
      .sort((a, b) => {
        const da = a.date_received ?? a.expected_date
        const db = b.date_received ?? b.expected_date
        return db.localeCompare(da)
      })
      .slice(0, 20)
  }, [incomePlans])

  const totalUnmatched = positive.reduce((s, t) => s + t.amount, 0)
  const visibleTransactions = positive.slice(0, visibleCount)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border bg-gradient-to-b from-amber-500/5 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-base">Match Your Income</DialogTitle>
            <DialogDescription className="text-xs">
              Link deposits to your income plans for tracking.
            </DialogDescription>
          </DialogHeader>

          {/* Summary + filter row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30 font-semibold"
              >
                {positive.length} unmatched
              </Badge>
              <span className="text-xs font-medium tabular-nums text-emerald-600">
                {formatCurrency(totalUnmatched)}
              </span>
            </div>
            {activeModalTab === "unmatched" && (
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="w-36 h-7 text-xs">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All accounts</SelectItem>
                  {accounts?.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setActiveModalTab("unmatched")}
              className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeModalTab === "unmatched"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unmatched
            </button>
            <button
              onClick={() => setActiveModalTab("recent")}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeModalTab === "recent"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Undo2 className="size-2.5" />
              Recently Matched
            </button>
          </div>
        </div>

        {/* Tab: Unmatched transactions */}
        {activeModalTab === "unmatched" && (
          <div className="overflow-y-auto max-h-[60vh] px-3 py-3 flex flex-col gap-2">
            {visibleTransactions.map((tx) => {
              const suggestion = (incomePlans ?? [])
                .filter((p) => p.status === "planned")
                .map((p) => ({
                  ...p,
                  diff: Math.abs(p.expected_amount - tx.amount),
                  daysDiff:
                    Math.abs(
                      new Date(p.expected_date).getTime() - tx.date
                    ) /
                    (1000 * 60 * 60 * 24),
                }))
                .filter((p) => p.daysDiff <= 14 && p.diff / tx.amount < 0.2)
                .sort((a, b) => a.diff - b.diff)[0]

              return (
                <button
                  key={tx._id}
                  onClick={() => onMatchTransaction(tx as UnmatchedTransaction)}
                  className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50 hover:border-amber-500/30"
                >
                  {/* Amount */}
                  <div className="shrink-0 text-right w-[4.5rem]">
                    <div className="text-sm font-semibold tabular-nums text-emerald-600">
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="size-2.5" />
                        {format(new Date(tx.date), "MMM d")}
                      </span>
                      {tx.account && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0"
                        >
                          {tx.account.name}
                        </Badge>
                      )}
                      {suggestion && (
                        <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                          <ArrowRight className="size-2.5" />
                          {suggestion.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match indicator */}
                  <div className="shrink-0">
                    {suggestion ? (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link2 className="size-3" />
                        Match
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <DollarSign className="size-3" />
                        Match
                      </div>
                    )}
                  </div>
                </button>
              )
            })}

            {positive.length > visibleCount && (
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="text-[11px] text-muted-foreground hover:text-foreground text-center py-2 transition-colors"
              >
                Show {Math.min(PAGE_SIZE, positive.length - visibleCount)} more
                ({positive.length - visibleCount} remaining)
              </button>
            )}

            {positive.length === 0 && transactions !== undefined && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No unmatched income found.
              </p>
            )}
          </div>
        )}

        {/* Tab: Recently matched */}
        {activeModalTab === "recent" && (
          <div className="overflow-y-auto max-h-[60vh] px-3 py-3 flex flex-col gap-2">
            {recentlyMatched.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recently matched income.
              </p>
            )}
            {recentlyMatched.map((plan) => (
              <div
                key={plan._id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="shrink-0 text-right w-[4.5rem]">
                  <div className="text-sm font-semibold tabular-nums text-emerald-600">
                    {formatCurrency(plan.actual_amount ?? plan.expected_amount)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {plan.label}
                  </p>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-2.5" />
                    {plan.date_received
                      ? format(new Date(plan.date_received), "MMM d")
                      : format(new Date(plan.expected_date), "MMM d")}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive shrink-0"
                  title="Undo match"
                  onClick={async () => {
                    if (window.confirm(`Undo match for "${plan.label}"? Allocations will revert to forecast.`)) {
                      await unmatchAndReset({ planId: plan._id, userId })
                    }
                  }}
                >
                  <Undo2 className="size-3" />
                  Undo
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
