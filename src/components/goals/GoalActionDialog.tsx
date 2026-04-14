// components/goals/GoalActionDialog.tsx
// Unified "Move Money" dialog: Add → Transfer → Withdraw, all in one place.
import { useState, useEffect } from "react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
    TrendingUp, TrendingDown, ArrowRightLeft, DollarSign,
    HandCoins, CreditCard, AlertCircle, Link as LinkIcon,
    Pencil, ChevronLeft,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Goal } from "@/types/goals"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

type Action = "add" | "transfer" | "withdraw"
type Source = "manual" | "account"
type LinkedMode = "match" | "manual"

interface SelectedTx {
    _id: Id<"transactions">
    amount: number
    date: number
    description: string
}

interface GoalActionDialogProps {
    goal: Goal | null
    open: boolean
    onOpenChange: (open: boolean) => void
    formatCurrency: (amount: number) => string
    onGoalCompleted?: (goal: Goal) => void
    /** Pre-select an action instead of showing the picker */
    initialAction?: Action
}

function todayISO() {
    return new Date().toISOString().split("T")[0]
}

// ── Direction Picker ──────────────────────────────────────────────────────────

function ActionCard({
    icon, label, description, onClick, disabled, variant = "default",
}: {
    icon: React.ReactNode
    label: string
    description: string
    onClick: () => void
    disabled?: boolean
    variant?: "default" | "amber" | "blue"
}) {
    const colors = {
        default: "hover:border-primary/60 hover:bg-primary/5",
        amber: "hover:border-amber-400/60 hover:bg-amber-50 dark:hover:bg-amber-950/30",
        blue: "hover:border-blue-400/60 hover:bg-blue-50 dark:hover:bg-blue-950/30",
    }
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 border-border p-5 text-center transition-all",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                !disabled && colors[variant],
            )}
        >
            <div className="text-2xl">{icon}</div>
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-muted-foreground leading-tight">{description}</span>
        </button>
    )
}

// ── Add Form ──────────────────────────────────────────────────────────────────

function AddForm({ goal, formatCurrency, onSuccess }: {
    goal: Goal; formatCurrency: (n: number) => string; onSuccess: () => void
}) {
    const { convexUser } = useConvexUser()
    const createContribution = useMutation(api.contributions.createContribution)
    const accounts = useQuery(api.goals.getGoalAccounts, convexUser ? { userId: convexUser._id } : "skip")

    const [source, setSource] = useState<Source>(goal.linked_account ? "account" : "manual")
    const [accountId, setAccountId] = useState<string>(goal.linked_account?._id || "")
    const [amount, setAmount] = useState("")
    const [date, setDate] = useState(todayISO())
    const [note, setNote] = useState("")

    const remaining = Math.max(goal.total_amount - goal.current_amount, 0)
    const parsed = parseFloat(amount) || 0
    const capped = Math.min(parsed, remaining)
    const newTotal = goal.current_amount + capped
    const currentPct = Math.min((goal.current_amount / goal.total_amount) * 100, 100)
    const newPct = Math.min((newTotal / goal.total_amount) * 100, 100)
    const willComplete = newPct >= 100 && currentPct < 100
    const isOver = parsed > remaining && remaining > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!convexUser || capped <= 0) return
        if (remaining <= 0) { toast.error("This goal is already completed"); return }
        try {
            await createContribution({
                userId: convexUser._id,
                goalId: goal._id,
                amount: capped,
                note,
                contribution_date: date,
                source: "manual_ui",
                ...(source === "account" && accountId ? { accountId: accountId as Id<"accounts"> } : {}),
            })
            if (willComplete) {
                toast.success("Goal completed! 🎉")
            } else {
                toast.success("Contribution added!")
            }
            onSuccess()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to add contribution.")
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Progress summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.total_amount)}</span>
                </div>
                <Progress value={currentPct} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{currentPct.toFixed(0)}% complete</span>
                    <span>{formatCurrency(remaining)} remaining</span>
                </div>
            </div>

            {/* Source */}
            <div className="space-y-2">
                <Label>Source</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={source === "manual" ? "default" : "outline"}
                        className="h-auto py-2.5 flex flex-col items-center gap-1"
                        onClick={() => { setSource("manual"); setAccountId("") }}>
                        <HandCoins className="h-4 w-4" />
                        <span className="text-xs">Cash / Manual</span>
                    </Button>
                    <Button type="button" variant={source === "account" ? "default" : "outline"}
                        className="h-auto py-2.5 flex flex-col items-center gap-1"
                        onClick={() => { setSource("account"); setAccountId(goal.linked_account?._id || "") }}>
                        <CreditCard className="h-4 w-4" />
                        <span className="text-xs">From Account</span>
                    </Button>
                </div>
            </div>

            {source === "account" && (
                <div className="space-y-1.5">
                    <Label>Account</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>
                            {accounts?.map(a => (
                                <SelectItem key={a._id} value={a._id}>{a.name} ({a.account_type})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Creates a deposit transaction on the selected account.</p>
                </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label>Amount *</Label>
                    {remaining > 0 && (
                        <button type="button" className="text-xs text-primary hover:underline"
                            onClick={() => setAmount(remaining.toFixed(2))}>
                            Fill remaining ({formatCurrency(remaining)})
                        </button>
                    )}
                </div>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" step="0.01" min="0.01" placeholder="0.00"
                        value={amount} onChange={e => setAmount(e.target.value)}
                        className="pl-10" required />
                </div>
                {isOver && <p className="text-xs text-amber-600">Will be capped to {formatCurrency(remaining)}</p>}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
                <Label>Note (Optional)</Label>
                <Textarea placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} rows={2} />
            </div>

            {/* Preview */}
            {capped > 0 && (
                <div className={cn("rounded-lg p-3 space-y-2 border text-sm",
                    willComplete ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30" : "bg-muted/30")}>
                    <div className="relative h-1.5">
                        <Progress value={currentPct} className="h-1.5" />
                        <div className="absolute top-0 left-0 h-1.5 rounded-full bg-emerald-500/40 transition-all" style={{ width: `${newPct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>+{formatCurrency(capped)}</span>
                        <span>{newPct.toFixed(0)}% after</span>
                    </div>
                    {willComplete && <p className="text-center text-xs font-medium text-emerald-700 dark:text-emerald-400">This completes your goal! 🎉</p>}
                </div>
            )}

            <DialogFooter>
                <Button type="submit"
                    disabled={!amount || parsed <= 0 || remaining <= 0 || (source === "account" && !accountId)}>
                    {willComplete ? "Complete Goal" : "Add Contribution"}
                </Button>
            </DialogFooter>
        </form>
    )
}

// ── Transfer Form ─────────────────────────────────────────────────────────────

function TransferForm({ goal, formatCurrency, onSuccess }: {
    goal: Goal; formatCurrency: (n: number) => string; onSuccess: () => void
}) {
    const { convexUser } = useConvexUser()
    const transfer = useMutation(api.contributions.transferBetweenGoals)
    const allGoals = useQuery(api.goals.getGoals, convexUser ? { userId: convexUser._id } : "skip")

    const [toGoalId, setToGoalId] = useState<Id<"goals"> | "">("")
    const [amount, setAmount] = useState("")
    const [note, setNote] = useState("")
    const [createTransactions, setCreateTransactions] = useState(false)

    const available = allGoals?.filter(g => g._id !== goal._id) || []
    const dest = available.find(g => g._id === toGoalId)
    const isCrossAccount = goal.linked_account && dest?.linked_account &&
        goal.linked_account._id !== dest.linked_account._id
    const parsed = parseFloat(amount) || 0
    const isOverdraw = parsed > goal.current_amount
    const remaining = goal.current_amount - parsed

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!convexUser || !toGoalId || parsed <= 0 || isOverdraw) return
        try {
            await transfer({
                userId: convexUser._id,
                fromGoalId: goal._id,
                toGoalId: toGoalId as Id<"goals">,
                amount: parsed,
                note: note || undefined,
                createTransactions,
            })
            toast.success("Transfer completed!")
            onSuccess()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Transfer failed.")
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Balance */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                    <span>Available Balance:</span>
                    <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
                </div>
                {parsed > 0 && (
                    <div className="flex justify-between border-t pt-1.5">
                        <span>After Transfer:</span>
                        <span className={cn("font-medium", isOverdraw && "text-red-600")}>{formatCurrency(remaining)}</span>
                    </div>
                )}
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
                <Label>Transfer To *</Label>
                <Select value={toGoalId} onValueChange={v => setToGoalId(v as Id<"goals">)}>
                    <SelectTrigger><SelectValue placeholder="Select destination goal" /></SelectTrigger>
                    <SelectContent>
                        {available.map(g => (
                            <SelectItem key={g._id} value={g._id}>
                                <span className="flex items-center gap-2">
                                    <span>{g.emoji}</span>
                                    <span>{g.name}</span>
                                    <span className="text-xs text-muted-foreground">({formatCurrency(g.current_amount)})</span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
                <Label>Amount *</Label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" step="0.01" min="0.01" max={goal.current_amount}
                        placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                        className="pl-10" required />
                </div>
                {isOverdraw && (
                    <div className="flex items-center gap-1.5 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" /> Amount exceeds available balance
                    </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                    {[0.25, 0.5, 1].map(pct => (
                        <Button key={pct} type="button" variant="outline" size="sm"
                            onClick={() => setAmount((goal.current_amount * pct).toFixed(2))}>
                            {pct === 1 ? "All" : `${pct * 100}%`}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Cross-account */}
            {isCrossAccount && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                        <p className="text-sm font-medium">Create Account Transactions</p>
                        <p className="text-xs text-muted-foreground">Records matching transactions in both linked accounts.</p>
                    </div>
                    <Checkbox checked={createTransactions}
                        onCheckedChange={v => setCreateTransactions(!!v)} />
                </div>
            )}

            {/* Note */}
            <div className="space-y-1.5">
                <Label>Note (Optional)</Label>
                <Textarea placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} rows={2} />
            </div>

            {/* Preview */}
            {dest && parsed > 0 && !isOverdraw && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between text-blue-800 dark:text-blue-200">
                        <span>{goal.emoji} {goal.name}</span>
                        <span className="text-red-600">−{formatCurrency(parsed)}</span>
                    </div>
                    <div className="flex justify-between text-blue-800 dark:text-blue-200">
                        <span>{dest.emoji} {dest.name}</span>
                        <span className="text-emerald-600">+{formatCurrency(parsed)}</span>
                    </div>
                </div>
            )}

            <DialogFooter>
                <Button type="submit" disabled={!toGoalId || parsed <= 0 || isOverdraw}>
                    Transfer Funds
                </Button>
            </DialogFooter>
        </form>
    )
}

// ── Withdraw Form ─────────────────────────────────────────────────────────────

function WithdrawForm({ goal, formatCurrency, onSuccess }: {
    goal: Goal; formatCurrency: (n: number) => string; onSuccess: () => void
}) {
    const { convexUser } = useConvexUser()
    const recordMovement = useMutation(api.contributions.recordGoalMovement)
    const isLinked = goal.tracking_type === "LINKED_ACCOUNT" && !!goal.linked_account

    const [linkedMode, setLinkedMode] = useState<LinkedMode>("match")
    const [selectedTx, setSelectedTx] = useState<SelectedTx | null>(null)
    const [source, setSource] = useState<Source>("manual")
    const [accountId, setAccountId] = useState<string>("")
    const [amount, setAmount] = useState("")
    const [date, setDate] = useState(todayISO())
    const [note, setNote] = useState("")

    const accounts = useQuery(api.goals.getGoalAccounts, convexUser && !isLinked ? { userId: convexUser._id } : "skip")
    const accountTxs = useQuery(
        api.contributions.getAccountTransactionsForWithdrawal,
        convexUser && isLinked && goal.linked_account
            ? { userId: convexUser._id, accountId: goal.linked_account._id, limit: 50 }
            : "skip"
    )

    const parsed = parseFloat(amount) || 0
    const isOverdraw = parsed > goal.current_amount

    const handleSelectTx = (tx: SelectedTx) => {
        setSelectedTx(tx)
        setAmount(Math.abs(tx.amount).toFixed(2))
        setDate(new Date(tx.date).toISOString().split("T")[0])
    }

    // For linked goals + matched tx: mirror the tx sign. Otherwise: always negative (withdrawal).
    const signedAmount = (): number => {
        if (parsed <= 0) return 0
        if (isLinked && selectedTx) return selectedTx.amount < 0 ? -parsed : parsed
        return -parsed
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!convexUser) return
        const amt = signedAmount()
        if (amt === 0) { toast.error("Enter a valid amount"); return }
        if (amt < 0 && Math.abs(amt) > goal.current_amount) { toast.error("Withdrawal exceeds balance"); return }
        try {
            await recordMovement({
                userId: convexUser._id,
                goalId: goal._id,
                amount: amt,
                date,
                note: note || undefined,
                transactionId: selectedTx?._id ?? undefined,
                ...(source === "account" && accountId && !selectedTx
                    ? { accountId: accountId as Id<"accounts"> }
                    : {}),
            })
            const isDeposit = amt > 0
            toast.success(isDeposit ? "Deposit recorded!" : "Withdrawal recorded!")
            onSuccess()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Something went wrong.")
        }
    }

    const canSubmit = parsed > 0 && !isOverdraw &&
        (!isLinked || linkedMode === "manual" || !!selectedTx)

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Balance */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
                </div>
                {parsed > 0 && (
                    <div className="flex justify-between border-t pt-1.5">
                        <span>After Withdrawal:</span>
                        <span className={cn("font-medium", isOverdraw && "text-red-600")}>
                            {formatCurrency(goal.current_amount - parsed)}
                        </span>
                    </div>
                )}
            </div>

            {/* LINKED_ACCOUNT flow */}
            {isLinked ? (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Button type="button" size="sm" variant={linkedMode === "match" ? "default" : "outline"}
                            className="flex-1 gap-1"
                            onClick={() => { setLinkedMode("match"); setSelectedTx(null); setAmount(""); setDate(todayISO()) }}>
                            <LinkIcon className="h-3 w-3" /> Match transaction
                        </Button>
                        <Button type="button" size="sm" variant={linkedMode === "manual" ? "default" : "outline"}
                            className="flex-1 gap-1"
                            onClick={() => { setLinkedMode("manual"); setSelectedTx(null) }}>
                            <Pencil className="h-3 w-3" /> Enter manually
                        </Button>
                    </div>

                    {linkedMode === "match" && (
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                                Transactions from {goal.linked_account!.name}
                            </Label>
                            {!accountTxs ? (
                                <p className="text-sm text-muted-foreground py-2">Loading…</p>
                            ) : accountTxs.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">No transactions found.</p>
                            ) : (
                                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                    {accountTxs.map(tx => {
                                        const isSelected = selectedTx?._id === tx._id
                                        const isDebit = tx.amount < 0
                                        return (
                                            <button key={tx._id} type="button"
                                                disabled={tx.alreadyLinked}
                                                onClick={() => handleSelectTx(tx as SelectedTx)}
                                                className={cn(
                                                    "w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors",
                                                    isSelected && "bg-primary/10 border-l-2 border-l-primary",
                                                    !isSelected && !tx.alreadyLinked && "hover:bg-muted/50",
                                                    tx.alreadyLinked && "opacity-40 cursor-not-allowed",
                                                )}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {isDebit
                                                        ? <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
                                                        : <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
                                                    }
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{tx.description || "Transaction"}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(tx.date), "MMM d, yyyy")}
                                                            {tx.alreadyLinked && <span className="ml-2 text-amber-600">· already linked</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={cn("font-semibold shrink-0", isDebit ? "text-red-600" : "text-green-600")}>
                                                    {formatCurrency(tx.amount)}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {selectedTx && (
                                <p className={cn("text-xs rounded px-2 py-1",
                                    selectedTx.amount < 0
                                        ? "text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                                        : "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40")}>
                                    {selectedTx.amount < 0 ? "→ Records as a withdrawal from the goal." : "→ Records as a deposit to the goal."}
                                </p>
                            )}
                            {!selectedTx && <p className="text-xs text-muted-foreground">Select a transaction to auto-fill amount and date.</p>}
                        </div>
                    )}
                </div>
            ) : (
                /* MANUAL goal: source picker */
                <div className="space-y-2">
                    <Label>Source</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant={source === "manual" ? "default" : "outline"}
                            className="h-auto py-2.5 flex flex-col items-center gap-1"
                            onClick={() => { setSource("manual"); setAccountId("") }}>
                            <HandCoins className="h-4 w-4" />
                            <span className="text-xs">Cash / Manual</span>
                        </Button>
                        <Button type="button" variant={source === "account" ? "default" : "outline"}
                            className="h-auto py-2.5 flex flex-col items-center gap-1"
                            onClick={() => setSource("account")}>
                            <CreditCard className="h-4 w-4" />
                            <span className="text-xs">From Account</span>
                        </Button>
                    </div>
                    {source === "account" && (
                        <div className="space-y-1">
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                                <SelectContent>
                                    {accounts?.map(a => (
                                        <SelectItem key={a._id} value={a._id}>{a.name} ({a.account_type})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Creates a withdrawal transaction on the selected account.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Amount + Date — shown when form is ready */}
            {(!isLinked || linkedMode === "manual" || selectedTx) && (
                <>
                    <div className="space-y-1.5">
                        <Label>Amount *</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" step="0.01" min="0.01" placeholder="0.00"
                                value={amount}
                                readOnly={!!selectedTx}
                                onChange={e => { if (!selectedTx) setAmount(e.target.value) }}
                                className={cn("pl-10", selectedTx && "bg-muted cursor-default")}
                                required />
                        </div>
                        {isOverdraw && (
                            <div className="flex items-center gap-1.5 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" /> Withdrawal exceeds current goal balance.
                            </div>
                        )}
                        {!selectedTx && goal.current_amount > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {[0.25, 0.5, 1].map(pct => (
                                    <Button key={pct} type="button" variant="outline" size="sm"
                                        onClick={() => setAmount((goal.current_amount * pct).toFixed(2))}>
                                        {pct === 1 ? "All" : `${pct * 100}%`}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Date *</Label>
                        <Input type="date" value={date}
                            readOnly={!!selectedTx}
                            onChange={e => { if (!selectedTx) setDate(e.target.value) }}
                            className={selectedTx ? "bg-muted cursor-default" : ""}
                            required />
                    </div>
                </>
            )}

            {/* Note */}
            <div className="space-y-1.5">
                <Label>Note (Optional)</Label>
                <Textarea placeholder="Reason…" value={note} onChange={e => setNote(e.target.value)} rows={2} />
            </div>

            <DialogFooter>
                <Button type="submit" variant="destructive" disabled={!canSubmit}>
                    {selectedTx
                        ? (selectedTx.amount < 0 ? "Record Withdrawal" : "Record Deposit")
                        : "Withdraw Funds"}
                </Button>
            </DialogFooter>
        </form>
    )
}

// ── Root Dialog ───────────────────────────────────────────────────────────────

const ACTION_META: Record<Action, { label: string; icon: React.ReactNode; description: string }> = {
    add: {
        label: "Add Money",
        icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
        description: "Fund this goal",
    },
    transfer: {
        label: "Transfer",
        icon: <ArrowRightLeft className="h-5 w-5 text-blue-500" />,
        description: "Move to another goal",
    },
    withdraw: {
        label: "Withdraw",
        icon: <TrendingDown className="h-5 w-5 text-amber-500" />,
        description: "Take money out",
    },
}

export function GoalActionDialog({
    goal,
    open,
    onOpenChange,
    formatCurrency,
    onGoalCompleted,
    initialAction,
}: GoalActionDialogProps) {
    const [action, setAction] = useState<Action | null>(initialAction ?? null)

    useEffect(() => {
        if (open) setAction(initialAction ?? null)
    }, [open, initialAction])

    const handleClose = () => onOpenChange(false)
    const handleSuccess = () => {
        if (action === "add" && goal) onGoalCompleted?.(goal)
        handleClose()
    }

    if (!goal) return null

    const noBalance = goal.current_amount === 0
    const title = action ? ACTION_META[action].label : "Move Money"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {action && (
                            <button type="button" onClick={() => setAction(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 rounded">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        )}
                        <DialogTitle className="flex items-center gap-2">
                            {action && ACTION_META[action].icon}
                            <span>{title}</span>
                            <span className="text-muted-foreground font-normal">— {goal.emoji} {goal.name}</span>
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {/* Direction picker */}
                {!action && (
                    <div className="grid grid-cols-3 gap-3 py-2">
                        <ActionCard
                            icon={<TrendingUp className="h-6 w-6 text-emerald-500" />}
                            label="Add Money"
                            description="Fund this goal"
                            onClick={() => setAction("add")}
                            variant="default"
                        />
                        <ActionCard
                            icon={<ArrowRightLeft className="h-6 w-6 text-blue-500" />}
                            label="Transfer"
                            description="Move to another goal"
                            onClick={() => setAction("transfer")}
                            disabled={noBalance}
                            variant="blue"
                        />
                        <ActionCard
                            icon={<TrendingDown className="h-6 w-6 text-amber-500" />}
                            label="Withdraw"
                            description="Take money out"
                            onClick={() => setAction("withdraw")}
                            disabled={noBalance}
                            variant="amber"
                        />
                    </div>
                )}

                {/* Forms */}
                {action === "add" && (
                    <AddForm goal={goal} formatCurrency={formatCurrency} onSuccess={handleSuccess} />
                )}
                {action === "transfer" && (
                    <TransferForm goal={goal} formatCurrency={formatCurrency} onSuccess={handleSuccess} />
                )}
                {action === "withdraw" && (
                    <WithdrawForm goal={goal} formatCurrency={formatCurrency} onSuccess={handleSuccess} />
                )}

                {/* Cancel on picker screen */}
                {!action && (
                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
