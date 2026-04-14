// components/goals/GoalWithdrawalDialog.tsx
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, TrendingDown, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Goal } from "@/types/goals"

interface GoalWithdrawalDialogProps {
    goal: Goal | null
    open: boolean
    onOpenChange: (open: boolean) => void
    formatCurrency: (amount: number) => string
}

interface WithdrawalFormData {
    amount: string
    date: string
    note: string
}

function todayISODate(): string {
    return new Date().toISOString().split('T')[0]
}

export function GoalWithdrawalDialog({
    goal,
    open,
    onOpenChange,
    formatCurrency
}: GoalWithdrawalDialogProps) {
    const { convexUser } = useConvexUser()
    const [formData, setFormData] = useState<WithdrawalFormData>({
        amount: '',
        date: todayISODate(),
        note: '',
    })

    const withdrawMutation = useMutation(api.contributions.withdrawFromGoal)

    useEffect(() => {
        if (open && goal) {
            setFormData({ amount: '', date: todayISODate(), note: '' })
        }
    }, [open, goal])

    const handleClose = () => {
        setFormData({ amount: '', date: todayISODate(), note: '' })
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!goal || !convexUser) return

        const withdrawalAmount = parseFloat(formData.amount)

        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            toast.error("Please enter a valid amount greater than 0")
            return
        }

        if (withdrawalAmount > goal.current_amount) {
            toast.error("Withdrawal exceeds current goal balance.")
            return
        }

        try {
            await withdrawMutation({
                userId: convexUser._id,
                goalId: goal._id,
                amount: withdrawalAmount,
                date: formData.date,
                note: formData.note || undefined,
            })

            toast.success("Withdrawal completed successfully!")
            handleClose()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to complete withdrawal."
            toast.error(message)
            console.error("Error withdrawing from goal:", error)
        }
    }

    const withdrawalAmount = parseFloat(formData.amount) || 0
    const remainingBalance = (goal?.current_amount || 0) - withdrawalAmount
    const isOverdraw = withdrawalAmount > 0 && withdrawalAmount > (goal?.current_amount || 0)
    const isValidAmount = withdrawalAmount > 0 && !isOverdraw

    if (!goal) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-amber-500" />
                        Withdraw from {goal.emoji} {goal.name}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Goal Balance Summary */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Current Balance:</span>
                            <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Goal Target:</span>
                            <span className="text-muted-foreground">{formatCurrency(goal.total_amount)}</span>
                        </div>
                        {withdrawalAmount > 0 && (
                            <div className="flex justify-between text-sm border-t pt-2">
                                <span>After Withdrawal:</span>
                                <span className={`font-medium ${isOverdraw ? 'text-red-600' : ''}`}>
                                    {formatCurrency(remainingBalance)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Withdrawal Amount *</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={goal.current_amount}
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                className="pl-10"
                                required
                            />
                        </div>
                        {isOverdraw && (
                            <div className="flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                Withdrawal exceeds current goal balance.
                            </div>
                        )}
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        {[0.25, 0.5, 1].map((pct) => (
                            <Button
                                key={pct}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    amount: (goal.current_amount * pct).toFixed(2)
                                }))}
                            >
                                {pct === 1 ? 'All' : `${pct * 100}%`}
                            </Button>
                        ))}
                    </div>

                    {/* Date Input */}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            required
                        />
                    </div>

                    {/* Note Input */}
                    <div className="space-y-2">
                        <Label htmlFor="note">Reason for Withdrawal (Optional)</Label>
                        <Textarea
                            id="note"
                            placeholder="Why are you withdrawing from this goal?"
                            value={formData.note}
                            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                            rows={2}
                        />
                    </div>

                    {/* Progress Impact */}
                    {withdrawalAmount > 0 && !isOverdraw && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                            <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                                Impact on Goal Progress:
                            </div>
                            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                <div className="flex justify-between">
                                    <span>Current Progress:</span>
                                    <span>{((goal.current_amount / goal.total_amount) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>After Withdrawal:</span>
                                    <span>{((remainingBalance / goal.total_amount) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between font-medium border-t border-amber-300 dark:border-amber-700 pt-1">
                                    <span>Progress Change:</span>
                                    <span className="text-red-600 dark:text-red-400">
                                        -{((withdrawalAmount / goal.total_amount) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={!isValidAmount}
                        >
                            Withdraw Funds
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
