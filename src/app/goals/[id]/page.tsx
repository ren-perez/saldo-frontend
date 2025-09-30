"use client"

import { use } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Calendar, TrendingUp, Target, HandCoins, CreditCard, Tag } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Id } from "../../../../convex/_generated/dataModel"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const goalId = resolvedParams.id as Id<"goals">
    const { convexUser } = useConvexUser()

    const goals = useQuery(
        api.goals.getGoals,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    const contributionHistory = useQuery(
        api.contributions.getContributionHistory,
        convexUser ? { userId: convexUser._id, goalId } : "skip"
    )

    const contributionAnalytics = useQuery(
        api.contributions.getContributionAnalytics,
        convexUser ? { userId: convexUser._id, goalId, timeframe: "all" } : "skip"
    )

    const goal = goals?.find(g => g._id === goalId)

    if (!goal) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Goal not found</h2>
                    <Link href="/goals">
                        <Button variant="link" className="mt-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Goals
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    const progress = (goal.current_amount / goal.total_amount) * 100
    const remaining = goal.total_amount - goal.current_amount

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount)
    }

    const getTrackingTypeDisplay = () => {
        if (goal.tracking_type === "MANUAL") {
            return { icon: <HandCoins className="h-4 w-4" />, label: "Manual" }
        } else if (goal.tracking_type === "LINKED_ACCOUNT") {
            return { icon: <CreditCard className="h-4 w-4" />, label: "From Account" }
        } else if (goal.tracking_type === "EXPENSE_CATEGORY") {
            return { icon: <Tag className="h-4 w-4" />, label: "Expense-Linked" }
        }
        return { icon: null, label: "Unknown" }
    }

    const trackingDisplay = getTrackingTypeDisplay()

    return (
        <AppLayout>
            <InitUser />
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href="/goals">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Goals
                        </Button>
                    </Link>
                </div>

                {/* Goal Overview */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <CardTitle className="flex items-center gap-2 text-3xl">
                                    <span className="text-4xl">{goal.emoji}</span>
                                    {goal.name}
                                </CardTitle>
                                {goal.note && (
                                    <CardDescription className="text-base">{goal.note}</CardDescription>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="flex items-center gap-1">
                                    {trackingDisplay.icon}
                                    {trackingDisplay.label}
                                </Badge>
                                {goal.is_completed && <Badge variant="default">Completed</Badge>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">Progress</span>
                                <span className="text-muted-foreground">{progress.toFixed(1)}%</span>
                            </div>
                            <Progress value={progress} className="h-3" />
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {formatCurrency(goal.current_amount)} of {formatCurrency(goal.total_amount)}
                                </span>
                                <span className="text-muted-foreground">
                                    {formatCurrency(remaining)} remaining
                                </span>
                            </div>
                        </div>

                        {/* Key Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                <Target className="h-8 w-8 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Target Amount</p>
                                    <p className="text-2xl font-bold">{formatCurrency(goal.total_amount)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                <TrendingUp className="h-8 w-8 text-green-500" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Monthly Target</p>
                                    <p className="text-2xl font-bold">{formatCurrency(goal.monthly_contribution)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                <Calendar className="h-8 w-8 text-blue-500" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Due Date</p>
                                    <p className="text-lg font-bold">
                                        {goal.due_date ? format(new Date(goal.due_date), "MMM dd, yyyy") : "Not set"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Linked Account/Category Info */}
                        {goal.linked_account && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Linked Account</p>
                                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                    {goal.linked_account.name} ({goal.linked_account.account_type})
                                </p>
                            </div>
                        )}
                        {goal.linked_category && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Linked Category</p>
                                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                    {goal.linked_category.group_name ? `${goal.linked_category.group_name} → ` : ""}
                                    {goal.linked_category.name}
                                </p>
                                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                    Expenses in this category automatically count toward this goal
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabs for Different Views */}
                <Tabs defaultValue="contributions" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="contributions">Contributions</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    {/* Contributions Tab */}
                    <TabsContent value="contributions" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Contributions</CardTitle>
                                <CardDescription>
                                    All contributions made toward this goal
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {contributionHistory && contributionHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {contributionHistory.map((contribution) => (
                                            <div
                                                key={contribution._id}
                                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={
                                                            contribution.source === "expense_linked" ? "secondary" :
                                                                contribution.source === "manual_ui" ? "default" :
                                                                    "outline"
                                                        }>
                                                            {contribution.source === "expense_linked" ? "Auto (Expense)" :
                                                                contribution.source === "manual_ui" ? "Manual" :
                                                                    contribution.source}
                                                        </Badge>
                                                        {contribution.transaction?.account && (
                                                            <span className="text-sm text-muted-foreground">
                                                                from {contribution.transaction.account.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {contribution.note && (
                                                        <p className="text-sm text-muted-foreground">{contribution.note}</p>
                                                    )}
                                                    {contribution.transaction && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Transaction: {contribution.transaction.description}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(contribution.contribution_date), "MMM dd, yyyy")}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-green-600">
                                                        +{formatCurrency(contribution.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No contributions yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Goal Analytics</CardTitle>
                                <CardDescription>
                                    Statistics and insights about your progress
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {contributionAnalytics ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Total Amount</p>
                                            <p className="text-2xl font-bold">{formatCurrency(contributionAnalytics.totalContributions)}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Number of Contributions</p>
                                            <p className="text-2xl font-bold">{contributionAnalytics.contributionCount}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Average Contribution</p>
                                            <p className="text-2xl font-bold">{formatCurrency(contributionAnalytics.averageContribution)}</p>
                                        </div>
                                        <div className="p-4 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Completion Rate</p>
                                            <p className="text-2xl font-bold">{progress.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No analytics data available yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Goal History</CardTitle>
                                <CardDescription>
                                    Timeline of changes and milestones
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 border-l-2 border-primary pl-4">
                                        <div className="flex-1">
                                            <p className="font-medium">Goal Created</p>
                                            <p className="text-sm text-muted-foreground">
                                                {goal.createdAt ? format(new Date(goal.createdAt), "MMM dd, yyyy 'at' h:mm a") : "Unknown"}
                                            </p>
                                        </div>
                                    </div>
                                    {goal.is_completed && (
                                        <div className="flex items-start gap-3 p-3 border-l-2 border-green-500 pl-4">
                                            <div className="flex-1">
                                                <p className="font-medium">Goal Completed</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Congratulations on reaching your goal!
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    )
}
