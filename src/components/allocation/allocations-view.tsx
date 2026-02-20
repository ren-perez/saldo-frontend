"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { currencyExact } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Trash2, ArrowUp, ArrowDown, Target, Dot } from "lucide-react"

type AllocationCategory = "savings" | "investing" | "spending" | "debt"
type RuleType = "percent" | "fixed"

export function AllocationsView({ externalShowAdd, onExternalShowAddChange }: { externalShowAdd?: boolean; onExternalShowAddChange?: (v: boolean) => void } = {}) {
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

  const [previewAmount, setPreviewAmount] = useState("")
  const [previewInitialized, setPreviewInitialized] = useState(false)

  useEffect(() => {
    if (!previewInitialized && incomeSummary?.avgMonthlyIncome) {
      setPreviewAmount(String(incomeSummary.avgMonthlyIncome))
      setPreviewInitialized(true)
    }
  }, [incomeSummary, previewInitialized])

  const effectivePreviewAmount = previewAmount || "4200"

  const preview = useQuery(
    convexUser ? api.allocations.previewAllocation : ("skip" as never),
    convexUser ? { userId: convexUser._id, amount: Number(effectivePreviewAmount) || 0 } : "skip"
  )

  const createRule = useMutation(api.allocationRules.createRule)
  const updateRuleMut = useMutation(api.allocationRules.updateRule)
  const deleteRuleMut = useMutation(api.allocationRules.deleteRule)
  const reorderRulesMut = useMutation(api.allocationRules.reorderRules)

  const [internalShowAdd, setInternalShowAdd] = useState(false)
  const showAdd = externalShowAdd ?? internalShowAdd
  const setShowAdd = onExternalShowAddChange ?? setInternalShowAdd
  const [deleteRuleId, setDeleteRuleId] = useState<Id<"allocation_rules"> | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [form, setForm] = useState({
    accountId: "",
    category: "savings" as AllocationCategory,
    ruleType: "fixed" as RuleType,
    value: "",
  })

  if (!convexUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const sortedRules = rules ?? []
  const totalAllocated = preview?.allocations.reduce((sum, a) => sum + a.amount, 0) ?? 0

  const isDuplicateAccount = form.accountId
    ? sortedRules.some((r) => r.accountId === form.accountId)
    : false

  async function handleAdd() {
    setAttempted(true)
    const numValue = Number(form.value)
    if (!form.accountId || !form.value || numValue <= 0 || isDuplicateAccount || !convexUser) return
    await createRule({
      userId: convexUser._id,
      accountId: form.accountId as Id<"accounts">,
      category: form.category,
      ruleType: form.ruleType,
      value: Number(form.value),
      priority: sortedRules.length,
      active: true,
    })
    setForm({ accountId: "", category: "savings", ruleType: "fixed", value: "" })
    setAttempted(false)
    setShowAdd(false)
  }

  async function moveUp(idx: number) {
    if (idx === 0 || !sortedRules.length) return
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
      {/* Preview Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Distribute Your Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="previewIncome" className="whitespace-nowrap text-sm text-muted-foreground">Sample income:</Label>
            <Input
              id="previewIncome"
              type="number"
              value={previewAmount}
              placeholder={incomeSummary?.avgMonthlyIncome ? String(incomeSummary.avgMonthlyIncome) : "4200"}
              onChange={(e) => setPreviewAmount(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-2">
            {preview?.allocations.map((alloc, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-secondary px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    alloc.category === "savings" && "bg-primary",
                    alloc.category === "investing" && "bg-chart-4",
                    alloc.category === "spending" && "bg-chart-2",
                    alloc.category === "debt" && "bg-destructive"
                  )} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {alloc.goalName
                        ? `${alloc.goalEmoji ?? ""} ${alloc.goalName}`.trim()
                        : alloc.accountName}
                    </span>
                    {alloc.goalName && (
                      <span className="text-xs text-muted-foreground truncate">{alloc.accountName}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({alloc.ruleType === "percent" ? `${alloc.ruleValue}%` : `$${alloc.ruleValue.toLocaleString()}`})
                  </span>
                </div>
                <span className="tabular-nums font-semibold text-foreground shrink-0 ml-3">{currencyExact(alloc.amount)}</span>
              </div>
            ))}
            {preview && preview.unallocated > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Unallocated</span>
                <span className="tabular-nums font-semibold text-warning">{currencyExact(preview.unallocated)}</span>
              </div>
            )}
            {preview && preview.allocations.some((a) => {
              const expectedAmount = a.ruleType === "percent"
                ? (Number(effectivePreviewAmount) * a.ruleValue) / 100
                : a.ruleValue
              return a.amount < expectedAmount - 0.01
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
              <span className={cn(
                "tabular-nums font-bold",
                preview && preview.unallocated > 0 ? "text-warning" : "text-primary"
              )}>{currencyExact(preview?.unallocated ?? 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRules.map((rule, idx) => {
                const account = accounts?.find((a) => a._id === rule.accountId)
                const ruleGoal = goals?.find(
                  (g: { linked_account?: { _id: string } | null; is_completed?: boolean }) =>
                    g.linked_account?._id === rule.accountId && !g.is_completed
                )
                return (
                  <TableRow
                    key={rule._id}
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      !rule.active && "opacity-50"
                    )}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-0.5 ml-2">
                        <button
                          onClick={() => moveUp(idx)}
                          className="rounded p-0.5 hover:bg-secondary text-muted-foreground"
                          aria-label="Move rule up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          className="rounded p-0.5 hover:bg-secondary text-muted-foreground"
                          aria-label="Move rule down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          rule.category === "savings" && "bg-primary",
                          rule.category === "investing" && "bg-chart-4",
                          rule.category === "spending" && "bg-chart-2",
                          rule.category === "debt" && "bg-destructive"
                        )} />
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {ruleGoal
                              ? `${(ruleGoal as { emoji?: string }).emoji ?? ""} ${(ruleGoal as { name: string }).name}`.trim()
                              : account?.name ?? "Unknown"}
                          </span>
                          {ruleGoal && (
                            <span className="text-xs text-muted-foreground">
                              {account?.name ?? "Unknown"}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rule.category}
                        onValueChange={(v) => updateRuleMut({ ruleId: rule._id, category: v })}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="investing">Investing</SelectItem>
                          <SelectItem value="spending">Spending</SelectItem>
                          <SelectItem value="debt">Debt</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rule.ruleType}
                        onValueChange={(v) => updateRuleMut({ ruleId: rule._id, ruleType: v })}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percent</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={rule.value}
                        onChange={(e) => updateRuleMut({ ruleId: rule._id, value: Number(e.target.value) })}
                        className="w-24 h-8 text-xs text-right ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={(checked) => updateRuleMut({ ruleId: rule._id, active: checked })}
                        aria-label={`Toggle rule for ${account?.name || "unknown"}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mr-2"
                        onClick={() => setDeleteRuleId(rule._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="sr-only">Delete rule</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {sortedRules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No allocation rules yet. Click &quot;Add Rule&quot; to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add rule dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => {
        setShowAdd(v)
        if (!v) {
          setAttempted(false)
          setForm({ accountId: "", category: "savings", ruleType: "fixed", value: "" })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allocation Rule</DialogTitle>
            <DialogDescription>
              Choose an account and define how income should be allocated.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1">
                Account
                {attempted && !form.accountId && (
                  <span className="text-[10px] text-destructive font-normal">required</span>
                )}
              </Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                <SelectTrigger className={cn(attempted && !form.accountId && "border-destructive/50")}>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {/* Accounts with linked goals first */}
                  {accounts
                    ?.slice()
                    .sort((a, b) => {
                      const aGoal = goals?.find(
                        (g: { linked_account?: { _id: string } | null; is_completed?: boolean }) =>
                          g.linked_account?._id === a._id && !g.is_completed
                      )
                      const bGoal = goals?.find(
                        (g: { linked_account?: { _id: string } | null; is_completed?: boolean }) =>
                          g.linked_account?._id === b._id && !g.is_completed
                      )
                      if (aGoal && !bGoal) return -1
                      if (!aGoal && bGoal) return 1
                      return 0
                    })
                    .map((acc) => {
                      const linkedGoal = goals?.find(
                        (g: { linked_account?: { _id: string } | null; is_completed?: boolean }) =>
                          g.linked_account?._id === acc._id && !g.is_completed
                      )
                      return (
                        <SelectItem key={acc._id} value={acc._id}>
                          <span className="flex items-center gap-2">
                            <span>{acc.name}</span>
                            {/* <span className="mx-2 text-3xl">·</span> */}
                            {linkedGoal && (
                              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                                <Dot className="size-6" />
                                <span>{(linkedGoal as { emoji?: string }).emoji ?? "🎯"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {(linkedGoal as { name: string }).name}
                                </span>
                              </div>
                            )}
                          </span>
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
              {/* {form.accountId && (() => {
                const linkedGoal = goals?.find(
                  (g: { linked_account?: { _id: string } | null; is_completed?: boolean }) =>
                    g.linked_account?._id === form.accountId && !g.is_completed
                )
                if (!linkedGoal) return null
                return (
                  <div className="flex items-center gap-1.5 rounded-md bg-primary/5 border border-primary/10 px-2.5 py-1.5 mt-0.5">
                    <Target className="size-3 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      Linked to goal:{" "}
                      <span className="font-medium text-foreground">
                        {(linkedGoal as { emoji?: string }).emoji ?? ""} {(linkedGoal as { name: string }).name}
                      </span>
                    </span>
                  </div>
                )
              })()} */}
              {isDuplicateAccount && (
                <span className="text-[11px] text-amber-600">
                  This account already has a rule. Each account can only have one allocation rule.
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as AllocationCategory })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                {form.ruleType === "percent" ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                ) : (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
                )}
              </div>
              {form.ruleType === "percent" && form.value && (
                <span className="text-[11px] text-muted-foreground">
                  {Number(form.value)}% of each paycheck
                </span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAdd(false)
              setAttempted(false)
              setForm({ accountId: "", category: "savings", ruleType: "fixed", value: "" })
            }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isDuplicateAccount || (attempted && (!form.accountId || !form.value || Number(form.value) <= 0))}>
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
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
              onClick={() => {
                if (deleteRuleId) deleteRuleMut({ ruleId: deleteRuleId })
                setDeleteRuleId(null)
              }}
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
