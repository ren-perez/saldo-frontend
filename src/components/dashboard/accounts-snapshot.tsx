"use client"

import Link from "next/link"
import { CheckCircle2, Clock, XCircle, CalendarClock, Wallet, PiggyBank, TrendingUp, CreditCard, SquareArrowOutUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { currency, currencyExact, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type AccountType = "checking" | "savings" | "investment" | "credit"

const typeIcons: Record<AccountType, React.ElementType> = {
  checking: Wallet,
  savings: PiggyBank,
  investment: TrendingUp,
  credit: CreditCard,
}

const typeLabels: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  investment: "Investment",
  credit: "Credit",
}

const accountTypeOrder: AccountType[] = ["checking", "savings", "credit", "investment"]

type Account = {
  _id: string
  name: string
  type: string
  bank: string
  balance?: number
  lastUploadedAt?: number | null
}

type IncomeSummary = {
  thisMonth: {
    plannedCount: number
    matchedCount: number
    missedCount: number
    totalPlanned: number
    totalMatched: number
    totalMissed: number
  }
  upcoming: Array<{ _id: string; expected_amount: number; expected_date: string; label: string }>
}

interface AccountsSnapshotProps {
  accounts: Account[]
  incomeSummary?: IncomeSummary | null
}

export function AccountsSnapshot({ accounts, incomeSummary }: AccountsSnapshotProps) {
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0)
  const summary = incomeSummary?.thisMonth

  const totalExpected = summary
    ? summary.totalPlanned + summary.totalMatched + summary.totalMissed
    : 0
  const matchedPct = totalExpected > 0 ? Math.round((summary!.totalMatched / totalExpected) * 100) : 0

  return (
    <Card>
      <Tabs defaultValue="income">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Finances</CardTitle>
            <TabsList className="h-8">
              <TabsTrigger value="income" className="text-xs px-3 h-7">Income</TabsTrigger>
              <TabsTrigger value="accounts" className="text-xs px-3 h-7">Accounts</TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Income Tab */}
          <TabsContent value="income" className="mt-0">
            {summary ? (
              <div className="flex flex-col gap-4">
                {/* Total expected this month */}
                <Link href="/income" className="flex items-baseline justify-between group">
                  <span className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Expected this month
                    <SquareArrowOutUpRight className="size-3 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-foreground transition-opacity" />
                    </span>
                  <span className="text-2xl font-semibold tabular-nums">{currency(totalExpected)}</span>
                </Link>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Received</span>
                    <span>{matchedPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${matchedPct}%` }}
                    />
                  </div>
                </div>

                {/* Status rows */}
                <div className="grid grid-cols-3 gap-3">
                  <Link href="/income" className="rounded-lg border bg-muted/40 p-3 hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Matched</span>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{currency(summary.totalMatched)}</p>
                    <p className="text-xs text-muted-foreground">{summary.matchedCount} received</p>
                  </Link>
                  <Link href="/income" className="rounded-lg border bg-muted/40 p-3 hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="size-3.5 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Planned</span>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{currency(summary.totalPlanned)}</p>
                    <p className="text-xs text-muted-foreground">{summary.plannedCount} pending</p>
                  </Link>
                  <Link href="/income" className="rounded-lg border bg-muted/40 p-3 hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <XCircle className="size-3.5 text-destructive" />
                      <span className="text-xs text-muted-foreground">Missed</span>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{currency(summary.totalMissed)}</p>
                    <p className="text-xs text-muted-foreground">{summary.missedCount} missed</p>
                  </Link>
                </div>

                {/* Upcoming */}
                {incomeSummary.upcoming.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                      <span>Upcoming</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {incomeSummary.upcoming.slice(0, 3).map((item) => (
                        <Link
                          key={item._id}
                          href="/income"
                          className="flex items-center justify-between text-sm py-1.5 px-4 -mx-1 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{item.expected_date}</span>
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <span className="tabular-nums font-medium">{currency(item.expected_amount)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No income data yet</p>
            )}
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="mt-0">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total balance</span>
              <span className="text-2xl font-semibold tabular-nums">{currencyExact(totalBalance)}</span>
            </div>
            <div className="flex flex-col gap-4">
              {accountTypeOrder.map((type) => {
                const group = accounts.filter((a) => a.type === type)
                if (group.length === 0) return null
                const Icon = typeIcons[type]
                return (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{typeLabels[type]}</span>
                    </div>
                    <div className="divide-y">
                      {group.map((account) => (
                        <Link
                          key={account._id}
                          href={`/transactions?accountId=${account._id}`}
                          className="flex items-center justify-between py-2 px-6 -mx-1 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{account.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{account.bank}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {account.lastUploadedAt
                                ? `Last upload ${formatDate(account.lastUploadedAt)}`
                                : "No uploads yet"}
                            </span>
                          </div>
                          <span className={cn(
                            "text-sm font-semibold tabular-nums shrink-0 ml-3",
                            (account.balance ?? 0) < 0 ? "text-destructive" : "text-foreground"
                          )}>
                            {currencyExact(account.balance ?? 0)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
              {accounts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No accounts yet</p>
              )}
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
