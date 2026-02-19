// components/goals/GoalCardItem.tsx
import { Calendar, DollarSign, MoreVertical, Edit, Trash2, Eye, Target, Pencil, ArrowRightLeft, TrendingDown, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { GoalCard, GoalCardHeader, GoalCardContent, GoalCardFooter } from "@/components/goals/goal-card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { toast } from "sonner"
import { EnhancedImage } from "@/components/enhanced-image"
import { useState } from "react"
import { AddContributionDialog } from "@/components/goals/AddContributionDialog"
import { GoalTransferDialog } from "@/components/goals/GoalTransferDialog"
import { GoalWithdrawalDialog } from "@/components/goals/GoalWithdrawalDialog"
import { Goal } from "@/types/goals"

interface GoalCardItemProps {
    goal: Goal
    onEditGoal: (goal: Goal) => void
    formatCurrency: (amount: number) => string
    formatDate: (dateString?: string) => string | null
    getProgressPercentage: (current: number, target: number) => number
    onGoalCompleted?: (goal: Goal) => void
}

const priorityColors = {
    1: "bg-red-100 text-red-700 dark:bg-red-950/85 dark:text-red-300",
    2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/85 dark:text-yellow-300",
    3: "bg-green-100 text-green-700 dark:bg-green-950/85 dark:text-green-300",
}

export function GoalCardItem({
    goal,
    onEditGoal,
    formatCurrency,
    formatDate,
    getProgressPercentage,
    onGoalCompleted
}: GoalCardItemProps) {
    const { convexUser } = useConvexUser()
    const deleteGoalMutation = useMutation(api.goals.deleteGoal)
    const [showAddContribution, setShowAddContribution] = useState(false)
    const [showTransferDialog, setShowTransferDialog] = useState(false)
    const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false)

    const progressPercentage = getProgressPercentage(goal.current_amount || 0, goal.total_amount);

    const handleDeleteGoal = async () => {
        const confirmed = window.confirm(`Are you sure you want to delete "${goal.name}"? This action cannot be undone.`)

        if (!confirmed || !convexUser) return

        try {
            await deleteGoalMutation({
                userId: convexUser._id,
                goalId: goal._id
            })
            toast.success("Goal deleted successfully")
        } catch (error) {
            toast.error("Failed to delete goal. Please try again.")
            console.error("Error deleting goal:", error)
        }
    }

    return (
        <>
            <GoalCard>

                <GoalCardHeader>
                    <div className="relative h-48 w-full">
                        {goal.image_url ? (
                            <>
                                <EnhancedImage
                                    src={goal.image_url}
                                    alt={goal.name}
                                    width={300}
                                    height={200}
                                />
                                {goal.color && (
                                    <div
                                        className="absolute inset-0 rounded-t-xl pointer-events-none"
                                        // style={{
                                        //     background: `linear-gradient(to top, ${goal.color}40 0%, transparent 40%)`,
                                        // }}
                                    />
                                )}
                            </>
                        ) : (
                            <div
                                className="absolute inset-0 rounded-t-lg flex items-center justify-center"
                                style={{
                                    background: goal.color
                                        ? `linear-gradient(135deg, ${goal.color}90 0%, ${goal.color}50 100%)`
                                        : undefined,
                                }}
                            >
                                <div className="text-6xl z-10">{goal.emoji}</div>
                            </div>
                        )}

                        <div className="absolute top-3 left-3 z-20">
                            <Badge
                                variant="secondary"
                                className={`${goal.is_completed
                                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        : priorityColors[goal.priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    }`}
                            >
                                {goal.is_completed ? "Completed" : goal.priority_label}
                            </Badge>
                        </div>

                        <div className="absolute top-3 right-3 z-20">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0 bg-background/20 hover:bg-background hover:cursor-pointer">
                                        <span className="sr-only">Open menu</span>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEditGoal(goal)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Goal
                                    </DropdownMenuItem>
                                    {!goal.is_completed && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setShowAddContribution(true)}>
                                                <DollarSign className="h-4 w-4 mr-2" />
                                                Add Contribution
                                            </DropdownMenuItem>
                                            {(goal.current_amount > 0) && (
                                                <DropdownMenuItem onClick={() => setShowTransferDialog(true)}>
                                                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                                                    Transfer Funds
                                                </DropdownMenuItem>
                                            )}
                                            {(goal.current_amount > 0) && (
                                                <DropdownMenuItem onClick={() => setShowWithdrawalDialog(true)}>
                                                    <TrendingDown className="h-4 w-4 mr-2" />
                                                    Withdraw Funds
                                                </DropdownMenuItem>
                                            )}
                                        </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <Link href={`/goals/${goal._id}`}>
                                        <DropdownMenuItem>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Details
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDeleteGoal} className="text-red-600 hover:text-red-800">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Goal
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </GoalCardHeader>

                <GoalCardContent>
                    <div className="space-y-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-2">
                                <Link href={`/goals/${goal._id}`}>
                                    <div className="flex items-end cursor-pointer hover:opacity-80 transition-opacity">
                                        {goal.emoji && (
                                            <span className="text-2xl mr-2">{goal.emoji}</span>
                                        )}
                                        <h3 className="font-semibold text-lg">{goal.name}</h3>
                                    </div>
                                </Link>
                                {goal.note ?
                                    (
                                        <p className="text-sm text-muted-foreground italic line-clamp-2">{goal.note}</p>
                                    ) :
                                    (
                                        <p
                                            className="flex items-center text-sm mt-1 text-muted-foreground italic cursor-pointer hover:text-foreground transition-colors"
                                            onClick={() => onEditGoal(goal)}
                                        >
                                            <Pencil className="inline-block w-3 h-3 mr-2" />
                                            Add a note
                                        </p>
                                    )
                                }
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="pt-4 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                {/* <span className="text-muted-foreground">Progress</span> */}
                                <span className="text-muted-foreground">
                                    {formatCurrency(Math.ceil(goal.current_amount || 0))} / {formatCurrency(Math.ceil(goal.total_amount))}
                                </span>
                                <span className="font-medium">{formatCurrency(Math.ceil(goal.total_amount) - Math.ceil(goal.current_amount || 0))} left</span>

                            </div>
                            <Progress
                                value={progressPercentage}
                                className="h-2"
                                style={goal.color ? { backgroundColor: `${goal.color}20` } : undefined}
                                indicatorStyle={goal.color ? {
                                    backgroundColor: goal.color,
                                    boxShadow: `0 0 8px ${goal.color}`,
                                } : undefined}
                            />
                            <div className="text-left text-xs text-muted-foreground">
                                {progressPercentage.toFixed(1)}%
                            </div>
                        </div>

                    </div>
                </GoalCardContent>

                <GoalCardFooter>
                    <div className="flex flex-col gap-4 mt-2">
                        {/* Due date */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {goal.due_date ? (
                                <span>Due: {formatDate(goal.due_date)}</span>
                            ) : (
                                <span>No due date</span>
                            )}
                        </div>

                        {goal.monthly_contribution > 0 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Target className="h-4 w-4" />
                                <span>Target: {formatCurrency(Math.ceil(goal.monthly_contribution))}/month</span>
                            </div>
                        )}

                        {/* Monthly Plans Pills */}
                        {/* {goal.monthly_plans && goal.monthly_plans.length > 0 && (
                            <div className="w-full mb-4">
                                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                    <NotebookText className="h-4 w-4" />
                                    <span className="text-sm">Plans assigned to:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {goal.monthly_plans.map((plan) => (
                                        <Button
                                            key={plan.id}
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-2 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                        >
                                            <Link href={`/plans/${plan.id}`}>
                                                {plan.month} {plan.year}
                                            </Link>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )} */}

                        {/* Account Tracking */}
                        {goal.linked_account && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="h-2 w-2 bg-green-500 rounded-full mx-1" />
                                <span>Linked to {goal.linked_account.name}</span>
                            </div>
                        )}

                        {/* Category Tracking */}
                        {goal.linked_category && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="h-2 w-2 bg-pink-500 rounded-full mx-1" />
                                <span>
                                    {/* Linked to {goal.linked_category.group_name ? `${goal.linked_category.group_name} → ` : ""} */}
                                    Linked to {goal.linked_category.group_name ? `${goal.linked_category.group_name}` : ""}
                                    {/* {goal.linked_category.name} */}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span>{goal.linked_category.name}</span>
                            </div>
                        )}

                        {goal.tracking_type === "MANUAL" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="h-2 w-2 bg-gray-500 rounded-full mx-1" />
                                <span>Manual tracking</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!goal.is_completed && (
                            <div className="flex gap-2 w-full mt-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="flex-1 gap-1"
                                    onClick={() => setShowAddContribution(true)}
                                >
                                    <DollarSign className="h-3 w-3" />
                                    Add Contribution
                                </Button>
                                {goal.current_amount > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1"
                                        onClick={() => setShowTransferDialog(true)}
                                    >
                                        <ArrowRightLeft className="h-3 w-3" />
                                        Transfer
                                    </Button>
                                )}
                            </div>
                        )}

                    </div>
                </GoalCardFooter>
            </GoalCard>

            <AddContributionDialog
                goal={goal}
                open={showAddContribution}
                onOpenChange={setShowAddContribution}
                formatCurrency={formatCurrency}
                onGoalCompleted={onGoalCompleted}
            />

            <GoalTransferDialog
                sourceGoal={goal}
                open={showTransferDialog}
                onOpenChange={setShowTransferDialog}
                formatCurrency={formatCurrency}
            />

            <GoalWithdrawalDialog
                goal={goal}
                open={showWithdrawalDialog}
                onOpenChange={setShowWithdrawalDialog}
                formatCurrency={formatCurrency}
            />
        </>
    )
}