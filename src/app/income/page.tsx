// src/app/income/page.tsx
"use client"

import { useState, useMemo } from "react"
import { Inbox, Plus, Calendar, ArrowRight, Link2, DollarSign, Info } from "lucide-react"
import { AllocationsView } from "@/components/allocation/allocations-view"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useConvexUser } from "@/hooks/useConvexUser"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { format } from "date-fns"
import { IncomeTimeline } from "@/components/wealth/income-timeline"
import { useUnmatchedIncomeCount } from "@/components/wealth/unmatched-income-section"
import { MatchTransactionDialog } from "@/components/wealth/match-transaction-dialog"
import { formatCurrency, type UnmatchedTransaction } from "@/components/wealth/income-shared"

export default function IncomePage() {
  const { convexUser } = useConvexUser()
  const userId = convexUser?._id

  const { count } = useUnmatchedIncomeCount(userId)

  const [activeTab, setActiveTab] = useState("timeline")
  const [unmatchedOpen, setUnmatchedOpen] = useState(false)
  const [matchingTx, setMatchingTx] = useState<UnmatchedTransaction | null>(null)
  const [txMatchOpen, setTxMatchOpen] = useState(false)

  // Lifted state for child dialogs
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)
  const [allocationFormOpen, setAllocationFormOpen] = useState(false)

  function handleUnmatchedTxMatch(tx: UnmatchedTransaction) {
    setMatchingTx(tx)
    setTxMatchOpen(true)
  }

  return (
    <AppLayout>
      <InitUser />
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-foreground">Income</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>Track and allocate your income across accounts.</TooltipContent>
          </Tooltip>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="allocations">Allocation Rules</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {count > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUnmatchedOpen((o) => !o)}
                  className="gap-1.5 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-700 hover:from-amber-500/20 hover:to-amber-500/10 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400"
                >
                  <Inbox className="size-3.5" />
                  <span className="hidden sm:inline">Match Your Income</span>
                  <span className="inline sm:hidden">Match</span>
                </Button>
              )}

              {activeTab === "timeline" && (
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setIncomeFormOpen(true)}
                >
                  <Plus className="size-3.5" />
                  <span className="hidden sm:inline">Add Income</span>
                  <span className="inline sm:hidden">Add</span>
                </Button>
              )}

              {activeTab === "allocations" && (
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setAllocationFormOpen(true)}
                >
                  <Plus className="size-3.5" />
                  <span className="hidden sm:inline">Add Rule</span>
                  <span className="inline sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="timeline" className="mt-4">
            <IncomeTimeline
              externalFormOpen={incomeFormOpen}
              onExternalFormOpenChange={setIncomeFormOpen}
            />
          </TabsContent>
          <TabsContent value="allocations" className="mt-4">
            <AllocationsView
              externalShowAdd={allocationFormOpen}
              onExternalShowAddChange={setAllocationFormOpen}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Unmatched Income Modal */}
      {userId && (
        <UnmatchedIncomeModal
          userId={userId}
          open={unmatchedOpen}
          onOpenChange={setUnmatchedOpen}
          onMatchTransaction={handleUnmatchedTxMatch}
        />
      )}

      {/* Transaction → Plan match dialog */}
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

  const transactions = useQuery(
    api.contributions.getUnallocatedTransactions,
    open
      ? {
          userId,
          accountId:
            selectedAccountId !== "__all__"
              ? (selectedAccountId as Id<"accounts">)
              : undefined,
          limit: 50,
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

  const totalUnmatched = positive.reduce((s, t) => s + t.amount, 0)

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
          </div>
        </div>

        {/* Transaction list */}
        <div className="overflow-y-auto max-h-[60vh] px-3 py-3 flex flex-col gap-2">
          {positive.slice(0, 15).map((tx) => {
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

          {positive.length > 15 && (
            <p className="text-[11px] text-muted-foreground text-center py-1.5">
              +{positive.length - 15} more transactions
            </p>
          )}

          {positive.length === 0 && transactions !== undefined && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No unmatched income found.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
