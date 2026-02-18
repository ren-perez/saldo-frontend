"use client"

import { useState, useMemo } from "react"
import {
  ArrowRight,
  DollarSign,
  Calendar,
  Link2,
  Inbox,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { formatCurrency, type UnmatchedTransaction } from "./income-shared"

export function UnmatchedIncomeSection({
  userId,
  onMatchTransaction,
}: {
  userId: Id<"users">
  onMatchTransaction?: (tx: UnmatchedTransaction) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>("__all__")

  const transactions = useQuery(api.contributions.getUnallocatedTransactions, {
    userId,
    accountId:
      selectedAccountId !== "__all__"
        ? (selectedAccountId as Id<"accounts">)
        : undefined,
    limit: 50,
    incomeOnly: true,
  })

  const accounts = useQuery(api.goals.getGoalAccounts, { userId })

  const incomePlans = useQuery(api.incomePlans.listIncomePlans, { userId })

  const positive = useMemo(
    () => (transactions ?? []).filter((t) => t.amount > 0),
    [transactions]
  )

  const totalUnmatched = positive.reduce((s, t) => s + t.amount, 0)

  if (positive.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {/* ── CTA Banner ── */}
      <button
        onClick={() => setIsExpanded((e) => !e)}
        className="w-full text-left"
      >
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent hover:from-amber-500/10 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 shrink-0">
                <Inbox className="size-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {positive.length} Unmatched Income Transaction
                    {positive.length !== 1 ? "s" : ""}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30"
                  >
                    {formatCurrency(totalUnmatched)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Match these deposits to your income plans to track allocations
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-amber-600">
                  {isExpanded ? "Hide" : "Review"}
                </span>
                <ChevronRight
                  className={`size-4 text-amber-600 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </button>

      {/* ── Expanded Transaction List ── */}
      {isExpanded && (
        <Card>
          <CardContent className="p-4">
            {/* Filter bar */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                Showing {Math.min(positive.length, 10)} of {positive.length}{" "}
                transactions
              </span>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="w-44 h-7 text-xs">
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

            {/* Transaction rows */}
            <div className="flex flex-col gap-1.5">
              {positive.slice(0, 10).map((tx) => {
                const nearby = (incomePlans ?? [])
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
                  .filter(
                    (p) => p.daysDiff <= 14 && p.diff / tx.amount < 0.2
                  )
                  .sort((a, b) => a.diff - b.diff)
                  .slice(0, 1)

                const suggestion = nearby[0]

                return (
                  <div
                    key={tx._id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    {/* Amount */}
                    <div className="text-sm font-semibold text-emerald-600 tabular-nums w-20 text-right shrink-0">
                      {formatCurrency(tx.amount)}
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-border shrink-0" />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {tx.description}
                        </p>
                        {tx.account && (
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {tx.account.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {format(new Date(tx.date), "MMM d, yyyy")}
                        </span>
                        {suggestion && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <ArrowRight className="size-3" />
                            Possible: {suggestion.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      size="sm"
                      variant={suggestion ? "default" : "outline"}
                      className={
                        suggestion
                          ? "h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                          : "h-7 text-xs gap-1 shrink-0"
                      }
                      onClick={() => onMatchTransaction?.(tx as UnmatchedTransaction)}
                    >
                      {suggestion ? (
                        <Link2 className="size-3" />
                      ) : (
                        <DollarSign className="size-3" />
                      )}
                      Match
                    </Button>
                  </div>
                )
              })}
              {positive.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{positive.length - 10} more transactions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
