"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Target, CheckCircle, AlertCircle, ArrowRight,
    Sparkles, Tag, Wallet, TrendingUp, Info,
} from "lucide-react"
import { format } from "date-fns"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { TransactionAllocationDialog } from "./TransactionAllocationDialog"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

interface LinkedGoal {
    _id: Id<"goals">
    name: string
    emoji: string
    color: string
}

interface IncomePlan {
    _id: Id<"income_plans">
    label: string
    expected_amount: number
    expected_date: string
    recurrence: string
}

interface CategorizationHealth {
    autoCategorized: number
    manuallyCategorized: number
    uncategorized: number
    total: number
}

interface ImportedTx {
    transactionId: Id<"transactions">
    amount: number
    description: string
    date: number
    isAllocated: boolean
    allocatedAmount: number
    categoryId: Id<"categories"> | null
    categoryName: string | null
    isAutoCategorized: boolean
    suggestedPlanId: Id<"income_plans"> | null
    suggestedPlanLabel: string | null
    contributions: { goalId: Id<"goals">; amount: number; note?: string }[]
}

interface AllocationStatus {
    importId: Id<"imports">
    accountId: Id<"accounts">
    totalTransactions: number
    totalAllocated: number
    totalUnallocated: number
    linkedGoals: LinkedGoal[]
    transactions: ImportedTx[]
    categorizationHealth: CategorizationHealth
    unmatchedIncomePlans: IncomePlan[]
    isIncomeRelevant: boolean
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ImportAllocationStatusProps {
    importId: Id<"imports">
    formatCurrency: (amount: number) => string
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ImportAllocationStatus({ importId, formatCurrency }: ImportAllocationStatusProps) {
    const router = useRouter()
    const { convexUser } = useConvexUser()
    const [selectedTx, setSelectedTx] = useState<ImportedTx | null>(null)
    const [allocDialogOpen, setAllocDialogOpen] = useState(false)

    const allocationStatus = useQuery(
        api.contributions.getImportAllocationStatus,
        convexUser ? { userId: convexUser._id, importId } : "skip"
    ) as AllocationStatus | undefined | null


    if (!allocationStatus) {
        return (
            <div className="space-y-3 pt-1">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-8 w-2/3 rounded" />
                <Skeleton className="h-24 rounded-lg" />
            </div>
        )
    }

    const {
        totalTransactions, totalAllocated, totalUnallocated,
        linkedGoals, transactions,
        categorizationHealth, unmatchedIncomePlans, isIncomeRelevant,
    } = allocationStatus

    const categorized = categorizationHealth.autoCategorized + categorizationHealth.manuallyCategorized
    const categorizationPct = categorizationHealth.total > 0
        ? (categorized / categorizationHealth.total) * 100
        : 100

    const unallocatedPositive = transactions.filter(t => !t.isAllocated && t.amount > 0)
    const incomeTxs = unallocatedPositive.filter(t => t.suggestedPlanId !== null)
    const windfallTxs = unallocatedPositive.filter(t => t.suggestedPlanId === null)

    const isAllDone =
        (linkedGoals.length === 0 || totalUnallocated === 0) &&
        categorizationHealth.uncategorized === 0 &&
        !isIncomeRelevant

    if (isAllDone) {
        return (
            <div className="py-4 text-center space-y-3">
                <div className="flex justify-center">
                    <div className="flex items-center justify-center size-14 rounded-full bg-primary/10 ring-4 ring-primary/5">
                        <Sparkles className="size-6 text-primary" />
                    </div>
                </div>
                <div>
                    <p className="font-semibold text-base">You're all set!</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {totalTransactions} transaction{totalTransactions !== 1 ? "s" : ""} imported — categorized and allocated.
                    </p>
                </div>
                <div className="flex items-center justify-center gap-6 pt-1">
                    <Stat label="Imported" value={totalTransactions} />
                    <Stat label="Allocated" value={totalAllocated} accent="success" />
                    <Stat label="Categorized" value={categorized} accent="success" />
                </div>
            </div>
        )
    }

    const hasGoalsTab = linkedGoals.length > 0

    return (
        <>
            <p className="text-foreground/85 font-bold">
                {totalTransactions} transaction{totalTransactions !== 1 ? "s" : ""} imported
            </p>

            {(hasGoalsTab || isIncomeRelevant) ? (
                <Tabs defaultValue={isIncomeRelevant ? "income" : hasGoalsTab ? "goals" : "categories"} className="mt-4">
                    <TabsList className="w-full h-8">
                        {isIncomeRelevant && (
                            <TabsTrigger value="income" className="flex-1 text-xs gap-1.5 h-7">
                                <Wallet className="size-3" />
                                Income
                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{incomeTxs.length}</Badge>
                            </TabsTrigger>
                        )}
                        {hasGoalsTab && (
                            <TabsTrigger value="goals" className="flex-1 text-xs gap-1.5 h-7">
                                <Target className="size-3" />
                                Goals
                                {windfallTxs.length > 0 && (
                                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">{windfallTxs.length}</Badge>
                                )}
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="categories" className="flex-1 text-xs gap-1.5 h-7">
                            <Tag className="size-3" />
                            Categories
                            {categorizationHealth.uncategorized > 0 && (
                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{categorizationHealth.uncategorized}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {isIncomeRelevant && (
                        <TabsContent value="income" className="mt-4">
                            <IncomeContent
                                plans={unmatchedIncomePlans}
                                matchedTxs={incomeTxs}
                                formatCurrency={formatCurrency}
                                onNavigate={() => router.push("/income")}
                            />
                        </TabsContent>
                    )}

                    {hasGoalsTab && (
                        <TabsContent value="goals" className="mt-4">
                            <GoalsContent
                                linkedGoals={linkedGoals}
                                windfallTxs={windfallTxs}
                                incomeTxCount={incomeTxs.length}
                                totalAllocated={totalAllocated}
                                totalTransactions={totalTransactions}
                                formatCurrency={formatCurrency}
                                onManualAllocate={(tx) => { setSelectedTx(tx); setAllocDialogOpen(true) }}
                                onGoToIncome={() => router.push("/income")}
                            />
                        </TabsContent>
                    )}

                    <TabsContent value="categories" className="mt-4">
                        <CategoriesContent
                            health={categorizationHealth}
                            categorizationPct={categorizationPct}
                            onNavigate={() => router.push("/transactions")}
                        />
                    </TabsContent>
                </Tabs>
            ) : (
                <div className="mt-4">
                    <CategoriesContent
                        health={categorizationHealth}
                        categorizationPct={categorizationPct}
                        onNavigate={() => router.push("/transactions")}
                    />
                </div>
            )}

            <TransactionAllocationDialog
                transaction={selectedTx ? {
                    _id: selectedTx.transactionId as unknown as string,
                    amount: selectedTx.amount,
                    description: selectedTx.description,
                    date: selectedTx.date,
                } : null}
                open={allocDialogOpen}
                onOpenChange={setAllocDialogOpen}
                formatCurrency={formatCurrency}
            />
        </>
    )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "success" | "warn" }) {
    return (
        <div className="text-center">
            <div className={cn(
                "text-xl font-bold",
                accent === "success" && "text-green-600",
                accent === "warn" && "text-amber-600"
            )}>
                {value}
            </div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
    )
}

// Income tab: shows plan items + matched imported transactions.
// These transactions must NOT be allocated to goals — they belong to the Income Plan flow.
function IncomeContent({
    plans, matchedTxs, formatCurrency, onNavigate,
}: {
    plans: IncomePlan[]
    matchedTxs: ImportedTx[]
    formatCurrency: (n: number) => string
    onNavigate: () => void
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/30">
                <Info className="size-4 text-primary mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-medium">These transactions match your Income Plan</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Don't allocate them to goals here — match them on the Income page so your plan distributes them correctly.
                    </p>
                </div>
            </div>

            {matchedTxs.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {matchedTxs.map(tx => (
                        <div key={tx.transactionId} className="flex items-center justify-between gap-3 p-2.5 border rounded-lg bg-muted/20">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{tx.description}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    {format(new Date(tx.date), "MMM d")}
                                    {tx.suggestedPlanLabel && (
                                        <span className="ml-1.5 text-primary">→ {tx.suggestedPlanLabel}</span>
                                    )}
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-green-600 shrink-0">
                                {formatCurrency(tx.amount)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {plans.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Unmatched plans in this period</p>
                    {plans.map(plan => (
                        <div key={plan._id} className="flex items-center justify-between p-2.5 border rounded-lg">
                            <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{plan.label}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Expected {format(new Date(plan.expected_date + "T12:00:00"), "MMM d")}
                                    {plan.recurrence !== "once" && <span className="opacity-70"> · {plan.recurrence}</span>}
                                </p>
                            </div>
                            <span className="text-xs font-semibold shrink-0 ml-3">{formatCurrency(plan.expected_amount)}</span>
                        </div>
                    ))}
                </div>
            )}

            <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={onNavigate}>
                <TrendingUp className="size-3.5" />
                Match on the Income page
                <ArrowRight className="size-3 ml-auto" />
            </Button>
        </div>
    )
}

// Goals tab: only shows TRUE windfall transactions (no income plan match).
// Auto-allocate is intentionally absent — it would "steal" dollars from Income Plans.
function GoalsContent({
    linkedGoals, windfallTxs, incomeTxCount, totalAllocated, totalTransactions,
    formatCurrency, onManualAllocate, onGoToIncome,
}: {
    linkedGoals: LinkedGoal[]
    windfallTxs: ImportedTx[]
    incomeTxCount: number
    totalAllocated: number
    totalTransactions: number
    formatCurrency: (n: number) => string
    onManualAllocate: (tx: ImportedTx) => void
    onGoToIncome: () => void
}) {
    const allocationPct = totalTransactions > 0 ? (totalAllocated / totalTransactions) * 100 : 0

    if (windfallTxs.length === 0) {
        if (incomeTxCount > 0) {
            // All unallocated txs are income — no windfall goal work here
            return (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <Wallet className="size-8 text-primary/70" />
                    <p className="text-sm font-medium">No windfall transactions to allocate</p>
                    <p className="text-xs text-muted-foreground">
                        The remaining {incomeTxCount} transaction{incomeTxCount !== 1 ? "s" : ""} match your Income Plan.
                        Match them on the Income page instead.
                    </p>
                    <Button variant="outline" size="sm" className="mt-1 text-xs gap-2" onClick={onGoToIncome}>
                        <TrendingUp className="size-3.5" />
                        Go to Income page
                    </Button>
                </div>
            )
        }
        return (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle className="size-8 text-green-600" />
                <p className="text-sm font-medium">All transactions allocated!</p>
                <p className="text-xs text-muted-foreground">
                    {totalAllocated} of {totalTransactions} allocated across {linkedGoals.length} goal{linkedGoals.length !== 1 ? "s" : ""}.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Progress */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{allocationPct.toFixed(0)}%</span>
                </div>
                <Progress value={allocationPct} className="h-1.5" />
            </div>

            {/* Linked goal pills */}
            <div className="flex flex-wrap gap-1.5">
                {linkedGoals.map(g => (
                    <div key={g._id} className="flex items-center gap-1 bg-muted/50 rounded-full px-2.5 py-1 text-xs font-medium">
                        <span>{g.emoji}</span>
                        <span>{g.name}</span>
                    </div>
                ))}
            </div>

            {/* Income warning if any income txs are being shown elsewhere */}
            {incomeTxCount > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg border border-dashed text-xs text-muted-foreground">
                    <Info className="size-3.5 shrink-0 mt-0.5" />
                    <span>{incomeTxCount} transaction{incomeTxCount !== 1 ? "s" : ""} matching an Income Plan are in the Income tab — handle them there.</span>
                </div>
            )}

            {/* Windfall allocation list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {windfallTxs.map(tx => (
                    <div key={tx.transactionId} className="flex items-center justify-between gap-3 p-2.5 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{tx.description}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(tx.date), "MMM d, yyyy")}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-green-600">{formatCurrency(tx.amount)}</span>
                            <Button
                                size="sm" variant="outline"
                                className="h-6 px-2 text-[10px] gap-1"
                                onClick={() => onManualAllocate(tx)}
                            >
                                Allocate <ArrowRight className="size-2.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {windfallTxs.length > 0 && linkedGoals.length > 1 && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                    <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        Multiple goals linked — each windfall must be allocated manually.
                    </p>
                </div>
            )}
        </div>
    )
}

function CategoriesContent({
    health, categorizationPct, onNavigate,
}: {
    health: CategorizationHealth
    categorizationPct: number
    onNavigate: () => void
}) {
    const allDone = health.uncategorized === 0

    return (
        <button
            onClick={onNavigate}
            className={cn(
                "w-full text-left rounded-lg border p-3 space-y-2 transition-colors hover:bg-muted/30",
                allDone
                    ? "border-green-200/50 dark:border-green-900/50"
                    : "border-amber-200/50 dark:border-amber-900/50"
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2">
                <Tag className="size-3 shrink-0" />
                <span className="flex-1 text-sm font-medium">
                    {allDone ? "All categorized" : "Categorize in Transactions"}
                </span>
                <ArrowRight className="size-3 text-muted-foreground shrink-0" />
            </div>

            {/* Progress bar */}
            <Progress value={categorizationPct} className="h-1" />

            {/* Stats */}
            <div className="flex items-center gap-3 text-[10px]">
                {health.autoCategorized > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="size-3" />
                        {health.autoCategorized} auto-categorized
                    </span>
                )}
                {health.uncategorized > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <AlertCircle className="size-3" />
                        {health.uncategorized} need{health.uncategorized === 1 ? "s" : ""} a category
                    </span>
                )}
                <span className="text-muted-foreground ml-auto">{categorizationPct.toFixed(0)}%</span>
            </div>
        </button>
    )
}
