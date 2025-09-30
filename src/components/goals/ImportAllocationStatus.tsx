// components/goals/ImportAllocationStatus.tsx
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { FileSpreadsheet, Target, CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { TransactionAllocationDialog } from "./TransactionAllocationDialog"
import { Id } from "../../../convex/_generated/dataModel"

interface ImportAllocationStatusProps {
    importId: Id<"imports">
    formatCurrency: (amount: number) => string
}

export function ImportAllocationStatus({ importId, formatCurrency }: ImportAllocationStatusProps) {
    const { convexUser } = useConvexUser()
    const [selectedTransaction, setSelectedTransaction] = useState<Record<string, unknown> | null>(null)
    const [allocationDialogOpen, setAllocationDialogOpen] = useState(false)

    // Fetch import allocation status
    const allocationStatus = useQuery(api.contributions.getImportAllocationStatus,
        convexUser ? {
            userId: convexUser._id,
            importId: importId
        } : "skip"
    )

    const batchAutoAllocateMutation = useMutation(api.contributions.batchAutoAllocateImport)

    const handleBatchAutoAllocate = async () => {
        if (!convexUser || !allocationStatus) return

        try {
            const result = await batchAutoAllocateMutation({
                userId: convexUser._id,
                importId: importId,
                accountId: allocationStatus.accountId
            })

            if (result.allocated > 0) {
                toast.success(`Auto-allocated ${result.allocated} transactions to goals!`)
            } else {
                toast.info("No transactions were auto-allocated. Manual allocation may be required.")
            }
        } catch (error) {
            toast.error("Failed to auto-allocate transactions. Please try again.")
            console.error("Error auto-allocating import:", error)
        }
    }

    const handleManualAllocate = (transaction: Record<string, unknown>) => {
        setSelectedTransaction(transaction)
        setAllocationDialogOpen(true)
    }

    if (!allocationStatus) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading allocation status...
                </CardContent>
            </Card>
        )
    }

    const allocationProgress = allocationStatus.totalTransactions > 0
        ? (allocationStatus.totalAllocated / allocationStatus.totalTransactions) * 100
        : 0

    const unallocatedTransactions = allocationStatus.transactions.filter(t => !t.isAllocated && t.amount > 0)

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Import Allocation Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Summary Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-muted/50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {allocationStatus.totalTransactions}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Transactions</div>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {allocationStatus.totalAllocated}
                            </div>
                            <div className="text-sm text-muted-foreground">Allocated</div>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {allocationStatus.totalUnallocated}
                            </div>
                            <div className="text-sm text-muted-foreground">Unallocated</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Allocation Progress</span>
                            <span>{allocationProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={allocationProgress} className="h-2" />
                    </div>

                    {/* Linked Goals */}
                    {allocationStatus.linkedGoals.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Linked Goals ({allocationStatus.linkedGoals.length})
                            </h4>
                            <div className="grid gap-2">
                                {allocationStatus.linkedGoals.map((goal) => (
                                    <div key={goal._id} className="flex items-center gap-3 p-3 border rounded-lg">
                                        <span className="text-lg">{goal.emoji}</span>
                                        <div className="flex-1">
                                            <p className="font-medium">{goal.name}</p>
                                        </div>
                                        <div className="text-right text-sm text-muted-foreground">
                                            Goal
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Auto-Allocation Options */}
                    {allocationStatus.canAutoAllocate && allocationStatus.totalUnallocated > 0 && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-2">
                                <CheckCircle className="h-4 w-4" />
                                Auto-Allocation Available
                            </div>
                            <p className="text-blue-600 text-sm mb-3">
                                This account has a single linked goal. You can automatically allocate all positive transactions.
                            </p>
                            <Button
                                onClick={handleBatchAutoAllocate}
                                size="sm"
                                className="gap-2"
                            >
                                <Target className="h-4 w-4" />
                                Auto-Allocate {unallocatedTransactions.length} Transactions
                            </Button>
                        </div>
                    )}

                    {/* Manual Allocation Required */}
                    {!allocationStatus.canAutoAllocate && allocationStatus.totalUnallocated > 0 && (
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-orange-700 text-sm font-medium mb-2">
                                <AlertCircle className="h-4 w-4" />
                                Manual Allocation Required
                            </div>
                            <p className="text-orange-600 text-sm">
                                This account has {allocationStatus.linkedGoalCount} linked goals. Each transaction needs to be manually allocated.
                            </p>
                        </div>
                    )}

                    <Separator />

                    {/* Unallocated Transactions */}
                    {unallocatedTransactions.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-medium">
                                Unallocated Transactions ({unallocatedTransactions.length})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {unallocatedTransactions.map((transaction) => (
                                    <div
                                        key={transaction.transactionId}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{transaction.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(transaction.date), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-green-600">
                                                {formatCurrency(transaction.amount)}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleManualAllocate(transaction)}
                                                className="gap-1"
                                            >
                                                Allocate
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Allocated */}
                    {allocationStatus.totalUnallocated === 0 && allocationStatus.totalTransactions > 0 && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <p className="text-green-700 font-medium">All transactions allocated!</p>
                            <p className="text-green-600 text-sm">
                                All {allocationStatus.totalTransactions} transactions have been successfully allocated to goals.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <TransactionAllocationDialog
                transaction={selectedTransaction ? {
                    _id: selectedTransaction.transactionId as string,
                    amount: selectedTransaction.amount as number,
                    description: selectedTransaction.description as string,
                    date: selectedTransaction.date as number
                } : null}
                open={allocationDialogOpen}
                onOpenChange={setAllocationDialogOpen}
                formatCurrency={formatCurrency}
            />
        </>
    )
}