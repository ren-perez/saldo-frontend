// components/goals/ContributionHistory.tsx
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, TrendingDown, TrendingUp, ArrowRightLeft, Calendar as CalendarIcon, Eye, Search } from "lucide-react"
import { format } from "date-fns"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Id } from "../../../convex/_generated/dataModel"

interface ContributionHistoryProps {
    goalId?: Id<"goals">
    formatCurrency: (amount: number) => string
}

interface ContributionFilters {
    goalId: Id<"goals"> | ""
    startDate: string
    endDate: string
    source: string
}

const SOURCE_LABELS = {
    'manual_ui': 'Manual',
    'manual_tx': 'Transaction',
    'import': 'Import',
    'auto': 'Auto',
}

const SOURCE_COLORS = {
    'manual_ui': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    'manual_tx': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    'import': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
    'auto': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
}

export function ContributionHistory({ goalId, formatCurrency }: ContributionHistoryProps) {
    const { convexUser } = useConvexUser()
    const [filters, setFilters] = useState<ContributionFilters>({
        goalId: goalId || '',
        startDate: '',
        endDate: '',
        source: ''
    })
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    // Fetch contribution history with filters
    const contributions = useQuery(api.contributions.getContributionHistory,
        convexUser ? {
            userId: convexUser._id,
            goalId: filters.goalId ? filters.goalId as Id<"goals"> : undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            limit: 50
        } : "skip"
    )

    // Fetch available goals for filtering
    const goals = useQuery(api.goals.getGoals,
        convexUser ? { userId: convexUser._id } : "skip"
    )

    // Filter and sort contributions
    const filteredContributions = contributions?.filter(contrib => {
        if (filters.source && contrib.source !== filters.source) return false
        return true
    }).sort((a, b) => {
        const dateA = new Date(a.contribution_date).getTime()
        const dateB = new Date(b.contribution_date).getTime()
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    }) || []

    const clearFilters = () => {
        setFilters({
            goalId: goalId || '',
            startDate: '',
            endDate: '',
            source: ''
        })
    }

    const getContributionIcon = (contribution: Record<string, unknown>) => {
        if (contribution.is_withdrawal) {
            return <TrendingDown className="h-4 w-4 text-red-500" />
        }
        if (contribution.transfer_pair_id) {
            return <ArrowRightLeft className="h-4 w-4 text-blue-500" />
        }
        return <TrendingUp className="h-4 w-4 text-green-500" />
    }

    const getContributionType = (contribution: Record<string, unknown>) => {
        if (contribution.is_withdrawal) return "Withdrawal"
        if (contribution.transfer_pair_id) {
            return (contribution.amount as number) > 0 ? "Transfer In" : "Transfer Out"
        }
        return "Contribution"
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Contribution History
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="gap-2"
                    >
                        <ArrowUpDown className="h-4 w-4" />
                        {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-muted/30 rounded-lg">
                    {/* Goal Filter */}
                    {!goalId && (
                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Goal</Label>
                            <Select
                                value={filters.goalId || "__all__"}
                                onValueChange={(value) => setFilters(prev => ({ ...prev, goalId: value === "__all__" ? "" : value as Id<"goals"> }))}
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="All goals" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All goals</SelectItem>
                                    {goals?.map((goal) => (
                                        <SelectItem key={goal._id} value={goal._id}>
                                            {goal.emoji} {goal.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Source Filter */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium">Source</Label>
                        <Select
                            value={filters.source || "__all__"}
                            onValueChange={(value) => setFilters(prev => ({ ...prev, source: value === "__all__" ? "" : value }))}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="All sources" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All sources</SelectItem>
                                {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium">Start Date</Label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            className="h-8"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs font-medium">End Date</Label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            className="h-8"
                        />
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                            className="h-8 w-full"
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Results Summary */}
                {filteredContributions.length > 0 && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>{filteredContributions.length} contributions found</span>
                        <span>
                            Total: {formatCurrency(
                                filteredContributions.reduce((sum, contrib) => sum + contrib.amount, 0)
                            )}
                        </span>
                    </div>
                )}

                {/* Contribution List */}
                <div className="space-y-3">
                    {filteredContributions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No contributions found</p>
                            <p className="text-sm">
                                Try adjusting your filters or add some contributions to get started.
                            </p>
                        </div>
                    ) : (
                        filteredContributions.map((contribution) => (
                            <div
                                key={contribution._id}
                                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            {getContributionIcon(contribution)}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium">
                                                        {getContributionType(contribution)}
                                                    </span>
                                                    {contribution.goal && (
                                                        <span className="text-sm text-muted-foreground">
                                                            to {contribution.goal.emoji} {contribution.goal.name}
                                                        </span>
                                                    )}
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-xs ${SOURCE_COLORS[contribution.source as keyof typeof SOURCE_COLORS]}`}
                                                    >
                                                        {SOURCE_LABELS[contribution.source as keyof typeof SOURCE_LABELS]}
                                                    </Badge>
                                                </div>

                                                {/* Transfer Pair Info */}
                                                {contribution.transferPair && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {contribution.amount > 0 ? 'From' : 'To'}: {contribution.transferPair.otherGoalName}
                                                    </p>
                                                )}

                                                {/* Transaction Info */}
                                                {contribution.transaction && (
                                                    <div className="mt-2 p-2 bg-muted/50 rounded border-l-2 border-primary/30">
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Transaction Details:</p>
                                                        <div className="text-sm">
                                                            <span className="font-medium">{contribution.transaction.description}</span>
                                                            {contribution.transaction.account && (
                                                                <Badge variant="outline" className="ml-2 text-xs">
                                                                    {contribution.transaction.account.name}
                                                                </Badge>
                                                            )}
                                                            {contribution.transaction.amount && (
                                                                <span className="ml-2 text-xs text-muted-foreground">
                                                                    ({formatCurrency(contribution.transaction.amount)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Contribution Note */}
                                                {contribution.note && (
                                                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950 rounded border-l-2 border-amber-400">
                                                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">Note:</p>
                                                        <p className="text-sm text-amber-900 dark:text-amber-100 italic">
                                                            &ldquo;{contribution.note}&rdquo;
                                                        </p>
                                                    </div>
                                                )}

                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <CalendarIcon className="h-4 w-4" />
                                                {format(new Date(contribution.contribution_date), 'MMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={`text-lg font-semibold ${
                                            contribution.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {contribution.amount >= 0 ? '+' : ''}{formatCurrency(contribution.amount)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(contribution.createdAt), 'h:mm a')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}