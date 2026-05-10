"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context"

// Dashboard Modules
import { TimeToolbar } from "@/components/dashboard/time-toolbar"
import { CommandHUD } from "@/components/dashboard/command-hud"
import { ActionCards } from "@/components/dashboard/action-cards"
import { GoalsProgress } from "@/components/dashboard/goals-progress"
import { MoneyFlow } from "@/components/dashboard/money-flow"
import { AccountsSnapshot } from "@/components/dashboard/accounts-snapshot"
import { CashflowCommand } from "@/components/dashboard/cashflow-command"
import { Affordability } from "@/components/dashboard/affordability"
import { SpendingRhythm } from "@/components/dashboard/spending-rhythm"

function DashboardContent() {
  const { convexUser } = useConvexUser()
  const { startDate, endDate, month, year } = useDashboard()

  // Fetch data from Convex
  const accounts = useQuery(
    convexUser ? api.accounts.listAccounts : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const goals = useQuery(
    convexUser ? api.goals.getGoals : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const dashboardStats = useQuery(
    convexUser ? api.transactions.getDashboardStats : ("skip" as never),
    convexUser ? { userId: convexUser._id, startDate, endDate } : "skip"
  )

  const incomeSummary = useQuery(
    convexUser ? api.incomePlans.getIncomeSummary : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const allPlans = useQuery(
    convexUser ? api.incomePlans.listIncomePlans : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const potentialTransfers = useQuery(
    convexUser ? api.transfers.getPotentialTransfers : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`
  const budgetContext = useQuery(
    convexUser ? api.allocations.getMonthlyBudgetContext : ("skip" as never),
    convexUser ? { userId: convexUser._id, monthKey } : "skip"
  )

  const accountBalanceHistories = useQuery(
    convexUser ? api.accounts.getAccountBalanceHistories : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const plannedIncomes = useMemo(() => {
    if (!allPlans) return []
    return allPlans
      .filter(p => p.status === "planned")
      .filter(p => {
        const d = new Date(p.expected_date).getTime()
        return d >= startDate && d <= endDate
      })
      .map(p => ({ _id: p._id, expected_date: p.expected_date, expected_amount: p.expected_amount, label: p.label }))
  }, [allPlans, startDate, endDate])

  const monthPlans = useMemo(() => {
    if (!allPlans) return []
    return allPlans.filter(p => {
      const d = new Date(p.expected_date).getTime()
      return d >= startDate && d <= endDate
    })
  }, [allPlans, startDate, endDate])

  const unmatchedIncomeCount = incomeSummary?.thisMonth?.plannedCount ?? 0
  const pendingTransferCount = potentialTransfers?.length ?? 0
  const activeGoalCount = (goals ?? []).filter((g) => !g.is_completed).length

  const isInitialLoad =
    accounts === undefined ||
    goals === undefined ||
    dashboardStats === undefined ||
    budgetContext === undefined ||
    accountBalanceHistories === undefined

  return (
    <div className="container max-w-7xl mx-auto flex flex-col pb-12">
      {/* Global Period Toolbar - sticky */}
      <TimeToolbar />

      <div className="flex flex-col gap-4 p-4 md:p-6">
        {isInitialLoad ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-sm text-muted-foreground animate-pulse">Initializing Command Center...</div>
          </div>
        ) : (
          <>
            {/* HUD: Mission Center + Command Center KPIs + Strategic Briefing + Module Focus Nav */}
            <CommandHUD stats={dashboardStats} accounts={accounts} goals={goals ?? []} incomeSummary={incomeSummary} />
            {/* <ActionCards
              unmatchedIncomeCount={unmatchedIncomeCount}
              pendingTransferCount={pendingTransferCount}
              activeGoalCount={activeGoalCount}
            /> */}

            {/* Spending Rhythm / Heatmap */}
            <div id="cc-module-rhythm">
              <SpendingRhythm stats={dashboardStats} goals={goals} plannedIncomes={plannedIncomes} />
            </div>

            {/* Money Flow + Accounts Snapshot */}
            <div id="cc-module-money-flow">
              <div className="lg:col-span-7">
                <MoneyFlow stats={dashboardStats} incomeSummary={incomeSummary} goals={goals} incomePlans={monthPlans} />
              </div>
              {/* <div className="lg:col-span-5">
                <AccountsSnapshot accounts={accounts ?? []} incomeSummary={incomeSummary} />
              </div> */}
            </div>

            {/* Cashflow + Affordability */}
            <div className="">
              <div id="cc-module-cashflow">
                <CashflowCommand stats={dashboardStats} incomeSummary={incomeSummary} goals={goals} />
              </div>
            </div>
            <div id="cc-module-affordability">
              <Affordability
                accounts={accounts ?? []}
                dashboardStats={dashboardStats}
                budgetContext={budgetContext}
                incomeSummary={incomeSummary}
                goals={goals ?? []}
                accountBalanceHistories={accountBalanceHistories ?? {}}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <InitUser />
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </AppLayout>
  )
}
