"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
import {
  Trash2, ArrowUp, ArrowDown, Dot, MoreHorizontal, Power,
  Plus, SlidersHorizontal, Loader2,
} from "lucide-react"

type AllocationCategory = "savings" | "investing" | "spending" | "debt"
type RuleType = "percent" | "fixed"

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_DOT: Record<string, string> = {
  savings: "bg-primary",
  investing: "bg-chart-4",
  spending: "bg-chart-2",
  debt: "bg-destructive",
}

function CategoryDot({ category }: { category: string }) {
  return <div className={cn("h-2 w-2 rounded-full shrink-0", CATEGORY_DOT[category] ?? "bg-muted")} />
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AllocationsView({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { convexUser } = useConvexUser()

  const rules = useQuery(
    convexUser ? api.allocationRules.listRules : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )
  const accounts = useQuery(
    convexUser ? api.accounts.listAccounts : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )
  const goals = useQuery(
    convexUser ? api.goals.getGoals : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )
  const incomeSummary = useQuery(
    convexUser ? api.incomePlans.getIncomeSummary : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )
  const savedPreviewIncome = useQuery(
    convexUser ? api.allocationRules.getPreviewIncome : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )
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

  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteRuleId, setDeleteRuleId] = useState<Id<"allocation_rules"> | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [form, setForm] = useState({
    accountId: "",
    category: "savings" as AllocationCategory,
    ruleType: "fixed" as RuleType,
    value: "",
  })

  const sortedRules = rules ?? []
  const totalAllocated = preview?.allocations.reduce((s, a) => s + a.amount, 0) ?? 0
  const isDuplicateAccount = form.accountId
    ? sortedRules.some((r) => r.accountId === form.accountId)
    : false

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
    setShowAddForm(false)
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">

          {/* ── Header ── */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-base">Allocation Rules</DialogTitle>
              <DialogDescription className="text-xs">
                Automatically split each paycheck across accounts.
              </DialogDescription>
            </DialogHeader>

            {/* Preview income row */}
            <div className="flex items-center gap-2.5 mt-3">
              <span className="text-xs text-muted-foreground shrink-0">Preview with</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                  $
                </span>
                <Input
                  type="number"
                  value={previewAmount}
                  placeholder={
                    incomeSummary?.avgMonthlyIncome
                      ? String(incomeSummary.avgMonthlyIncome)
                      : "4200"
                  }
                  onChange={(e) => handlePreviewAmountChange(e.target.value)}
                  disabled={previewIncomeLoading}
                  className="h-7 w-28 text-xs pl-5"
                />
              </div>
              {preview && (
                <span className="text-xs text-muted-foreground">
                  →{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {currencyExact(totalAllocated)}
                  </span>
                  {preview.unallocated > 0 && (
                    <span className="text-amber-600">
                      {" "}· {currencyExact(preview.unallocated)} free
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* ── Rules list ── */}
          <div className="overflow-y-auto max-h-[50vh]">
            {rules === undefined ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : sortedRules.length === 0 && !showAddForm ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
                <SlidersHorizontal className="size-8 text-muted-foreground/20 mb-1" />
                <p className="text-sm font-medium">No rules yet</p>
                <p className="text-xs text-muted-foreground">
                  Rules run automatically when income is matched to a plan.
                </p>
              </div>
            ) : (
              <div className="py-1">
                {sortedRules.map((rule, idx) => {
                  const account = accounts?.find((a) => a._id === rule.accountId)
                  const ruleGoal = getLinkedGoal(rule.accountId)
                  const alloc = preview?.allocations.find((a) => a.accountId === rule.accountId)

                  return (
                    <div
                      key={rule._id}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-muted/40",
                        !rule.active && "opacity-40"
                      )}
                    >
                      {/* Reorder */}
                      <div className="flex flex-col shrink-0">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors disabled:opacity-0"
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx >= sortedRules.length - 1}
                          className="p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors disabled:opacity-0"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Category dot */}
                      <CategoryDot category={rule.category} />

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block leading-tight">
                          {ruleGoal
                            ? `${(ruleGoal as { emoji?: string }).emoji ?? ""} ${(ruleGoal as { name: string }).name}`.trim()
                            : account?.name ?? "Unknown"}
                        </span>
                        {ruleGoal && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {account?.name}
                          </span>
                        )}
                      </div>

                      {/* Category select */}
                      <Select
                        value={rule.category}
                        onValueChange={(v) => updateRuleMut({ ruleId: rule._id, category: v })}
                      >
                        <SelectTrigger className="h-6 text-[10px] w-[80px] shrink-0 border-0 bg-muted/60 px-2 gap-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="investing">Investing</SelectItem>
                          <SelectItem value="spending">Spending</SelectItem>
                          <SelectItem value="debt">Debt</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Rule type toggle + value */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="text-[10px] font-mono w-4 text-center text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() =>
                            updateRuleMut({
                              ruleId: rule._id,
                              ruleType: rule.ruleType === "percent" ? "fixed" : "percent",
                            })
                          }
                          title={`Switch to ${rule.ruleType === "percent" ? "fixed amount" : "percentage"}`}
                        >
                          {rule.ruleType === "percent" ? "%" : "$"}
                        </button>
                        <Input
                          type="number"
                          className="h-6 w-14 text-xs text-right tabular-nums border-0 bg-muted/60 px-1.5"
                          defaultValue={rule.value}
                          min={0}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val) && val !== rule.value)
                              updateRuleMut({ ruleId: rule._id, value: val })
                          }}
                        />
                      </div>

                      {/* Preview amount */}
                      <span className="w-14 text-right text-xs font-semibold tabular-nums text-foreground shrink-0">
                        {alloc ? currencyExact(alloc.amount) : "—"}
                      </span>

                      {/* Options */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            <span className="sr-only">Rule options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => updateRuleMut({ ruleId: rule._id, active: !rule.active })}
                          >
                            <Power className="h-3.5 w-3.5 mr-2" />
                            {rule.active ? "Disable" : "Enable"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteRuleId(rule._id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}

                {/* Over-allocation warning */}
                {preview?.allocations.some((a) => {
                  const expected =
                    a.ruleType === "percent"
                      ? (Number(effectivePreviewAmount) * a.ruleValue) / 100
                      : a.ruleValue
                  return a.amount < expected - 0.01
                }) && (
                  <div className="mx-4 my-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <p className="text-xs text-amber-600">
                      Some allocations were reduced because the income is less than the total rules.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Inline Add Rule form ── */}
          {showAddForm && (
            <div className="border-t border-border px-5 py-4 bg-muted/20 flex flex-col gap-3">
              {/* Account */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs flex items-center gap-1.5">
                  Account
                  {attempted && !form.accountId && (
                    <span className="text-[10px] text-destructive font-normal">required</span>
                  )}
                  {isDuplicateAccount && (
                    <span className="text-[10px] text-amber-600 font-normal">already has a rule</span>
                  )}
                </Label>
                <Select
                  value={form.accountId}
                  onValueChange={(v) => setForm({ ...form, accountId: v })}
                >
                  <SelectTrigger
                    className={cn(
                      "h-8 text-sm",
                      attempted && !form.accountId && "border-destructive/50"
                    )}
                  >
                    <SelectValue placeholder="Select account…" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      ?.slice()
                      .sort((a, b) => {
                        const aG = !!getLinkedGoal(a._id)
                        const bG = !!getLinkedGoal(b._id)
                        return aG === bG ? 0 : aG ? -1 : 1
                      })
                      .map((acc) => {
                        const linkedGoal = getLinkedGoal(acc._id)
                        return (
                          <SelectItem key={acc._id} value={acc._id}>
                            <span className="flex items-center gap-2">
                              <span>{acc.name}</span>
                              {linkedGoal && (
                                <>
                                  <Dot className="size-4 text-muted-foreground" />
                                  <span>{(linkedGoal as { emoji?: string }).emoji ?? "🎯"}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {(linkedGoal as { name: string }).name}
                                  </span>
                                </>
                              )}
                            </span>
                          </SelectItem>
                        )
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Category + Type + Value */}
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1 w-[100px] shrink-0">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v as AllocationCategory })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="investing">Investing</SelectItem>
                      <SelectItem value="spending">Spending</SelectItem>
                      <SelectItem value="debt">Debt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1 w-[68px] shrink-0">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={form.ruleType}
                    onValueChange={(v) => setForm({ ...form, ruleType: v as RuleType })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="fixed">$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <Label className="text-xs flex items-center gap-1">
                    {form.ruleType === "percent" ? "Percent" : "Amount"}
                    {attempted && (!form.value || Number(form.value) <= 0) && (
                      <span className="text-[10px] text-destructive font-normal">required</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder={form.ruleType === "percent" ? "10" : "500"}
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      min={0.01}
                      className={cn(
                        "h-8 text-sm",
                        form.ruleType === "percent" ? "pr-6" : "pl-5",
                        attempted &&
                          (!form.value || Number(form.value) <= 0) &&
                          "border-destructive/50"
                      )}
                    />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"
                      style={{
                        [form.ruleType === "percent" ? "right" : "left"]: "0.625rem",
                      }}
                    >
                      {form.ruleType === "percent" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form actions */}
              <div className="flex gap-2 justify-end pt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setShowAddForm(false); resetForm() }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAdd}
                  disabled={isDuplicateAccount}
                >
                  Add Rule
                </Button>
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-muted/5">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {sortedRules.length > 0 && (
                <span>{sortedRules.length} rule{sortedRules.length !== 1 ? "s" : ""}</span>
              )}
              {preview && totalAllocated > 0 && (
                <span className="text-foreground font-medium tabular-nums">
                  {currencyExact(totalAllocated)} allocated
                </span>
              )}
              {preview && preview.unallocated > 0 && (
                <span className="text-amber-600 font-medium tabular-nums">
                  {currencyExact(preview.unallocated)} free
                </span>
              )}
            </div>
            {!showAddForm && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="size-3" />
                Add Rule
              </Button>
            )}
          </div>

        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the rule. Existing income distributions won&apos;t be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteRuleId) deleteRuleMut({ ruleId: deleteRuleId })
                setDeleteRuleId(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
