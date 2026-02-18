"use client"

import { use } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <h2 className="text-2xl font-bold text-muted-foreground">Goal not found</h2>
                    <Link href="/goals">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Goals
                        </Button>
                    </Link>
                </div>
            </AppLayout>
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
            return { icon: <HandCoins className="h-3.5 w-3.5" />, label: "Manual" }
        } else if (goal.tracking_type === "LINKED_ACCOUNT") {
            return { icon: <CreditCard className="h-3.5 w-3.5" />, label: "From Account" }
        } else if (goal.tracking_type === "EXPENSE_CATEGORY") {
            return { icon: <Tag className="h-3.5 w-3.5" />, label: "Expense-Linked" }
        }
        return { icon: null, label: "Unknown" }
    }

    const trackingDisplay = getTrackingTypeDisplay()
    const headerImage = goal.image_url

    return (
        <AppLayout>
            <InitUser />
            <div className="flex flex-col max-w-4xl mx-auto">
                {/* Notion-style Header Image */}
                <div className="relative w-full h-[280px] bg-gradient-to-br from-muted/60 via-muted/30 to-background overflow-hidden">
                    {headerImage ? (
                        <img
                            src={headerImage}
                            alt={goal.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div
                            className="w-full h-full"
                            style={{
                                background: `linear-gradient(135deg, ${goal.color || 'oklch(0.45 0.12 160)'} 0%, ${goal.color || 'oklch(0.55 0.08 200)'}80 50%, transparent 100%)`,
                                opacity: 0.4,
                            }}
                        />
                    )}
                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                    {/* Back button floating on image */}
                    <div className="absolute top-4 left-4">
                        <Link href="/goals">
                            <Button variant="secondary" size="sm" className="backdrop-blur-sm bg-background/70 hover:bg-background/90 shadow-sm">
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                Goals
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Content - overlaps the header image slightly */}
                <div className="relative -mt-16 px-6 pb-12">
                    {/* Emoji + Title */}
                    <div className="flex flex-col gap-1 mb-8">
                        <span className="text-6xl mb-2">{goal.emoji}</span>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">
                            {goal.name}
                        </h1>
                        {goal.note && (
                            <p className="text-base text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                                {goal.note}
                            </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="gap-1 text-xs">
                                {trackingDisplay.icon}
                                {trackingDisplay.label}
                            </Badge>
                            {goal.is_completed && (
                                <Badge className="bg-green-600 text-white text-xs">Completed</Badge>
                            )}
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div className="flex flex-col gap-6 mb-10">
                        {/* Progress Bar */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-baseline justify-between">
                                <span className="text-2xl font-bold tabular-nums">
                                    {formatCurrency(goal.current_amount)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    of {formatCurrency(goal.total_amount)}
                                </span>
                            </div>
                            <Progress value={progress} className="h-2.5" />
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{progress.toFixed(0)}% complete</span>
                                <span>{formatCurrency(remaining)} remaining</span>
                            </div>
                        </div>

                        {/* Key Details - clean inline layout */}
                        <div className="grid grid-cols-3 gap-6 py-5 border-y border-border">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Target className="h-3 w-3" />
                                    Monthly Target
                                </span>
                                <span className="text-lg font-semibold tabular-nums">
                                    {formatCurrency(goal.monthly_contribution)}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" />
                                    Due Date
                                </span>
                                <span className="text-lg font-semibold">
                                    {goal.due_date ? format(new Date(goal.due_date), "MMM dd, yyyy") : "Not set"}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <TrendingUp className="h-3 w-3" />
                                    Avg. Contribution
                                </span>
                                <span className="text-lg font-semibold tabular-nums">
                                    {contributionAnalytics
                                        ? formatCurrency(contributionAnalytics.averageContribution)
                                        : "--"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Linked Info */}
                    {(goal.linked_account || goal.linked_category) && (
                        <div className="flex flex-col gap-3 mb-10">
                            {goal.linked_account && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <div>
                                        <span className="text-xs text-blue-700 dark:text-blue-300">Linked Account</span>
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                            {goal.linked_account.name} ({goal.linked_account.account_type})
                                        </p>
                                    </div>
                                </div>
                            )}
                            {goal.linked_category && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                    <div>
                                        <span className="text-xs text-purple-700 dark:text-purple-300">Linked Category</span>
                                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                            {goal.linked_category.group_name ? `${goal.linked_category.group_name} / ` : ""}
                                            {goal.linked_category.name}
                                        </p>
                                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                            Expenses in this category count toward this goal
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contributions */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-base font-semibold text-foreground">
                            Contributions
                        </h2>

                        {contributionHistory && contributionHistory.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {contributionHistory.map((contribution) => (
                                    <div
                                        key={contribution._id}
                                        className="flex items-center justify-between py-3 px-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        contribution.source === "expense_linked" ? "secondary" :
                                                            contribution.source === "manual_ui" ? "default" :
                                                                "outline"
                                                    }
                                                    className="text-[10px]"
                                                >
                                                    {contribution.source === "expense_linked" ? "Auto" :
                                                        contribution.source === "manual_ui" ? "Manual" :
                                                            contribution.source}
                                                </Badge>
                                                {contribution.transaction?.account && (
                                                    <span className="text-xs text-muted-foreground">
                                                        from {contribution.transaction.account.name}
                                                    </span>
                                                )}
                                            </div>
                                            {contribution.note && (
                                                <p className="text-xs text-muted-foreground">{contribution.note}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(contribution.contribution_date), "MMM dd, yyyy")}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
                                            +{formatCurrency(contribution.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                No contributions yet. Start saving toward your goal!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
