"use client"

import { use, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Calendar, TrendingUp, Target, HandCoins, CreditCard, TrendingDown, ArrowRightLeft, ArrowUpDown, MoreVertical, Edit, Trash2, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Id } from "../../../../convex/_generated/dataModel"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { GoalActionDialog } from "@/components/goals/GoalActionDialog"
import { GoalDialog } from "@/components/goals/GoalDialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import type { Goal } from "@/types/goals"

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const goalId = resolvedParams.id as Id<"goals">
    const { convexUser } = useConvexUser()

    const goals = useQuery(
        api.goals.getGoals,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")

    const contributionHistory = useQuery(
        api.contributions.getContributionHistory,
        convexUser ? { userId: convexUser._id, goalId, sortOrder } : "skip"
    )

    const contributionAnalytics = useQuery(
        api.contributions.getContributionAnalytics,
        convexUser ? { userId: convexUser._id, goalId, timeframe: "all" } : "skip"
    )

    const goal = goals?.find(g => g._id === goalId)
    const [showActionDialog, setShowActionDialog] = useState(false)
    const [showGoalDialog, setShowGoalDialog] = useState(false)
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
    const deleteGoalMutation = useMutation(api.goals.deleteGoal)

    const handleEditGoal = () => {
        if (!goal) return
        setEditingGoal(goal as unknown as Goal)
        setShowGoalDialog(true)
    }

    const handleDeleteGoal = async () => {
        if (!convexUser || !goal) return
        const confirmed = window.confirm(`Are you sure you want to delete "${goal.name}"? This action cannot be undone.`)
        if (!confirmed) return
        try {
            await deleteGoalMutation({ userId: convexUser._id, goalId: goal._id })
            toast.success("Goal deleted successfully")
        } catch {
            toast.error("Failed to delete goal. Please try again.")
        }
    }

    const handleUpdateGoal = async () => {
        setShowGoalDialog(false)
        setEditingGoal(null)
    }

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
            return { icon: <HandCoins className="h-3.5 w-3.5" />, label: "Manual", className: "" }
        } else if (goal.tracking_type === "LINKED_ACCOUNT") {
            const label = goal.linked_account
                ? `${goal.linked_account.name} (${goal.linked_account.account_type})`
                : "From Account"
            return { icon: <CreditCard className="h-3.5 w-3.5" />, label, className: "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300" }
        }
        return { icon: null, label: "Unknown", className: "" }
    }

    const trackingDisplay = getTrackingTypeDisplay()
    const headerImage = goal.image_url

    return (
        <AppLayout>
            <InitUser />
            <div className="mx-auto w-full overflow-hidden ">
            <div className="relative w-full h-[280px] lg:h-[320px] bg-gradient-to-br from-muted/60 via-muted/30 to-background overflow-hidden">
                {headerImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={headerImage}
                        alt={goal.name}
                        className="w-full h-full object-cover object-center"
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
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                <div className="absolute top-4 left-4">
                    <Link href="/goals">
                        <Button variant="secondary" size="sm" className="backdrop-blur-sm bg-background/70 hover:bg-background/90 shadow-sm">
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                            Goals
                        </Button>
                    </Link>
                </div>

                <div className="absolute top-4 right-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" className="backdrop-blur-sm bg-background/70 hover:bg-background/90 shadow-sm h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleEditGoal}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Goal
                            </DropdownMenuItem>
                            {!goal.is_completed && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowActionDialog(true)}>
                                        <ArrowUpDown className="h-4 w-4 mr-2" />
                                        Move Money
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDeleteGoal} className="text-red-600 hover:text-red-800">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Goal
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

                <div className="relative -mt-16 px-6 pb-12">
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
                            <Badge variant="outline" className={`gap-1 text-xs ${trackingDisplay.className}`}>
                                {trackingDisplay.icon}
                                {trackingDisplay.label}
                            </Badge>
                            {goal.is_completed && (
                                <Badge className="bg-green-600 text-white text-xs">Completed</Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 mb-10">
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

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-foreground">Activity</h2>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1 text-muted-foreground"
                                    onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                                >
                                    {sortOrder === "desc" ? (
                                        <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                                    ) : (
                                        <ArrowUpWideNarrow className="h-3.5 w-3.5" />
                                    )}
                                    {sortOrder === "desc" ? "Newest" : "Oldest"}
                                </Button>
                                {!goal.is_completed && (
                                    <Button size="sm" variant="secondary" className="gap-1.5"
                                        onClick={() => setShowActionDialog(true)}>
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                        Move Money
                                    </Button>
                                )}
                            </div>
                        </div>

                        {contributionHistory && contributionHistory.length > 0 ? (
                            <div className="relative">
                                {(() => {
                                    const groups = contributionHistory.reduce((acc: Record<string, typeof contributionHistory>, c) => {
                                        const key = (c.contribution_date as string).slice(0, 7)
                                        if (!acc[key]) acc[key] = []
                                        acc[key].push(c)
                                        return acc
                                    }, {})

                                    const sourceLabel: Record<string, string> = {
                                        manual_ui: "Manual",
                                        manual_tx: "Transaction",
                                        import: "Import",
                                        auto: "Auto",
                                    }

                                    return Object.entries(groups).map(([monthKey, items], _groupIdx) => {
                                        const date = new Date(monthKey + "-01")
                                        const monthLabel = format(date, "MMMM yyyy")

                                        return (
                                            <div key={monthKey} className="relative">
                                                <div className="flex items-center gap-3 mb-4 mt-2 first:mt-0">
                                                    <div className="h-2.5 w-2.5 rounded-full bg-primary/30 shrink-0" />
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        {monthLabel}
                                                    </span>
                                                    <div className="flex-1 h-px bg-border" />
                                                </div>

                                                <div className="relative ml-5 pl-5 border-l-2 border-border/50 space-y-2 pb-4">
                                                    {items.map((contribution) => {
                                                        const isWithdrawal = contribution.is_withdrawal || contribution.amount < 0
                                                        const isTransfer = !!contribution.transfer_pair_id
                                                        const absAmount = Math.abs(contribution.amount as number)

                                                        const icon = isWithdrawal
                                                            ? <TrendingDown className="h-4 w-4 text-amber-500 shrink-0" />
                                                            : isTransfer
                                                                ? <ArrowRightLeft className="h-4 w-4 text-blue-500 shrink-0" />
                                                                : <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />

                                                        const amountColor = isWithdrawal
                                                            ? "text-amber-600 dark:text-amber-400"
                                                            : "text-emerald-600 dark:text-emerald-400"

                                                        const amountPrefix = isWithdrawal ? "−" : "+"

                                                        const typeLabel = isWithdrawal
                                                            ? "Withdrawal"
                                                            : isTransfer
                                                                ? (contribution.amount >= 0 ? "Transfer In" : "Transfer Out")
                                                                : "Contribution"

                                                        return (
                                                            <div key={contribution._id} className="relative flex items-start gap-3 py-2.5 px-3.5 rounded-lg border border-border hover:bg-muted/30 transition-colors group">
                                                                <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40 ring-2 ring-background shrink-0" />
                                                                {icon}
                                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-sm font-medium">{typeLabel}</span>
                                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                            {sourceLabel[contribution.source as string] ?? contribution.source}
                                                                        </Badge>
                                                                        {contribution.transaction?.account && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                · {contribution.transaction.account.name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {contribution.note && (
                                                                        <p className="text-xs text-muted-foreground italic">{contribution.note as string}</p>
                                                                    )}
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {format(new Date(contribution.contribution_date as string), "MMM dd, yyyy")}
                                                                    </p>
                                                                </div>
                                                                <span className={`text-sm font-semibold tabular-nums shrink-0 ${amountColor}`}>
                                                                    {amountPrefix}{formatCurrency(absAmount)}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                No activity yet. Use &quot;Move Money&quot; to start saving!
                            </div>
                        )}
                    </div>

                    <GoalActionDialog
                        goal={goal}
                        open={showActionDialog}
                        onOpenChange={setShowActionDialog}
                        formatCurrency={formatCurrency}
                    />

                    <GoalDialog
                        open={showGoalDialog}
                        onOpenChange={(open) => { if (!open) { setShowGoalDialog(false); setEditingGoal(null) } }}
                        onCreateGoal={() => {}}
                        onUpdateGoal={handleUpdateGoal}
                        editingGoal={editingGoal}
                        mode="edit"
                    />
                </div>
            </div>
        </AppLayout>
    )
}
