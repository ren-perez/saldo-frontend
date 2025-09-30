// components/goals/ContributionAnalytics.tsx
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, Calendar, DollarSign, Target, PieChart, Activity } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Id } from "../../../convex/_generated/dataModel"

interface ContributionAnalyticsProps {
    goalId?: Id<"goals">
    formatCurrency: (amount: number) => string
}

const TIMEFRAME_OPTIONS = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
]

const SOURCE_LABELS = {
    'manual_ui': 'Manual',
    'manual_tx': 'Transaction',
    'import': 'Import',
    'auto': 'Auto'
}

const SOURCE_COLORS = {
    'manual_ui': 'bg-blue-500',
    'manual_tx': 'bg-green-500',
    'import': 'bg-purple-500',
    'auto': 'bg-orange-500'
}

export function ContributionAnalytics({ goalId, formatCurrency }: ContributionAnalyticsProps) {
    const { convexUser } = useConvexUser()
    const [timeframe, setTimeframe] = useState('month')

    // Fetch analytics data
    const analytics = useQuery(api.contributions.getContributionAnalytics,
        convexUser ? {
            userId: convexUser._id,
            goalId: goalId,
            timeframe: timeframe
        } : "skip"
    )

    if (!analytics) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8">
                    <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">Loading analytics...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const sourceEntries = Object.entries(analytics.contributionsBySource)
    const maxSourceAmount = Math.max(...sourceEntries.map(([, amount]) => Math.abs(amount)))

    const dateEntries = Object.entries(analytics.contributionsByDate)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .slice(-7) // Show last 7 data points

    const maxDateAmount = Math.max(...dateEntries.map(([, amount]) => Math.abs(amount)))

    return (
        <div className="space-y-6">
            {/* Header with Timeframe Selector */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Contribution Analytics
                        </CardTitle>
                        <Select value={timeframe} onValueChange={setTimeframe}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TIMEFRAME_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Contributions</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(analytics.totalContributions)}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            {analytics.contributionCount} transactions
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Withdrawals</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(analytics.totalWithdrawals)}
                                </p>
                            </div>
                            <Activity className="h-8 w-8 text-red-600" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            {analytics.withdrawalCount} transactions
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Net Contributions</p>
                                <p className={`text-2xl font-bold ${
                                    analytics.netContributions >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {formatCurrency(analytics.netContributions)}
                                </p>
                            </div>
                            <Target className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            After withdrawals
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Average Contribution</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(analytics.averageContribution)}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                            Per transaction
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contributions by Source */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PieChart className="h-5 w-5" />
                            Contributions by Source
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sourceEntries.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No contribution data available
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sourceEntries.map(([source, amount]) => {
                                    const percentage = maxSourceAmount > 0 ? (Math.abs(amount) / maxSourceAmount) * 100 : 0
                                    return (
                                        <div key={source} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${SOURCE_COLORS[source as keyof typeof SOURCE_COLORS]}`} />
                                                    <span className="text-sm font-medium">
                                                        {SOURCE_LABELS[source as keyof typeof SOURCE_LABELS]}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-semibold">
                                                    {formatCurrency(amount)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${SOURCE_COLORS[source as keyof typeof SOURCE_COLORS]}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Contributions by Date */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Calendar className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dateEntries.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No recent activity
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dateEntries.map(([date, amount]) => {
                                    const percentage = maxDateAmount > 0 ? (Math.abs(amount) / maxDateAmount) * 100 : 0
                                    return (
                                        <div key={date} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">
                                                    {new Date(date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                <span className={`text-sm font-semibold ${
                                                    amount >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${
                                                        amount >= 0 ? 'bg-green-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Period Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-2">
                            <p className="font-medium">Time Period</p>
                            <Badge variant="outline" className="text-xs">
                                {TIMEFRAME_OPTIONS.find(opt => opt.value === timeframe)?.label}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                                {analytics.startDate} to {analytics.endDate}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium">Activity Level</p>
                            <p className="text-lg font-semibold">
                                {analytics.contributionCount + analytics.withdrawalCount} transactions
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {analytics.contributionCount} contributions, {analytics.withdrawalCount} withdrawals
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium">Net Impact</p>
                            <p className={`text-lg font-semibold ${
                                analytics.netContributions >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {analytics.netContributions >= 0 ? '+' : ''}{formatCurrency(analytics.netContributions)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Total progress change
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}