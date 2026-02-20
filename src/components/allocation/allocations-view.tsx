"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { currencyExact } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Trash2, ArrowUp, ArrowDown, Dot, MoreHorizontal, Power } from "lucide-react"

type AllocationCategory = "savings" | "investing" | "spending" | "debt"
type RuleType = "percent" | "fixed"

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_DOT: Record<string, string> = {
  savings: "bg-primary",
  investing: "bg-chart-4",
  spending: "bg-chart-2",
  debt: "bg-destructive",
}

function CategoryDot({ category }: { category: string }) {
  return <div className={cn("h-2 w-2 rounded-full shrink-0", CATEGORY_DOT[category])} />
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function ValueInput({ value, ruleType, onChange }: {
  value: number
  ruleType: string
  onChange: (v: number) => void
}) {
  const isPercent = ruleType === "percent"
  return (
    <div className="relative">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("h-7 text-xs w-full sm:w-20 bg-background/60 border-0", isPercent ? "pr-5" : "pl-4")}
      />
      <span
        className="absolute top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none"
        style={{ [isPercent ? "right" : "left"]: "0.5rem" }}
      >
        {isPercent ? "%" : "$"}
      </span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AllocationsView({
  externalShowAdd,
  onExternalShowAddChange,
}: { externalShowAdd?: boolean; onExternalShowAddChange?: (v: boolean) => void } = {}) {
  const { convexUser } = useConvexUser()

  const rules = useQuery(convexUser ? api.allocationRules.listRules : ("skip" as never), convexUser ? { userId: convexUser._id } : "skip")
  const accounts = useQuery(convexUser ? api.accounts.listAccounts : ("skip" as never), convexUser ? { userId: convexUser._id } : "skip")
  const goals = useQuery(convexUser ? api.goals.getGoals : ("skip" as never), convexUser ? { userId: convexUser._id } : "skip")
  const incomeSummary = useQuery(convexUser ? api.incomePlans.getIncomeSummary : ("skip" as never), convexUser ? { userId: convexUser._id } : "skip")
  const savedPreviewIncome = useQuery(convexUser ? api.allocationRules.getPreviewIncome : ("skip" as never), convexUser ? { userId: convexUser._id } : "skip")
  const previewIncomeLoading = savedPreviewIncome === undefined

  const setPreviewIncomeMut = useMutation(api.allocationRules.setPreviewIncome)
  const createRule = useMutation(api.allocationRules.createRule)
  const updateRuleMut = useMutation(api.allocationRules.updateRule)
  const deleteRuleMut = useMutation(api.allocationRules.deleteRule)
  const reorderRulesMut = useMutation(api.allocationRules.reorderRules)

  const [previewAmount, setPreviewAmount] = useState("")
  const [previewInitialized, setPreviewInitialized] = useState(false)

  useEffect(() => {
    if (previewInitialized) return
    if (savedPreviewIncome != null) {
      setPreviewAmount(String(savedPreviewIncome))
      setPreviewInitialized(true)
    } else if (incomeSummary?.avgMonthlyIncome) {
      setPreviewAmount(String(incomeSummary.avgMonthlyIncome))
      setPreviewInitialized(true)
    }
  }, [savedPreviewIncome, incomeSummary, previewInitialized])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handlePreviewAmountChange = useCallback((val: string) => {
    setPreviewAmount(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const num = Number(val)
      if (convexUser && num > 0) setPreviewIncomeMut({ userId: convexUser._id, amount: num })
    }, 800)
  }, [convexUser, setPreviewIncomeMut])

  const effectivePreviewAmount = previewAmount || "4200"
  const preview = useQuery(
    convexUser ? api.allocations.previewAllocation : ("skip" as never),
    convexUser ? { userId: convexUser._id, amount: Number(effectivePreviewAmount) || 0 } : "skip"
  )

  const [internalShowAdd, setInternalShowAdd] = useState(false)
  const showAdd = externalShowAdd ?? internalShowAdd
  const setShowAdd = onExternalShowAddChange ?? setInternalShowAdd
  const [deleteRuleId, setDeleteRuleId] = useState<Id<"allocation_rules"> | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [form, setForm] = useState({
    accountId: "", category: "savings" as AllocationCategory, ruleType: "fixed" as RuleType, value: "",
  })

  if (!convexUser) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )

  const sortedRules = rules ?? []
  const totalAllocated = preview?.allocations.reduce((sum, a) => sum + a.amount, 0) ?? 0
  const isDuplicateAccount = form.accountId ? sortedRules.some((r) => r.accountId === form.accountId) : false

  function getLinkedGoal(accountId: string) {
    return goals?.find(
      (g: { linked_account?: { _id: string } | null; is_completed?: boolean }) =>
        g.linked_account?._id === accountId && !g.is_completed
    )
  }

  function resetForm() {
    setAttempted(false)
    setForm({ accountId: "", category: "savings", ruleType: "fixed", value: "" })
  }

  async function handleAdd() {
    setAttempted(true)
    const numValue = Number(form.value)
    if (!form.accountId || !form.value || numValue <= 0 || isDuplicateAccount || !convexUser) return
    await createRule({
      userId: convexUser._id,
      accountId: form.accountId as Id<"accounts">,
      category: form.category,
      ruleType: form.ruleType,
      value: numValue,
      priority: sortedRules.length,
      active: true,
    })
    resetForm()
    setShowAdd(false)
  }

  async function moveUp(idx: number) {
    if (idx === 0) return
    const ids = sortedRules.map((r) => r._id)
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    await reorderRulesMut({ ruleIds: ids })
  }

  async function moveDown(idx: number) {
    if (idx >= sortedRules.length - 1) return
    const ids = sortedRules.map((r) => r._id)
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    await reorderRulesMut({ ruleIds: ids })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Distribute Your Income</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Sample income input */}
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="previewIncome" className="whitespace-nowrap text-sm text-muted-foreground">
              Sample income:
            </Label>
            <div className="relative w-40">
              <Input
                id="previewIncome"
                type="number"
                value={previewAmount}
                placeholder={incomeSummary?.avgMonthlyIncome ? String(incomeSummary.avgMonthlyIncome) : "4200"}
                onChange={(e) => handlePreviewAmountChange(e.target.value)}
                disabled={previewIncomeLoading}
                className="w-40 pr-8"
              />
              {previewIncomeLoading && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2"><SpinnerIcon /></div>
              )}
            </div>
          </div>

          {/* Rules list */}
          <div className="flex flex-col gap-2">
            {sortedRules.length === 0 && (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No allocation rules yet. Click &quot;Add Rule&quot; to create one.
              </div>
            )}

            {sortedRules.map((rule, idx) => {
              const account = accounts?.find((a) => a._id === rule.accountId)
              const ruleGoal = getLinkedGoal(rule.accountId)
              const alloc = preview?.allocations.find((a) => a.accountId === rule.accountId)

              return (
                <div
                  key={rule._id}
                  className={cn(
                    "rounded-lg bg-secondary px-4 py-3 flex items-start gap-3 transition-opacity",
                    !rule.active && "opacity-50"
                  )}
                >
                  {/* Reorder - pins left */}
                  <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                    <button onClick={() => moveUp(idx)} className="rounded p-0.5 hover:bg-background/60 text-muted-foreground" aria-label="Move rule up">
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => moveDown(idx)} className="rounded p-0.5 hover:bg-background/60 text-muted-foreground" aria-label="Move rule down">
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Middle content - three stacked rows, full width */}
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Row 1: color dot + name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryDot category={rule.category} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {ruleGoal
                            ? `${(ruleGoal as { emoji?: string }).emoji ?? ""} ${(ruleGoal as { name: string }).name}`.trim()
                            : account?.name ?? "Unknown"}
                        </span>
                        {ruleGoal && (
                          <span className="text-xs text-muted-foreground truncate">{account?.name ?? "Unknown"}</span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: controls - each on its own line on mobile, row on sm+ */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                      <Select value={rule.category} onValueChange={(v) => updateRuleMut({ ruleId: rule._id, category: v })}>
                        <SelectTrigger className="h-7 text-xs w-full sm:w-28 bg-background/60 border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="investing">Investing</SelectItem>
                          <SelectItem value="spending">Spending</SelectItem>
                          <SelectItem value="debt">Debt</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={rule.ruleType} onValueChange={(v) => updateRuleMut({ ruleId: rule._id, ruleType: v })}>
                        <SelectTrigger className="h-7 text-xs w-full sm:w-24 bg-background/60 border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percent</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                        </SelectContent>
                      </Select>

                      <ValueInput
                        value={rule.value}
                        ruleType={rule.ruleType}
                        onChange={(v) => updateRuleMut({ ruleId: rule._id, value: v })}
                      />
                    </div>

                    {/* Row 3: allocated amount */}
                    <span className="tabular-nums font-semibold text-foreground text-sm">
                      {alloc ? currencyExact(alloc.amount) : "—"}
                    </span>
                  </div>

                  {/* 3-dots menu - pins right */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Rule options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateRuleMut({ ruleId: rule._id, active: !rule.active })}>
                        <Power className="h-4 w-4 mr-2" />
                        {rule.active ? "Disable rule" : "Enable rule"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteRuleId(rule._id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete rule
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}

            {/* Unallocated row */}
            {preview && preview.unallocated > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Unallocated</span>
                <span className="tabular-nums font-semibold text-warning">{currencyExact(preview.unallocated)}</span>
              </div>
            )}

            {/* Over-allocation warning */}
            {preview?.allocations.some((a) => {
              const expected = a.ruleType === "percent" ? (Number(effectivePreviewAmount) * a.ruleValue) / 100 : a.ruleValue
              return a.amount < expected - 0.01
            }) && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
                <span className="text-xs text-amber-600">
                  Some allocations were reduced because the income is less than the total rules. Consider adjusting your rules or increasing the sample income.
                </span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="mt-4 flex flex-col gap-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total Allocated</span>
              <span className="tabular-nums font-bold text-foreground">{currencyExact(totalAllocated)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Unallocated</span>
              <span className={cn("tabular-nums font-bold", preview && preview.unallocated > 0 ? "text-warning" : "text-primary")}>
                {currencyExact(preview?.unallocated ?? 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add rule dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allocation Rule</DialogTitle>
            <DialogDescription>Choose an account and define how income should be allocated.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1">
                Account
                {attempted && !form.accountId && <span className="text-[10px] text-destructive font-normal">required</span>}
              </Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                <SelectTrigger className={cn(attempted && !form.accountId && "border-destructive/50")}>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    ?.slice()
                    .sort((a, b) => {
                      const aHasGoal = !!getLinkedGoal(a._id)
                      const bHasGoal = !!getLinkedGoal(b._id)
                      return aHasGoal === bHasGoal ? 0 : aHasGoal ? -1 : 1
                    })
                    .map((acc) => {
                      const linkedGoal = getLinkedGoal(acc._id)
                      return (
                        <SelectItem key={acc._id} value={acc._id}>
                          <span className="flex items-center gap-2">
                            <span>{acc.name}</span>
                            {linkedGoal && (
                              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                                <Dot className="size-6" />
                                <span>{(linkedGoal as { emoji?: string }).emoji ?? "🎯"}</span>
                                <span className="text-xs text-muted-foreground">{(linkedGoal as { name: string }).name}</span>
                              </div>
                            )}
                          </span>
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
              {isDuplicateAccount && (
                <span className="text-[11px] text-amber-600">This account already has a rule. Each account can only have one allocation rule.</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as AllocationCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="investing">Investing</SelectItem>
                    <SelectItem value="spending">Spending</SelectItem>
                    <SelectItem value="debt">Debt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rule Type</Label>
                <Select value={form.ruleType} onValueChange={(v) => setForm({ ...form, ruleType: v as RuleType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1">
                {form.ruleType === "percent" ? "Percentage" : "Amount"}
                {attempted && (!form.value || Number(form.value) <= 0) && (
                  <span className="text-[10px] text-destructive font-normal">
                    {!form.value ? "required" : "must be greater than 0"}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={form.ruleType === "percent" ? "e.g. 10" : "e.g. 500"}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  min={0.01}
                  className={cn(
                    form.ruleType === "percent" ? "pr-8" : "pl-6",
                    attempted && (!form.value || Number(form.value) <= 0) && "border-destructive/50"
                  )}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"
                  style={{ [form.ruleType === "percent" ? "right" : "left"]: "0.75rem" }}
                >
                  {form.ruleType === "percent" ? "%" : "$"}
                </span>
              </div>
              {form.ruleType === "percent" && form.value && (
                <span className="text-[11px] text-muted-foreground">{Number(form.value)}% of each paycheck</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isDuplicateAccount || (attempted && (!form.accountId || !form.value || Number(form.value) <= 0))}>
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allocation Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the allocation rule and recalculate all income distributions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteRuleId) deleteRuleMut({ ruleId: deleteRuleId }); setDeleteRuleId(null) }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}