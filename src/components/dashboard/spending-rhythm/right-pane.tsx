"use client"

import { cn } from "@/lib/utils"
import { currency, currencyExact } from "@/lib/format"
import { monthNames, SUBSCRIPTIONS, type DailyStats, type DailyTx } from "./types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AccountsRail } from "../accounts-rail"
import { WaterfallAllocations as PlannedIncomeAllocations } from "../money-flow/waterfall/WaterfallAllocations"
import { useMoneyFlowData } from "../money-flow/hooks/use-money-flow-data"
import { Waterfall } from "../money-flow/waterfall/Waterfall"
import { MoneyFlowProvider } from "../money-flow/context/money-flow-context"


type KpiStats = { income: number; expenses: number; goals: number }

function KpiPills({ stats }: { stats: KpiStats }) {
  const netFlow = stats.income - stats.expenses - stats.goals
  const pills = [
    { label: "Income", value: currency(stats.income), color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Spent", value: currency(stats.expenses), color: "text-red-600 dark:text-red-400" },
    { label: "Goals", value: currency(stats.goals), color: "text-blue-600 dark:text-blue-400" },
  ]
  return (
    <div className="inline-flex items-center gap-0">
      {pills.map((pill, i) => (
        <div key={pill.label} className="flex items-center">
          {i > 0 && <div className="w-px h-4 bg-border/50 mx-2.5" />}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">{pill.label}</span>
            <span className={cn("font-mono text-[12px] font-medium leading-none tabular-nums", pill.color)}>{pill.value}</span>
          </div>
        </div>
      ))}
      <div className="w-px h-4 bg-border/50 mx-2.5" />
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">Net</span>
        <span className={cn(
          "font-mono text-[12px] font-medium leading-none tabular-nums",
          netFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}>{currency(Math.abs(netFlow))}</span>
      </div>
    </div>
  )
}

function TransactionList({ txs }: { txs?: DailyTx[] }) {
  return (
    <>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transactions</p>
      {txs && txs.length > 0 ? (
        txs.map((tx: DailyTx, idx: number) => {
          const isSub = tx.category === "Software & Tools" || tx.category === "Media"
          return (
            <div key={idx} className="flex justify-between items-baseline gap-2">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  {isSub && <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />}
                  <span className="text-[12px] text-foreground truncate">{tx.description}</span>
                </div>
                {tx.category && <span className="text-[10px] text-muted-foreground truncate">{tx.category}</span>}
              </div>
              <span className={cn(
                "text-[12px] font-medium tabular-nums shrink-0",
                tx.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}>
                {tx.amount > 0 ? '+' : ''}{currencyExact(Math.abs(tx.amount))}
              </span>
            </div>
          )
        })
      ) : (
        <p className="text-xs text-muted-foreground">No transactions recorded.</p>
      )}
    </>
  )
}

type IdleRailProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accounts: any[]
  operatingCash: number
  creditExposure: number
  emergencyReserve: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flowMap: Map<string, { inflow: number; outflow: number }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accountBalanceHistories: Record<string, any[]>
  month: number
  year: number
  periodStats: KpiStats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incomeSummary?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  goals?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incomePlans?: any[]
}

function IdleRail(props: IdleRailProps) {
  const waterfallData = useMoneyFlowData({
    stats: props.stats,
    incomeSummary: props.incomeSummary,
    goals: props.goals,
    incomePlans: props.incomePlans,
  })

  return (
    <div className="bg-muted/30 border border-border rounded-xl flex flex-col h-full min-h-[300px] overflow-hidden">
      <Tabs defaultValue="waterfall" className="flex flex-col h-full">
        <div className="px-3 pt-3 pb-0 flex flex-col gap-2.5">
          <KpiPills stats={props.periodStats} />
          <TabsList className="w-full h-8 text-[11px]">
            <TabsTrigger value="waterfall" className="flex-1 text-[11px]">Waterfall</TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1 text-[11px]">Accounts</TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex-1 text-[11px]">Subscriptions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="waterfall" className="flex-1 overflow-y-auto flex flex-col">
          <MoneyFlowProvider>
            <Waterfall
              incomeNode={waterfallData.incomeNode}
              flowNodes={waterfallData.flowNodes}
              totalIncome={waterfallData.totalIncome}
              runningRemainder={waterfallData.runningRemainder}
              matchedTotal={waterfallData.matchedTotal}
              plannedTotal={waterfallData.plannedTotal}
              expectedTotal={waterfallData.expectedTotal}
            />
          </MoneyFlowProvider>
        </TabsContent>

        <TabsContent value="accounts" className="flex-1 overflow-y-auto p-2">
          <AccountsRail
            accounts={props.accounts}
            operatingCash={props.operatingCash}
            creditExposure={props.creditExposure}
            emergencyReserve={props.emergencyReserve}
            flowMap={props.flowMap}
            accountBalanceHistories={props.accountBalanceHistories}
            month={props.month}
            year={props.year}
          />
        </TabsContent>

        <TabsContent value="subscriptions" className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Subscriptions</p>
            {SUBSCRIPTIONS.map((sub, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/50 border border-border/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-medium text-foreground truncate">{sub.name}</span>
                    <span className="text-[10px] text-muted-foreground">{sub.cadence}</span>
                  </div>
                </div>
                <span className="text-[12px] font-semibold tabular-nums text-foreground shrink-0 ml-2">
                  {currencyExact(sub.amount)}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function DetailsPane({ displayDate, displayStats, isPreview, month, year, plannedItems, accounts, operatingCash, creditExposure, emergencyReserve, flowMap, accountBalanceHistories, periodStats, stats, incomeSummary, goals, incomePlans }: {
  displayDate: string | null
  displayStats: DailyStats | null
  isPreview: boolean
  month: number
  year: number
  plannedItems?: Array<{ _id: string; label: string; amount: number }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accounts: any[]
  operatingCash: number
  creditExposure: number
  emergencyReserve: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flowMap: Map<string, { inflow: number; outflow: number }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accountBalanceHistories: Record<string, any[]>
  periodStats: KpiStats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incomeSummary?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  goals?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incomePlans?: any[]
}) {
  const hasContent = displayStats || (plannedItems && plannedItems.length > 0)
  if (!displayDate || !hasContent) return (
    <IdleRail
      accounts={accounts}
      operatingCash={operatingCash}
      creditExposure={creditExposure}
      emergencyReserve={emergencyReserve}
      flowMap={flowMap}
      accountBalanceHistories={accountBalanceHistories}
      month={month}
      year={year}
      periodStats={periodStats}
      stats={stats}
      incomeSummary={incomeSummary}
      goals={goals}
      incomePlans={incomePlans}
    />
  )

  const dayStats: KpiStats = displayStats
    ? { income: displayStats.income || 0, expenses: displayStats.expenses || 0, goals: displayStats.goals || 0 }
    : { income: 0, expenses: 0, goals: 0 }

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col h-full min-h-[300px]">
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
          <h4 className="text-sm font-semibold text-foreground">
            {monthNames[month]} {parseInt(displayDate.split("-")[2], 10)}
          </h4>
          {isPreview ? (
            <span className="text-[10px] bg-muted-foreground/10 text-muted-foreground px-2 py-0.5 rounded-full font-medium">Preview</span>
          ) : (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Locked</span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="border-b border-border/40 pb-3">
            <KpiPills stats={dayStats} />
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
            {plannedItems && plannedItems.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Planned Income</p>
                {plannedItems.map((item) => (
                  <div key={item._id} className="border border-cyan-400/20 bg-cyan-400/5 rounded-lg px-3 py-2">
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="size-1.5 rounded-full border border-dashed border-cyan-400/70 shrink-0" />
                        <span className="text-[12px] text-cyan-600 dark:text-cyan-400 font-medium truncate">{item.label}</span>
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums shrink-0 text-cyan-600 dark:text-cyan-400">
                        +{currencyExact(item.amount)}
                      </span>
                    </div>
                    <PlannedIncomeAllocations incomePlanId={item._id} />
                  </div>
                ))}
                <div className="h-[1px] bg-border/50 my-1" />
              </>
            )}

            {displayStats && <TransactionList txs={displayStats.txs} />}
          </div>
        </div>
      </div>
    </div>
  )
}
