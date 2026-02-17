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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { currency, currencyExact, dateLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  Plus, Trash2, Pencil, CheckCircle2, Clock, XCircle,
  PiggyBank, TrendingUp, Wallet, CreditCard, AlertCircle,
  CalendarClock, DollarSign, ArrowRightLeft, Link2
} from "lucide-react"

type IncomePlan = {
  _id: Id<"income_plans">
  _creationTime: number
  userId: Id<"users">
  expected_date: string
  expected_amount: number
  label: string
  recurrence: string
  status: string
  notes?: string
  matched_transaction_id?: Id<"transactions">
  actual_amount?: number
  date_received?: string
  createdAt: number
}

export function IncomeView() {
  const { convexUser } = useConvexUser()

  const plans = useQuery(
    convexUser ? api.incomePlans.listIncomePlans : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) as IncomePlan[] | undefined

  const summary = useQuery(
    convexUser ? api.incomePlans.getIncomeSummary : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const accounts = useQuery(
    convexUser ? api.accounts.listAccounts : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const createPlan = useMutation(api.incomePlans.createIncomePlan)
  const updatePlan = useMutation(api.incomePlans.updateIncomePlan)
  const deletePlan = useMutation(api.incomePlans.deleteIncomePlan)
  const matchPlan = useMutation(api.incomePlans.matchIncomePlan)
  const unmatchPlan = useMutation(api.incomePlans.unmatchIncomePlan)
  const markMissedMut = useMutation(api.incomePlans.markMissed)
  const markPlannedMut = useMutation(api.incomePlans.markPlanned)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  const [selectedPlan, setSelectedPlan] = useState<IncomePlan | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<IncomePlan | null>(null)
  const [showMatch, setShowMatch] = useState(false)
  const [form, setForm] = useState({
    expected_date: new Date().toISOString().split("T")[0],
    expected_amount: "",
    label: "",
    recurrence: "none",
    notes: "",
  })

  // Get allocations for selected plan
  const selectedAllocations = useQuery(
    selectedPlan ? api.allocations.getAllocationsForPlan : ("skip" as never),
    selectedPlan ? { incomePlanId: selectedPlan._id } : "skip"
  )

  // Get suggested matches for the selected plan
  const suggestedMatches = useQuery(
    showMatch && selectedPlan && convexUser
      ? api.incomePlans.getSuggestedMatches
      : ("skip" as never),
    showMatch && selectedPlan && convexUser
      ? { planId: selectedPlan._id, userId: convexUser._id }
      : "skip"
  )

  // Preview allocation for the selected plan
  const allocationPreview = useQuery(
    selectedPlan && convexUser
      ? api.allocations.previewAllocation
      : ("skip" as never),
    selectedPlan && convexUser
      ? { userId: convexUser._id, amount: selectedPlan.actual_amount ?? selectedPlan.expected_amount }
      : "skip"
  )

  if (!convexUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  function resetForm() {
    setForm({
      expected_date: new Date().toISOString().split("T")[0],
      expected_amount: "",
      label: "",
      recurrence: "none",
      notes: "",
    })
  }

  function openAddDialog() {
    resetForm()
    setShowAdd(true)
  }

  function openEdit(plan: IncomePlan) {
    setForm({
      expected_date: plan.expected_date,
      expected_amount: String(plan.expected_amount),
      label: plan.label,
      recurrence: plan.recurrence,
      notes: plan.notes ?? "",
    })
    setEditing(plan)
  }

  async function handleAdd() {
    if (!form.label || !form.expected_amount || !convexUser) return
    const planId = await createPlan({
      userId: convexUser._id,
      expected_date: form.expected_date,
      expected_amount: Number(form.expected_amount),
      label: form.label,
      recurrence: form.recurrence,
      notes: form.notes || undefined,
    })
    // Run allocation forecast for the new plan
    await runAllocations({ userId: convexUser._id, incomePlanId: planId })
    resetForm()
    setShowAdd(false)
  }

  async function handleEdit() {
    if (!editing || !convexUser) return
    await updatePlan({
      planId: editing._id,
      expected_date: form.expected_date,
      expected_amount: Number(form.expected_amount),
      label: form.label,
      recurrence: form.recurrence,
      notes: form.notes || undefined,
    })
    // Recalculate allocations
    await runAllocations({ userId: convexUser._id, incomePlanId: editing._id })
    setEditing(null)
    resetForm()
  }

  async function handleMatch(transactionId: Id<"transactions">) {
    if (!selectedPlan || !convexUser) return
    await matchPlan({ planId: selectedPlan._id, transactionId })
    // Recalculate with actual amount
    await runAllocations({ userId: convexUser._id, incomePlanId: selectedPlan._id })
    setShowMatch(false)
    setSelectedPlan(null)
  }

  async function handleUnmatch() {
    if (!selectedPlan || !convexUser) return
    await unmatchPlan({ planId: selectedPlan._id })
    await runAllocations({ userId: convexUser._id, incomePlanId: selectedPlan._id })
    setSelectedPlan(null)
  }

  async function handleMarkMissed() {
    if (!selectedPlan) return
    await markMissedMut({ planId: selectedPlan._id })
    setSelectedPlan(null)
  }

  async function handleMarkPlanned() {
    if (!selectedPlan || !convexUser) return
    await markPlannedMut({ planId: selectedPlan._id })
    await runAllocations({ userId: convexUser._id, incomePlanId: selectedPlan._id })
    setSelectedPlan(null)
  }

  const statusConfig = {
    planned: { icon: Clock, color: "text-warning", bgColor: "bg-warning/10", borderColor: "border-warning/20", label: "Planned" },
    matched: { icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/20", label: "Matched" },
    missed: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/20", label: "Missed" },
  }

  const categoryConfig: Record<string, { icon: typeof PiggyBank; color: string; bgColor: string; label: string }> = {
    savings: { icon: PiggyBank, color: "text-primary", bgColor: "bg-primary/10", label: "Savings" },
    investing: { icon: TrendingUp, color: "text-chart-4", bgColor: "bg-chart-4/10", label: "Investing" },
    spending: { icon: Wallet, color: "text-chart-2", bgColor: "bg-chart-2/10", label: "Spending" },
    debt: { icon: CreditCard, color: "text-destructive", bgColor: "bg-destructive/10", label: "Debt" },
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Income Plans</h2>
          <p className="text-sm text-muted-foreground">
            Plan future income and see how each paycheck will be allocated across accounts.
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Income Plan
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CalendarClock className="h-4 w-4" />
                <span className="text-xs font-medium">Planned This Month</span>
              </div>
              <p className="text-2xl font-bold font-mono">{currency(summary.thisMonth.totalPlanned)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.thisMonth.plannedCount} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-success mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Matched</span>
              </div>
              <p className="text-2xl font-bold font-mono">{currency(summary.thisMonth.totalMatched)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.thisMonth.matchedCount} received</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <XCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Missed</span>
              </div>
              <p className="text-2xl font-bold font-mono">{currency(summary.thisMonth.totalMissed)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.thisMonth.missedCount} missed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Upcoming</span>
              </div>
              <p className="text-2xl font-bold font-mono">
                {currency(summary.upcoming.reduce((sum: number, p: { expected_amount: number }) => sum + p.expected_amount, 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{summary.upcoming.length} upcoming</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Income Plans Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expected Date</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead>Recurrence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map((plan) => {
                const config = statusConfig[plan.status as keyof typeof statusConfig] ?? statusConfig.planned
                const StatusIcon = config.icon
                const variance = plan.actual_amount != null
                  ? plan.actual_amount - plan.expected_amount
                  : null

                return (
                  <TableRow
                    key={plan._id}
                    className="cursor-pointer"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <TableCell className="text-foreground">{dateLabel(plan.expected_date)}</TableCell>
                    <TableCell className="font-medium text-foreground">{plan.label}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{currency(plan.expected_amount)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {plan.actual_amount != null ? (
                        <span className="font-semibold text-foreground">
                          {currency(plan.actual_amount)}
                          {variance !== null && variance !== 0 && (
                            <span className={cn(
                              "ml-1 text-xs",
                              variance > 0 ? "text-success" : "text-destructive"
                            )}>
                              {variance > 0 ? "+" : ""}{currency(variance)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">{plan.recurrence === "none" ? "-" : plan.recurrence}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(config.bgColor, config.color, config.borderColor)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{plan.notes ?? ""}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(plan)
                          }}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePlan({ planId: plan._id })
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!plans || plans.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No income plans yet. Click &quot;Add Income Plan&quot; to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedPlan} onOpenChange={() => { setSelectedPlan(null); setShowMatch(false) }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <SheetTitle>Income Plan Details</SheetTitle>
                <SheetDescription>
                  {selectedPlan && (
                    <div className="mt-1 space-y-1">
                      <div>{selectedPlan.label} - {dateLabel(selectedPlan.expected_date)}</div>
                      <div className="text-lg font-bold text-foreground">
                        {currency(selectedPlan.actual_amount ?? selectedPlan.expected_amount)}
                      </div>
                    </div>
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedPlan && (
            <>
              {/* Status + Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedPlan.status === "planned" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setShowMatch(true)} className="gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Match Transaction
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleMarkMissed} className="gap-1.5 text-destructive">
                      <XCircle className="h-3.5 w-3.5" />
                      Mark Missed
                    </Button>
                  </>
                )}
                {selectedPlan.status === "matched" && (
                  <Button size="sm" variant="outline" onClick={handleUnmatch} className="gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Unmatch
                  </Button>
                )}
                {selectedPlan.status === "missed" && (
                  <Button size="sm" variant="outline" onClick={handleMarkPlanned} className="gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Revert to Planned
                  </Button>
                )}
              </div>

              {/* Variance display for matched */}
              {selectedPlan.status === "matched" && selectedPlan.actual_amount != null && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Expected vs Actual</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Expected</p>
                        <p className="font-mono font-semibold">{currency(selectedPlan.expected_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Actual</p>
                        <p className="font-mono font-semibold">{currency(selectedPlan.actual_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Variance</p>
                        <p className={cn(
                          "font-mono font-semibold",
                          selectedPlan.actual_amount - selectedPlan.expected_amount > 0 ? "text-success" : "text-destructive"
                        )}>
                          {selectedPlan.actual_amount - selectedPlan.expected_amount > 0 ? "+" : ""}
                          {currency(selectedPlan.actual_amount - selectedPlan.expected_amount)}
                        </p>
                      </div>
                    </div>
                    {selectedPlan.date_received && (
                      <p className="text-xs text-muted-foreground text-center">
                        Received on {dateLabel(selectedPlan.date_received)}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Match Transaction UI */}
              {showMatch && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Suggested Matches</h4>
                    <p className="text-xs text-muted-foreground">
                      Income transactions near {dateLabel(selectedPlan.expected_date)} around {currency(selectedPlan.expected_amount)}
                    </p>
                    {suggestedMatches && suggestedMatches.length > 0 ? (
                      <div className="space-y-2">
                        {suggestedMatches.map((match) => (
                          <div
                            key={match._id}
                            className={cn(
                              "flex items-center justify-between rounded-lg border p-3",
                              match.alreadyMatched && "opacity-50"
                            )}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{match.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {dateLabel(new Date(match.date).toISOString().split("T")[0])} - {currencyExact(match.amount)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              disabled={match.alreadyMatched}
                              onClick={() => handleMatch(match._id as Id<"transactions">)}
                            >
                              {match.alreadyMatched ? "Matched" : "Match"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No matching income transactions found within 7 days of the expected date.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Allocation Preview / Breakdown */}
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedPlan.status === "matched" ? "Allocation Breakdown" : "Projected Allocation"}
                  </span>
                </div>

                {(() => {
                  const allocData = selectedAllocations && selectedAllocations.length > 0
                    ? selectedAllocations
                    : allocationPreview?.allocations?.map((a) => ({
                        accountName: a.accountName,
                        category: a.category,
                        amount: a.amount,
                      }))

                  if (!allocData || allocData.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No allocation rules configured. Set up rules on the Allocations page.
                      </p>
                    )
                  }

                  // Group by category
                  const groups: Record<string, Array<{ accountName: string; amount: number }>> = {}
                  for (const alloc of allocData) {
                    const cat = alloc.category
                    if (!groups[cat]) groups[cat] = []
                    groups[cat].push({ accountName: alloc.accountName, amount: alloc.amount })
                  }

                  const totalAmount = selectedPlan.actual_amount ?? selectedPlan.expected_amount
                  const totalAllocated = allocData.reduce((sum: number, a: { amount: number }) => sum + a.amount, 0)
                  const unallocated = Math.max(0, totalAmount - totalAllocated)

                  return (
                    <>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Allocation Progress</span>
                        <span className="font-medium">
                          {unallocated === 0 ? "100%" : `${Math.round((totalAllocated / totalAmount) * 100)}%`}
                        </span>
                      </div>
                      <Progress
                        value={unallocated === 0 ? 100 : (totalAllocated / totalAmount) * 100}
                        className="h-2"
                      />

                      <div className="space-y-4 mt-4">
                        {Object.entries(groups).map(([category, allocs]) => {
                          const config = categoryConfig[category] ?? categoryConfig.spending
                          const CatIcon = config.icon
                          const total = allocs.reduce((sum, a) => sum + a.amount, 0)

                          return (
                            <div key={category}>
                              <div className={cn("flex items-center gap-2 mb-3", config.color)}>
                                <CatIcon className="h-4 w-4" />
                                <span className="text-sm font-semibold">{config.label}</span>
                                <span className="ml-auto text-sm font-mono font-semibold">{currencyExact(total)}</span>
                              </div>
                              <div className="space-y-2 pl-6">
                                {allocs.map((alloc, idx) => (
                                  <div key={idx} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
                                    <p className="text-sm font-medium">{alloc.accountName}</p>
                                    <div className="text-right">
                                      <p className="font-mono text-sm font-semibold">{currencyExact(alloc.amount)}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {Math.round((alloc.amount / totalAmount) * 100)}%
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {unallocated > 0 && (
                        <>
                          <Separator className="my-4" />
                          <div className="rounded-lg border-2 border-dashed border-warning/50 bg-warning/5 p-4">
                            <div className="flex items-center gap-2 text-warning mb-2">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-semibold">Unallocated Funds</span>
                            </div>
                            <p className="text-2xl font-mono font-bold text-warning">
                              {currencyExact(unallocated)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Add allocation rules to distribute remaining funds
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit dialog */}
      <Dialog open={showAdd || !!editing} onOpenChange={(open) => {
        if (!open) {
          setShowAdd(false)
          setEditing(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Income Plan" : "Add Income Plan"}</DialogTitle>
            <DialogDescription>
              Plan future income. Allocations will be automatically forecasted based on your rules.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="e.g. Acme Corp Paycheck"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expected_date">Expected Date</Label>
              <Input
                id="expected_date"
                type="date"
                value={form.expected_date}
                onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expected_amount">Expected Amount</Label>
              <Input
                id="expected_amount"
                type="number"
                placeholder="4200"
                value={form.expected_amount}
                onChange={(e) => setForm({ ...form, expected_amount: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                <SelectTrigger id="recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAdd(false)
              setEditing(null)
            }}>
              Cancel
            </Button>
            <Button onClick={editing ? handleEdit : handleAdd}>
              {editing ? "Save Changes" : "Add Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
