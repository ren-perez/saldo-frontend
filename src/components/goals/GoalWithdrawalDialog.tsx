// components/goals/GoalWithdrawalDialog.tsx
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingDown, TrendingUp, AlertCircle, CreditCard, Link as LinkIcon, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Goal } from "@/types/goals"
import { Id } from "../../../convex/_generated/dataModel"
import { format } from "date-fns"

interface GoalWithdrawalDialogProps {
    goal: Goal | null
    open: boolean
    onOpenChange: (open: boolean) => void
    formatCurrency: (amount: number) => string
}

interface SelectedTx {
    _id: Id<"transactions">
    amount: number      // signed (as stored in the DB)
    date: number
    description: string
}

interface FormData {
    amount: string      // always positive in the input field
    date: string
    note: string
}

function todayISO() {
    return new Date().toISOString().split('T')[0]
}

export function GoalWithdrawalDialog({ goal, open, onOpenChange, formatCurrency }: GoalWithdrawalDialogProps) {
    const { convexUser } = useConvexUser()
    const isLinkedAccount = goal?.tracking_type === "LINKED_ACCOUNT" && !!goal?.linked_account

    const [linkedMode, setLinkedMode] = useState<"match" | "manual">("match")
    const [selectedTx, setSelectedTx] = useState<SelectedTx | null>(null)
    const [form, setForm] = useState<FormData>({ amount: '', date: todayISO(), note: '' })

    const recordMovement = useMutation(api.contributions.recordGoalMovement)

    const accountTransactions = useQuery(
        api.contributions.getAccountTransactionsForWithdrawal,
        convexUser && isLinkedAccount && goal?.linked_account
            ? { userId: convexUser._id, accountId: goal.linked_account._id, limit: 50 }
            : "skip"
    )

    useEffect(() => {
        if (open) {
            setLinkedMode("match")
            setSelectedTx(null)
            setForm({ amount: '', date: todayISO(), note: '' })
        }
    }, [open])

    const handleSelectTx = (tx: SelectedTx) => {
        setSelectedTx(tx)
        setForm(prev => ({
            ...prev,
            amount: Math.abs(tx.amount).toFixed(2),
            date: new Date(tx.date).toISOString().split('T')[0],
        }))
    }

    const handleClose = () => {
        setSelectedTx(null)
        setForm({ amount: '', date: todayISO(), note: '' })
        onOpenChange(false)
    }

    // For LINKED_ACCOUNT + matched tx: direction comes from the tx sign.
    // For MANUAL or linked-manual: always withdrawal (negative).
    const signedAmount = (): number => {
        const abs = parseFloat(form.amount)
        if (isNaN(abs) || abs <= 0) return 0
        if (isLinkedAccount && selectedTx) {
            return selectedTx.amount < 0 ? -abs : abs   // mirror the tx direction
        }
        return -abs   // MANUAL goal or linked-manual mode: always withdrawal
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!goal || !convexUser) return

        const amount = signedAmount()
        if (amount === 0) {
            toast.error("Please enter a valid amount greater than 0")
            return
        }
        if (Math.abs(amount) > goal.current_amount && amount < 0) {
            toast.error("Withdrawal exceeds current goal balance.")
            return
        }

        try {
            await recordMovement({
                userId: convexUser._id,
                goalId: goal._id,
                amount,
                date: form.date,
                note: form.note || undefined,
                transactionId: selectedTx?._id ?? undefined,
            })
            toast.success(amount < 0 ? "Withdrawal recorded!" : "Deposit recorded!")
            handleClose()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Something went wrong.")
        }
    }

    if (!goal) return null

    const absInput = parseFloat(form.amount) || 0
    const movementAmount = signedAmount()
    const isWithdrawal = movementAmount < 0
    const remainingBalance = goal.current_amount + movementAmount
    const isOverdraw = isWithdrawal && Math.abs(movementAmount) > goal.current_amount

    // Submit guard
    const canSubmit = (() => {
        if (absInput <= 0) return false
        if (isOverdraw) return false
        if (isLinkedAccount && linkedMode === "match" && !selectedTx) return false
        return true
    })()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-amber-500" />
                        Record Movement — {goal.emoji} {goal.name}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Balance summary */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Current Balance:</span>
                            <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Goal Target:</span>
                            <span className="text-muted-foreground">{formatCurrency(goal.total_amount)}</span>
                        </div>
                        {absInput > 0 && (
                            <div className="flex justify-between text-sm border-t pt-2">
                                <span>After Movement:</span>
                                <span className={`font-medium ${isOverdraw ? 'text-red-600' : ''}`}>
                                    {formatCurrency(remainingBalance)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── LINKED ACCOUNT ── */}
                    {isLinkedAccount && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CreditCard className="h-4 w-4" />
                                <span>Linked to <strong>{goal.linked_account!.name}</strong></span>
                            </div>

                            {/* Mode toggle */}
                            <div className="flex gap-2">
                                <Button
                                    type="button" size="sm"
                                    variant={linkedMode === "match" ? "default" : "outline"}
                                    className="flex-1 gap-1"
                                    onClick={() => { setLinkedMode("match"); setSelectedTx(null); setForm(prev => ({ ...prev, amount: '', date: todayISO() })) }}
                                >
                                    <LinkIcon className="h-3 w-3" />
                                    Match a transaction
                                </Button>
                                <Button
                                    type="button" size="sm"
                                    variant={linkedMode === "manual" ? "default" : "outline"}
                                    className="flex-1 gap-1"
                                    onClick={() => { setLinkedMode("manual"); setSelectedTx(null) }}
                                >
                                    <Pencil className="h-3 w-3" />
                                    Enter manually
                                </Button>
                            </div>

                            {/* Transaction picker */}
                            {linkedMode === "match" && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Transactions from {goal.linked_account!.name}
                                    </Label>

                                    {accountTransactions === undefined ? (
                                        <p className="text-sm text-muted-foreground py-2">Loading…</p>
                                    ) : accountTransactions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-2">No transactions found.</p>
                                    ) : (
                                        <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                                            {accountTransactions.map((tx) => {
                                                const isSelected = selectedTx?._id === tx._id
                                                const isDebit = tx.amount < 0
                                                return (
                                                    <button
                                                        key={tx._id}
                                                        type="button"
                                                        disabled={tx.alreadyLinked}
                                                        onClick={() => handleSelectTx(tx as SelectedTx)}
                                                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between gap-2
                                                            ${isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50'}
                                                            ${tx.alreadyLinked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            {isDebit
                                                                ? <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
                                                                : <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
                                                            }
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium">{tx.description || "Transaction"}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {format(new Date(tx.date), 'MMM d, yyyy')}
                                                                    {tx.alreadyLinked && <span className="ml-2 text-amber-600">· already linked</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={`font-semibold shrink-0 ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                                                            {formatCurrency(tx.amount)}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Direction hint when transaction selected */}
                                    {selectedTx && (
                                        <div className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${selectedTx.amount < 0 ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40' : 'text-green-700 bg-green-50 dark:bg-green-950/40'}`}>
                                            {selectedTx.amount < 0
                                                ? <><TrendingDown className="h-3 w-3" /> This will be recorded as a <strong>withdrawal</strong> from the goal.</>
                                                : <><TrendingUp className="h-3 w-3" /> This will be recorded as a <strong>deposit</strong> to the goal.</>
                                            }
                                        </div>
                                    )}

                                    {!selectedTx && (
                                        <p className="text-xs text-muted-foreground">Select a transaction to populate amount and date.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amount + Date — shown for manual mode or after tx selection */}
                    {(!isLinkedAccount || linkedMode === "manual" || selectedTx) && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount *</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="0.00"
                                        value={form.amount}
                                        readOnly={!!selectedTx}
                                        onChange={(e) => { if (!selectedTx) setForm(prev => ({ ...prev, amount: e.target.value })) }}
                                        className={`pl-10 ${selectedTx ? 'bg-muted cursor-default' : ''}`}
                                        required
                                    />
                                </div>
                                {isOverdraw && (
                                    <div className="flex items-center gap-2 text-sm text-red-600">
                                        <AlertCircle className="h-4 w-4" />
                                        Withdrawal exceeds current goal balance.
                                    </div>
                                )}
                                {/* Quick buttons — manual entry only, withdrawal direction only */}
                                {!selectedTx && isWithdrawal && goal.current_amount > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[0.25, 0.5, 1].map((pct) => (
                                            <Button key={pct} type="button" variant="outline" size="sm"
                                                onClick={() => setForm(prev => ({ ...prev, amount: (goal.current_amount * pct).toFixed(2) }))}>
                                                {pct === 1 ? 'All' : `${pct * 100}%`}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date">Date *</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={form.date}
                                    readOnly={!!selectedTx}
                                    onChange={(e) => { if (!selectedTx) setForm(prev => ({ ...prev, date: e.target.value })) }}
                                    className={selectedTx ? 'bg-muted cursor-default' : ''}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {/* Note */}
                    <div className="space-y-2">
                        <Label htmlFor="note">Note (Optional)</Label>
                        <Textarea
                            id="note"
                            placeholder="Reason…"
                            value={form.note}
                            onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                            rows={2}
                        />
                    </div>

                    {/* Impact panel (only for withdrawals) */}
                    {absInput > 0 && isWithdrawal && !isOverdraw && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-lg text-sm space-y-1">
                            <p className="font-medium text-amber-800 dark:text-amber-200">Impact on Goal Progress</p>
                            <div className="flex justify-between text-amber-700 dark:text-amber-300">
                                <span>Current</span>
                                <span>{((goal.current_amount / goal.total_amount) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-amber-700 dark:text-amber-300 border-t border-amber-300 dark:border-amber-700 pt-1 font-medium">
                                <span>After</span>
                                <span className="text-red-600 dark:text-red-400">
                                    {((remainingBalance / goal.total_amount) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button
                            type="submit"
                            variant={isWithdrawal || (!selectedTx && isLinkedAccount) ? "destructive" : "default"}
                            disabled={!canSubmit}
                        >
                            {selectedTx
                                ? (selectedTx.amount < 0 ? "Record Withdrawal" : "Record Deposit")
                                : "Withdraw Funds"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
