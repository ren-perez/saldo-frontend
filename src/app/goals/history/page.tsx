"use client"

import { useConvexUser } from "@/hooks/useConvexUser"
import { ContributionHistory } from "@/components/goals/ContributionHistory"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { History } from "lucide-react"

export default function ContributionHistoryPage() {
  // Currency formatter
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <AppLayout>
      <InitUser />
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            Contribution History
          </h1>
          <p className="text-muted-foreground mt-2">
            View and analyze all your goal contributions, transfers, and withdrawals
          </p>
        </div>

        {/* Contribution History Component */}
        <ContributionHistory formatCurrency={formatCurrency} />
      </div>
    </AppLayout>
  )
}