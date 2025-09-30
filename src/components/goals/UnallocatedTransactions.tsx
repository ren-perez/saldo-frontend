// components/goals/UnallocatedTransactions.tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, Target, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"
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
    const [isCollapsed, setIsCollapsed] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    // Fetch unallocated transactions
    const transactions = useQuery(api.contributions.getUnallocatedTransactions,
        convexUser ? {
            userId: convexUser._id,
            accountId: selectedAccountId && selectedAccountId !== "" ? selectedAccountId as Id<"accounts"> : undefined,
            limit: selectedAccountId ? 20 : 100  // Show more when viewing all accounts
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

    // Pagination
    const totalPages = Math.ceil(positiveTransactions.length / itemsPerPage)
    const paginatedTransactions = positiveTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Reset to page 1 when filter changes
    useState(() => {
        setCurrentPage(1)
    })

    if (positiveTransactions.length === 0) {
        return null // Hide completely if no unallocated transactions
    }

    return (
        <>
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="p-0 hover:bg-transparent h-10 w-10"
                            >
                                {isCollapsed ? (
                                    <ChevronDown className="h-5 w-5" />
                                ) : (
                                    <ChevronUp className="h-5 w-5" />
                                )}
                            </Button>
                            <CardTitle className="flex items-center gap-2">
                                {/* <Target className="h-5 w-5" /> */}
                                Unallocated Transactions
                                <Badge variant="secondary" className="ml-2">
                                    {positiveTransactions.length}
                                </Badge>
                            </CardTitle>
                        </div>
                        {!isCollapsed && (
                            <div className="flex items-center gap-2">
                                <Select value={selectedAccountId} onValueChange={(value) => setSelectedAccountId(value === "__all__" ? "" : value as Id<"accounts">)}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="All accounts" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">All accounts</SelectItem>
                                        {accounts?.map((account) => (
                                            <SelectItem key={account._id} value={account._id}>
                                                {account.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </CardHeader>
                {!isCollapsed && (
                    <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>
                                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, positiveTransactions.length)} of {positiveTransactions.length} transactions
                            </span>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {paginatedTransactions.map((transaction) => (
                                <div
                                    key={transaction._id}
                                    className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex justify-between items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium text-sm truncate">{transaction.description}</p>
                                                {transaction.account && (
                                                    <Badge variant="outline" className="text-xs shrink-0">
                                                        {transaction.account.name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(transaction.date), 'MMM d, yyyy')}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <p className="font-semibold text-green-600">
                                                {formatCurrency(transaction.amount)}
                                            </p>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAllocateTransaction(transaction)}
                                                className="gap-1 h-8"
                                            >
                                                <DollarSign className="h-3 w-3" />
                                                Allocate
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    </CardContent>
                )}
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