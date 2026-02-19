"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { ActionCards } from "@/components/dashboard/action-cards"
import { AccountsSnapshot } from "@/components/dashboard/accounts-snapshot"
import { MonthlyOverview } from "@/components/dashboard/monthly-overview"
import { GoalsProgress } from "@/components/dashboard/goals-progress"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"

export default function DashboardPage() {
  const { convexUser } = useConvexUser()

  // Month navigation state
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const { startDate, endDate } = useMemo(() => {
    const start = new Date(year, month, 1).getTime()
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
    return { startDate: start, endDate: end }
  }, [month, year])

  function handleMonthChange(delta: number) {
    setMonth((prev) => {
      let newMonth = prev + delta
      let newYear = year
      if (newMonth < 0) {
        newMonth = 11
        newYear -= 1
      } else if (newMonth > 11) {
        newMonth = 0
        newYear += 1
      }
      setYear(newYear)
      return newMonth
    })
  }

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

  const potentialTransfers = useQuery(
    convexUser ? api.transfers.getPotentialTransfers : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  // Only block on initial data – avoid full-page flash when month changes
  const isInitialLoad =
    accounts === undefined ||
    goals === undefined ||
    incomeSummary === undefined ||
    potentialTransfers === undefined

  // Compute action card counts
  const unmatchedIncomeCount = incomeSummary?.thisMonth.plannedCount ?? 0
  const pendingTransferCount = potentialTransfers?.length ?? 0
  const activeGoalCount = goals?.filter((g: { is_completed: boolean }) => !g.is_completed).length ?? 0

  return (
    <AppLayout>
      <InitUser />
      <div className="container flex flex-col">
        <div className="flex flex-col gap-10 p-6">
          {isInitialLoad ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-muted-foreground">Loading dashboard...</div>
            </div>
          ) : (
            <>
              <ActionCards
                unmatchedIncomeCount={unmatchedIncomeCount}
                pendingTransferCount={pendingTransferCount}
                activeGoalCount={activeGoalCount}
              />

              <GoalsProgress goals={goals ?? []} />

              <div className="grid gap-6 lg:grid-cols-2">
                <MonthlyOverview
                  stats={dashboardStats}
                  month={month}
                  year={year}
                  onMonthChange={handleMonthChange}
                  onGoToToday={() => {
                    const today = new Date()
                    setMonth(today.getMonth())
                    setYear(today.getFullYear())
                  }}
                />
                
                <AccountsSnapshot accounts={accounts ?? []} incomeSummary={incomeSummary} />
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
