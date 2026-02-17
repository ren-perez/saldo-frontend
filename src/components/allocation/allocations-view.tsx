"use client"

import { useState } from "react"
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
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"

type AllocationCategory = "savings" | "investing" | "spending" | "debt"
type RuleType = "percent" | "fixed"

export function AllocationsView() {
  const { convexUser } = useConvexUser()

  const rules = useQuery(
    convexUser ? api.allocationRules.listRules : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )
  const accounts = useQuery(
    convexUser ? api.accounts.listAccounts : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const [previewAmount, setPreviewAmount] = useState("4200")
  const preview = useQuery(
    convexUser ? api.allocations.previewAllocation : ("skip" as never),
    convexUser ? { userId: convexUser._id, amount: Number(previewAmount) || 0 } : "skip"
  )

  const createRule = useMutation(api.allocationRules.createRule)
  const updateRuleMut = useMutation(api.allocationRules.updateRule)
  const deleteRuleMut = useMutation(api.allocationRules.deleteRule)
  const reorderRulesMut = useMutation(api.allocationRules.reorderRules)

  const [showAdd, setShowAdd] = useState(false)
  const [deleteRuleId, setDeleteRuleId] = useState<Id<"allocation_rules"> | null>(null)
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

  async function handleAdd() {
    if (!form.accountId || !form.value || !convexUser) return
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Allocation Rules</h2>
          <p className="text-sm text-muted-foreground">
            Define how each paycheck is distributed across your accounts.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Preview Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Per-Paycheck Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="previewIncome" className="whitespace-nowrap text-sm text-muted-foreground">Sample income:</Label>
            <Input
              id="previewIncome"
              type="number"
              value={previewAmount}
              onChange={(e) => setPreviewAmount(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-2">
            {preview?.allocations.map((alloc, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-secondary px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    alloc.category === "savings" && "bg-primary",
                    alloc.category === "investing" && "bg-chart-4",
                    alloc.category === "spending" && "bg-chart-2",
                    alloc.category === "debt" && "bg-destructive"
                  )} />
                  <span className="text-sm font-medium text-foreground">{alloc.accountName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({alloc.ruleType === "percent" ? `${alloc.ruleValue}%` : `$${alloc.ruleValue.toLocaleString()}`})
                  </span>
                </div>
                <span className="font-mono font-semibold text-foreground">{currencyExact(alloc.amount)}</span>
              </div>
            ))}
            {preview && preview.unallocated > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Unallocated</span>
                <span className="font-mono font-semibold text-warning">{currencyExact(preview.unallocated)}</span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="mt-4 flex flex-col gap-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total Allocated</span>
              <span className="font-mono font-bold text-foreground">{currencyExact(totalAllocated)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Unallocated</span>
              <span className={cn(
                "font-mono font-bold",
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
                return (
                  <TableRow
                    key={rule._id}
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      !rule.active && "opacity-50"
                    )}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
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
                          "h-2 w-2 rounded-full",
                          rule.category === "savings" && "bg-primary",
                          rule.category === "investing" && "bg-chart-4",
                          rule.category === "spending" && "bg-chart-2",
                          rule.category === "debt" && "bg-destructive"
                        )} />
                        <span className="font-medium text-foreground">
                          {account?.name ?? "Unknown"}
                        </span>
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
                        className="h-8 w-8"
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
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allocation Rule</DialogTitle>
            <DialogDescription>
              Choose an account and define how income should be allocated.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Account</Label>
              <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((acc) => (
                    <SelectItem key={acc._id} value={acc._id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Value</Label>
              <Input
                type="number"
                placeholder={form.ruleType === "percent" ? "e.g. 10" : "e.g. 500"}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Rule</Button>
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
