// components/goals/GoalWithdrawalDialog.tsx
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { DollarSign, TrendingDown, AlertCircle, CreditCard } from "lucide-react"
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
    note: string
    createTransaction: boolean
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
        note: '',
        createTransaction: !!goal?.linked_account
    })

    const withdrawMutation = useMutation(api.contributions.withdrawFromGoal)

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open && goal) {
            setFormData({
                amount: '',
                note: '',
                createTransaction: !!goal.linked_account
            })
        }
    }, [open, goal])

    const handleClose = () => {
        setFormData({
            amount: '',
            note: '',
            createTransaction: false
        })
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!goal || !convexUser) return

        const withdrawalAmount = parseFloat(formData.amount)
        if (withdrawalAmount <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        if (withdrawalAmount > goal.current_amount) {
            toast.error("Withdrawal amount exceeds available balance")
            return
        }

        try {
            await withdrawMutation({
                userId: convexUser._id,
                goalId: goal._id,
                amount: withdrawalAmount,
                createTransaction: formData.createTransaction,
                note: formData.note || undefined
            })

            toast.success("Withdrawal completed successfully!")
            handleClose()
        } catch (error) {
            toast.error("Failed to complete withdrawal. Please try again.")
            console.error("Error withdrawing from goal:", error)
        }
    }

    const withdrawalAmount = parseFloat(formData.amount) || 0
    const remainingBalance = (goal?.current_amount || 0) - withdrawalAmount
    const isValidAmount = withdrawalAmount > 0 && withdrawalAmount <= (goal?.current_amount || 0)

    if (!goal) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5" />
                        Withdraw from {goal.emoji} {goal.name}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Goal Balance Summary */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Current Balance:</span>
                            <span className="font-medium">
                                {formatCurrency(goal.current_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Goal Target:</span>
                            <span className="text-muted-foreground">
                                {formatCurrency(goal.total_amount)}
                            </span>
                        </div>
                        {withdrawalAmount > 0 && (
                            <div className="flex justify-between text-sm border-t pt-2">
                                <span>After Withdrawal:</span>
                                <span className={`font-medium ${remainingBalance < 0 ? 'text-red-600' : ''}`}>
                                    {formatCurrency(remainingBalance)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Linked Account Info */}
                    {goal.linked_account && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <CreditCard className="h-4 w-4" />
                                <span className="font-medium">Linked Account</span>
                            </div>
                            <p className="text-blue-600 text-xs mt-1">
                                This goal is linked to {goal.linked_account.name}. You can create a withdrawal transaction.
                            </p>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Withdrawal Amount *</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                        {withdrawalAmount > goal.current_amount && (
                            <div className="flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                Amount exceeds available balance
                            </div>
                        )}
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                                ...prev,
                                amount: (goal.current_amount * 0.25).toFixed(2)
                            }))}
                        >
                            25%
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                                ...prev,
                                amount: (goal.current_amount * 0.5).toFixed(2)
                            }))}
                        >
                            50%
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                                ...prev,
                                amount: goal.current_amount.toFixed(2)
                            }))}
                        >
                            All
                        </Button>
                    </div>

                    {/* Create Transaction Option */}
                    {goal.linked_account && (
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                                <Label htmlFor="createTransaction" className="text-sm font-medium">
                                    Create Account Transaction
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Create a withdrawal transaction in {goal.linked_account.name}
                                </p>
                            </div>
                            <Checkbox
                                id="createTransaction"
                                checked={formData.createTransaction}
                                onCheckedChange={(checked: boolean) => setFormData(prev => ({
                                    ...prev,
                                    createTransaction: checked
                                }))}
                            />
                        </div>
                    )}

                    {/* Note Input */}
                    <div className="space-y-2">
                        <Label htmlFor="note">Reason for Withdrawal (Optional)</Label>
                        <Textarea
                            id="note"
                            placeholder="Why are you withdrawing from this goal?"
                            value={formData.note}
                            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                            rows={3}
                        />
                    </div>

                    {/* Impact Warning */}
                    {withdrawalAmount > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <div className="text-sm font-medium text-yellow-800 mb-2">
                                Impact on Goal Progress:
                            </div>
                            <div className="text-sm text-yellow-700 space-y-1">
                                <div className="flex justify-between">
                                    <span>Current Progress:</span>
                                    <span>{((goal.current_amount / goal.total_amount) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>After Withdrawal:</span>
                                    <span>{((remainingBalance / goal.total_amount) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between font-medium border-t pt-1">
                                    <span>Progress Change:</span>
                                    <span className="text-red-600">
                                        -{(((withdrawalAmount) / goal.total_amount) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
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