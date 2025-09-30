// components/goals/TransactionAllocationDialog.tsx
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, Plus, X, Target, Calendar, AlertCircle, Link as LinkIcon } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Id } from "../../../convex/_generated/dataModel"

interface Transaction {
    _id: string
    amount: number
    description: string
    date: number
    account?: {
        _id: string
        name: string
        type: string
    }
}


interface AllocationItem {
    goalId: Id<"goals"> | ""
    amount: string
    note: string
}

interface TransactionAllocationDialogProps {
    transaction: Transaction | null
    open: boolean
    onOpenChange: (open: boolean) => void
    formatCurrency: (amount: number) => string
}

export function TransactionAllocationDialog({
    transaction,
    open,
    onOpenChange,
    formatCurrency
}: TransactionAllocationDialogProps) {
    const { convexUser } = useConvexUser()
    const [allocations, setAllocations] = useState<AllocationItem[]>([])

    // Fetch available goals for allocation
    const goals = useQuery(api.contributions.getGoalsForAllocation,
        convexUser && transaction ? {
            userId: convexUser._id,
            accountId: transaction.account?._id as Id<"accounts"> | undefined
        } : "skip"
    )

    const allocateTransactionMutation = useMutation(api.contributions.allocateTransactionToGoals)

    // Initialize with single empty allocation
    useEffect(() => {
        if (open && transaction) {
            setAllocations([{
                goalId: '',
                amount: transaction.amount.toString(),
                note: ''
            }])
        }
    }, [open, transaction])

    const handleClose = () => {
        setAllocations([])
        onOpenChange(false)
    }

    const addAllocation = () => {
        setAllocations(prev => [...prev, {
            goalId: '',
            amount: '',
            note: ''
        }])
    }

    const removeAllocation = (index: number) => {
        setAllocations(prev => prev.filter((_, i) => i !== index))
    }

    const updateAllocation = (index: number, field: keyof AllocationItem, value: string) => {
        setAllocations(prev => prev.map((allocation, i) =>
            i === index ? { ...allocation, [field]: value } : allocation
        ))
    }

    const totalAllocated = allocations.reduce((sum, allocation) =>
        sum + (parseFloat(allocation.amount) || 0), 0
    )

    const remainingAmount = (transaction?.amount || 0) - totalAllocated
    const isValid = Math.abs(remainingAmount) < 0.01 &&
                   allocations.length > 0 &&
                   allocations.every(a => a.goalId && parseFloat(a.amount) > 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!transaction || !convexUser || !isValid) return

        try {
            const allocationData = allocations.map(allocation => ({
                goalId: allocation.goalId as Id<"goals">,
                amount: parseFloat(allocation.amount),
                note: allocation.note || undefined
            }))

            await allocateTransactionMutation({
                userId: convexUser._id,
                transactionId: transaction._id as Id<"transactions">,
                allocations: allocationData
            })

            toast.success("Transaction allocated successfully!")
            handleClose()
        } catch (error) {
            toast.error("Failed to allocate transaction. Please try again.")
            console.error("Error allocating transaction:", error)
        }
    }

    if (!transaction) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Allocate Transaction to Goals
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Transaction Summary */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="font-medium">{transaction.description}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    {format(new Date(transaction.date), 'MMM d, yyyy')}
                                </div>
                                {transaction.account && (
                                    <Badge variant="outline" className="text-xs">
                                        {transaction.account.name}
                                    </Badge>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-semibold">
                                    {formatCurrency(transaction.amount)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Allocation Summary */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Total to Allocate:</span>
                            <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Currently Allocated:</span>
                            <span className={`font-medium ${totalAllocated > transaction.amount ? 'text-red-600' : ''}`}>
                                {formatCurrency(totalAllocated)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Remaining:</span>
                            <span className={`font-medium ${Math.abs(remainingAmount) > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
                                {formatCurrency(remainingAmount)}
                            </span>
                        </div>
                        {Math.abs(remainingAmount) > 0.01 && (
                            <div className="flex items-center gap-2 text-sm text-orange-600">
                                <AlertCircle className="h-4 w-4" />
                                Allocations must sum to transaction amount
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Allocations */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-medium">Goal Allocations</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addAllocation}
                                className="h-8 px-3"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Goal
                            </Button>
                        </div>

                        {allocations.map((allocation, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <Label className="text-sm font-medium">
                                        Allocation {index + 1}
                                    </Label>
                                    {allocations.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeAllocation(index)}
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Goal Selection */}
                                    <div className="space-y-2">
                                        <Label className="text-sm">Goal</Label>
                                        <Select
                                            value={allocation.goalId}
                                            onValueChange={(value) => updateAllocation(index, 'goalId', value)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a goal..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {goals?.map((goal) => {
                                                    const isLinkedToAccount = transaction?.account &&
                                                        goal.linked_account_id === transaction.account._id
                                                    const goalAccount = 'account' in goal ? goal.account : null

                                                    return (
                                                        <SelectItem key={goal._id} value={goal._id}>
                                                            <div className="flex items-center gap-2 w-full">
                                                                <span>{goal.emoji} {goal.name}</span>
                                                                {goalAccount && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {goalAccount.name}
                                                                    </Badge>
                                                                )}
                                                                {isLinkedToAccount && (
                                                                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                                                        <LinkIcon className="h-3 w-3" />
                                                                        Linked
                                                                    </Badge>
                                                                )}
                                                                <span className="text-xs text-muted-foreground ml-auto">
                                                                    {formatCurrency(goal.current_amount)}/{formatCurrency(goal.total_amount)}
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Amount Input */}
                                    <div className="space-y-2">
                                        <Label className="text-sm">Amount</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="0.00"
                                                value={allocation.amount}
                                                onChange={(e) => updateAllocation(index, 'amount', e.target.value)}
                                                className="pl-8 text-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Note Input */}
                                <div className="space-y-2">
                                    <Label className="text-sm">Note (Optional)</Label>
                                    <Textarea
                                        placeholder="Add a note for this allocation..."
                                        value={allocation.note}
                                        onChange={(e) => updateAllocation(index, 'note', e.target.value)}
                                        rows={2}
                                        className="text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

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
                            disabled={!isValid}
                        >
                            Allocate Transaction
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}