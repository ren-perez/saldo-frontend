"use client"

import { useConvexUser } from "@/hooks/useConvexUser"
import { ContributionAnalytics } from "@/components/goals/ContributionAnalytics"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { BarChart3 } from "lucide-react"

export default function ContributionAnalyticsPage() {
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
            <BarChart3 className="h-8 w-8 text-primary" />
            Contribution Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Analyze your contribution patterns, trends, and sources
          </p>
        </div>

        {/* Contribution Analytics Component */}
        <ContributionAnalytics formatCurrency={formatCurrency} />
      </div>
    </AppLayout>
  )
}