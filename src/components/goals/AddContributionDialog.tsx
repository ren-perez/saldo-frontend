// components/goals/AddContributionDialog.tsx
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, DollarSign, CreditCard, HandCoins } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Goal } from "@/types/goals"
import { Id } from "../../../convex/_generated/dataModel"
interface AddContributionDialogProps {
    goal: Goal
    open: boolean
    onOpenChange: (open: boolean) => void
    formatCurrency: (amount: number) => string
    onGoalCompleted?: (goal: Goal) => void
}

interface ContributionFormData {
    amount: string
    note: string
    contribution_date: string
    accountId: string | null
    contributionType: 'off-ledger' | 'account-linked'
}

export function AddContributionDialog({
    goal,
    open,
    onOpenChange,
    formatCurrency,
    onGoalCompleted
}: AddContributionDialogProps) {
    const { convexUser } = useConvexUser()
    const [formData, setFormData] = useState<ContributionFormData>({
        amount: '',
        note: '',
        contribution_date: format(new Date(), 'yyyy-MM-dd'),
        accountId: goal.linked_account?._id || null,
        contributionType: goal.linked_account ? 'account-linked' : 'off-ledger'
    })
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    // Fetch available accounts
    const accounts = useQuery(api.goals.getGoalAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    const addContributionMutation = useMutation(api.contributions.createContribution)

    const remainingAmount = Math.max(goal.total_amount - goal.current_amount, 0)
    const contributionAmount = parseFloat(formData.amount) || 0
    const cappedAmount = Math.min(contributionAmount, remainingAmount)
    const newTotal = goal.current_amount + cappedAmount
    const currentProgress = Math.min((goal.current_amount / goal.total_amount) * 100, 100)
    const newProgress = Math.min((newTotal / goal.total_amount) * 100, 100)
    const willComplete = newProgress >= 100 && currentProgress < 100
    const isOverRemaining = contributionAmount > remainingAmount && remainingAmount > 0

    const handleClose = () => {
        setFormData({
            amount: '',
            note: '',
            contribution_date: format(new Date(), 'yyyy-MM-dd'),
            accountId: goal.linked_account?._id || null,
            contributionType: goal.linked_account ? 'account-linked' : 'off-ledger'
        })
        setSelectedDate(new Date())
        onOpenChange(false)
    }

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date)
            setFormData(prev => ({
                ...prev,
                contribution_date: format(date, 'yyyy-MM-dd')
            }))
            setIsCalendarOpen(false)
        }
    }

    const handleFillRemaining = () => {
        setFormData(prev => ({
            ...prev,
            amount: remainingAmount.toFixed(2)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        if (remainingAmount <= 0) {
            toast.error("This goal is already completed")
            return
        }

        if (!convexUser) return

        try {
            const mutationArgs = {
                userId: convexUser._id,
                goalId: goal._id,
                amount: cappedAmount,
                note: formData.note,
                contribution_date: formData.contribution_date,
                source: "manual_ui"
            }

            // Add account ID if creating transaction
            const finalArgs = formData.contributionType === 'account-linked' && formData.accountId
                ? { ...mutationArgs, accountId: formData.accountId as Id<"accounts"> }
                : mutationArgs

            await addContributionMutation(finalArgs)

            if (willComplete) {
                handleClose()
                onGoalCompleted?.(goal)
            } else {
                toast.success("Contribution added successfully!")
                handleClose()
            }
        } catch (error) {
            toast.error("Failed to add contribution. Please try again.")
            console.error("Error adding contribution:", error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="text-2xl">{goal.emoji}</span>
                            Contribute to {goal.name}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Progress Summary */}
                        <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-baseline text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-semibold">
                                    {formatCurrency(goal.current_amount)} / {formatCurrency(goal.total_amount)}
                                </span>
                            </div>
                            <Progress value={currentProgress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{currentProgress.toFixed(0)}% complete</span>
                                <span>{formatCurrency(remainingAmount)} remaining</span>
                            </div>
                        </div>

                        {/* Contribution Type Selection */}
                        <div className="space-y-2">
                            <Label>Contribution Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={formData.contributionType === 'off-ledger' ? 'default' : 'outline'}
                                    className="h-auto p-3 flex flex-col items-center gap-2"
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        contributionType: 'off-ledger',
                                        accountId: null
                                    }))}
                                >
                                    <HandCoins className="h-5 w-5" />
                                    <span className="text-sm">Cash/Manual</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant={formData.contributionType === 'account-linked' ? 'default' : 'outline'}
                                    className="h-auto p-3 flex flex-col items-center gap-2"
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        contributionType: 'account-linked',
                                        accountId: goal.linked_account?._id || null
                                    }))}
                                >
                                    <CreditCard className="h-5 w-5" />
                                    <span className="text-sm">From Account</span>
                                </Button>
                            </div>
                        </div>

                        {/* Account Selection */}
                        {formData.contributionType === 'account-linked' && (
                            <div className="space-y-2">
                                <Label htmlFor="account">Select Account *</Label>
                                <Select
                                    value={formData.accountId || ''}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, accountId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose an account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts?.map((account) => (
                                            <SelectItem key={account._id} value={account._id}>
                                                {account.name} ({account.account_type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    This will create a transaction in the selected account
                                </p>
                            </div>
                        )}

                        {/* Amount Input */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="amount">Amount *</Label>
                                {remainingAmount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleFillRemaining}
                                        className="text-xs text-primary hover:underline cursor-pointer"
                                    >
                                        Fill remaining ({formatCurrency(remainingAmount)})
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={remainingAmount > 0 ? remainingAmount : undefined}
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    className="pl-10"
                                    required
                                />
                            </div>
                            {isOverRemaining && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Amount will be capped to {formatCurrency(remainingAmount)} (remaining balance)
                                </p>
                            )}
                        </div>

                        {/* Date Input */}
                        <div className="space-y-2">
                            <Label htmlFor="contribution_date">Date *</Label>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={handleDateSelect}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Note Input */}
                        <div className="space-y-2">
                            <Label htmlFor="note">Note (Optional)</Label>
                            <Textarea
                                id="note"
                                placeholder="Add a note about this contribution..."
                                value={formData.note}
                                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                                rows={2}
                            />
                        </div>

                        {/* Preview */}
                        {cappedAmount > 0 && (
                            <div className={cn(
                                "rounded-lg p-4 space-y-3 border",
                                willComplete
                                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                                    : "bg-muted/30 border-border"
                            )}>
                                <div className="flex justify-between items-baseline text-sm">
                                    <span className="text-muted-foreground">After contribution</span>
                                    <span className={cn(
                                        "font-semibold",
                                        willComplete && "text-emerald-700 dark:text-emerald-400"
                                    )}>
                                        {newProgress.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="relative">
                                    <Progress value={currentProgress} className="h-2" />
                                    <div
                                        className="absolute top-0 left-0 h-2 rounded-full bg-emerald-500/40 dark:bg-emerald-400/40 transition-all duration-300"
                                        style={{ width: `${newProgress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>+{formatCurrency(cappedAmount)}</span>
                                    <span>{formatCurrency(Math.max(goal.total_amount - newTotal, 0))} left</span>
                                </div>
                                {willComplete && (
                                    <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                        This contribution completes your goal!
                                    </p>
                                )}
                            </div>
                        )}

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !formData.amount ||
                                    parseFloat(formData.amount) <= 0 ||
                                    remainingAmount <= 0 ||
                                    (formData.contributionType === 'account-linked' && !formData.accountId)
                                }
                            >
                                {willComplete ? "Complete Goal" : "Add Contribution"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
    )
}
