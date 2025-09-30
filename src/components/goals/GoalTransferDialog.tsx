// components/goals/GoalTransferDialog.tsx
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, ArrowRightLeft, AlertCircle, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Goal } from "@/types/goals"
import { Id } from "../../../convex/_generated/dataModel"

interface GoalTransferDialogProps {
    sourceGoal: Goal | null
    open: boolean
    onOpenChange: (open: boolean) => void
    formatCurrency: (amount: number) => string
}

interface TransferFormData {
    toGoalId: Id<"goals"> | ""
    amount: string
    note: string
    createTransactions: boolean
}

export function GoalTransferDialog({
    sourceGoal,
    open,
    onOpenChange,
    formatCurrency
}: GoalTransferDialogProps) {
    const { convexUser } = useConvexUser()
    const [formData, setFormData] = useState<TransferFormData>({
        toGoalId: '',
        amount: '',
        note: '',
        createTransactions: false
    })

    // Fetch available goals for transfer (excluding source goal)
    const allGoals = useQuery(api.goals.getGoals,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    const transferMutation = useMutation(api.contributions.transferBetweenGoals)

    // Filter out the source goal from available targets
    const availableGoals = allGoals?.filter(goal => goal._id !== sourceGoal?._id) || []

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setFormData({
                toGoalId: '',
                amount: '',
                note: '',
                createTransactions: false
            })
        }
    }, [open])

    // Check if this would be a cross-account transfer
    const selectedGoal = availableGoals.find(goal => goal._id === formData.toGoalId)
    const isCrossAccount = sourceGoal?.linked_account?._id !== selectedGoal?.linked_account?._id &&
                          sourceGoal?.linked_account && selectedGoal?.linked_account

    const handleClose = () => {
        setFormData({
            toGoalId: '',
            amount: '',
            note: '',
            createTransactions: false
        })
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!sourceGoal || !convexUser) return

        const transferAmount = parseFloat(formData.amount)
        if (transferAmount <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        if (transferAmount > sourceGoal.current_amount) {
            toast.error("Transfer amount exceeds available balance")
            return
        }

        if (!formData.toGoalId) {
            toast.error("Please select a destination goal")
            return
        }

        try {
            await transferMutation({
                userId: convexUser._id,
                fromGoalId: sourceGoal._id,
                toGoalId: formData.toGoalId as Id<"goals">,
                amount: transferAmount,
                note: formData.note || undefined,
                createTransactions: formData.createTransactions
            })

            toast.success("Transfer completed successfully!")
            handleClose()
        } catch (error) {
            toast.error("Failed to complete transfer. Please try again.")
            console.error("Error transferring between goals:", error)
        }
    }

    const transferAmount = parseFloat(formData.amount) || 0
    const remainingBalance = (sourceGoal?.current_amount || 0) - transferAmount
    const isValidAmount = transferAmount > 0 && transferAmount <= (sourceGoal?.current_amount || 0)

    if (!sourceGoal) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5" />
                        Transfer from {sourceGoal.emoji} {sourceGoal.name}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Source Goal Summary */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Current Balance:</span>
                            <span className="font-medium">
                                {formatCurrency(sourceGoal.current_amount)}
                            </span>
                        </div>
                        {transferAmount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span>After Transfer:</span>
                                <span className={`font-medium ${remainingBalance < 0 ? 'text-red-600' : ''}`}>
                                    {formatCurrency(remainingBalance)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Destination Goal Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="toGoal">Transfer To *</Label>
                        <Select
                            value={formData.toGoalId}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, toGoalId: value as Id<"goals"> | "" }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select destination goal" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableGoals.map((goal) => (
                                    <SelectItem key={goal._id} value={goal._id}>
                                        <div className="flex items-center gap-2">
                                            <span>{goal.emoji}</span>
                                            <span>{goal.name}</span>
                                            <span className="text-muted-foreground text-xs">
                                                ({formatCurrency(goal.current_amount)}/{formatCurrency(goal.total_amount)})
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Cross-Account Transfer Warning */}
                    {isCrossAccount && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <CreditCard className="h-4 w-4" />
                                <span className="font-medium">Cross-Account Transfer</span>
                            </div>
                            <p className="text-blue-600 text-xs mt-1">
                                This transfer is between different accounts. You can optionally create actual transactions.
                            </p>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Transfer Amount *</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={sourceGoal.current_amount}
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                className="pl-10"
                                required
                            />
                        </div>
                        {transferAmount > sourceGoal.current_amount && (
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
                                amount: (sourceGoal.current_amount * 0.25).toFixed(2)
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
                                amount: (sourceGoal.current_amount * 0.5).toFixed(2)
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
                                amount: sourceGoal.current_amount.toFixed(2)
                            }))}
                        >
                            All
                        </Button>
                    </div>

                    {/* Create Transactions Option */}
                    {isCrossAccount && (
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                                <Label htmlFor="createTransactions" className="text-sm font-medium">
                                    Create Account Transactions
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Create withdrawal/deposit transactions in the linked accounts
                                </p>
                            </div>
                            <Checkbox
                                id="createTransactions"
                                checked={formData.createTransactions}
                                onCheckedChange={(checked: boolean) => setFormData(prev => ({
                                    ...prev,
                                    createTransactions: checked
                                }))}
                            />
                        </div>
                    )}

                    {/* Note Input */}
                    <div className="space-y-2">
                        <Label htmlFor="note">Note (Optional)</Label>
                        <Textarea
                            id="note"
                            placeholder="Add a note about this transfer..."
                            value={formData.note}
                            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                            rows={3}
                        />
                    </div>

                    {/* Transfer Preview */}
                    {selectedGoal && transferAmount > 0 && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                            <div className="text-sm font-medium text-green-800">Transfer Preview:</div>
                            <div className="text-sm text-green-700">
                                <div className="flex justify-between">
                                    <span>From: {sourceGoal.emoji} {sourceGoal.name}</span>
                                    <span>-{formatCurrency(transferAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>To: {selectedGoal.emoji} {selectedGoal.name}</span>
                                    <span>+{formatCurrency(transferAmount)}</span>
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
                            disabled={!isValidAmount || !formData.toGoalId}
                        >
                            Transfer Funds
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}