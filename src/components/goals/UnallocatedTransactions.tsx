// components/goals/UnallocatedTransactions.tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, Target } from "lucide-react"
import { format } from "date-fns"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { TransactionAllocationDialog } from "./TransactionAllocationDialog"
import { Id } from "../../../convex/_generated/dataModel"

interface UnallocatedTransaction {
    _id: string
    amount: number
    description: string
    date: number
    account?: {
        _id: string
        name: string
        type: string
    } | null
}

interface UnallocatedTransactionsProps {
    formatCurrency: (amount: number) => string
}

export function UnallocatedTransactions({ formatCurrency }: UnallocatedTransactionsProps) {
    const { convexUser } = useConvexUser()
    const [selectedAccountId, setSelectedAccountId] = useState<Id<"accounts"> | "">("")
    const [selectedTransaction, setSelectedTransaction] = useState<UnallocatedTransaction | null>(null)
    const [allocationDialogOpen, setAllocationDialogOpen] = useState(false)

    // Fetch unallocated transactions
    const transactions = useQuery(api.contributions.getUnallocatedTransactions,
        convexUser ? {
            userId: convexUser._id,
            accountId: selectedAccountId ? selectedAccountId as Id<"accounts"> : undefined,
            limit: 20
        } : "skip"
    )

    // Fetch user accounts for filtering
    const accounts = useQuery(api.goals.getGoalAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    const handleAllocateTransaction = (transaction: UnallocatedTransaction) => {
        setSelectedTransaction(transaction)
        setAllocationDialogOpen(true)
    }

    const positiveTransactions = transactions?.filter(t => t.amount > 0) || []

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Unallocated Transactions
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Select value={selectedAccountId} onValueChange={(value) => setSelectedAccountId(value as Id<"accounts"> | "")}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="All accounts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All accounts</SelectItem>
                                    {accounts?.map((account) => (
                                        <SelectItem key={account._id} value={account._id}>
                                            {account.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {positiveTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No unallocated transactions</p>
                            <p className="text-sm">
                                All positive transactions have been allocated to goals.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-sm text-muted-foreground mb-4">
                                Showing {positiveTransactions.length} positive transactions ready for goal allocation.
                            </div>

                            {positiveTransactions.map((transaction) => (
                                <div
                                    key={transaction._id}
                                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="font-medium">{transaction.description}</p>
                                                <p className="text-lg font-semibold text-green-600">
                                                    {formatCurrency(transaction.amount)}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {format(new Date(transaction.date), 'MMM d, yyyy')}
                                                </div>
                                                {transaction.account && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {transaction.account.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            size="sm"
                                            onClick={() => handleAllocateTransaction(transaction)}
                                            className="gap-2"
                                        >
                                            <DollarSign className="h-4 w-4" />
                                            Allocate to Goals
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <TransactionAllocationDialog
                transaction={selectedTransaction ? {
                    _id: selectedTransaction._id,
                    amount: selectedTransaction.amount,
                    description: selectedTransaction.description,
                    date: selectedTransaction.date,
                    account: selectedTransaction.account || undefined
                } : null}
                open={allocationDialogOpen}
                onOpenChange={setAllocationDialogOpen}
                formatCurrency={formatCurrency}
            />
        </>
    )
}