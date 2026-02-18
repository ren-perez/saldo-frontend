"use client"

import { useState, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { IncomePlan } from "./income-shared"

interface IncomeFormData {
  label: string
  expected_date: string
  expected_amount: string
  recurrence: string
  notes: string
}

export function IncomeFormDialog({
  plan,
  userId,
  open,
  onOpenChange,
}: {
  plan: IncomePlan | null
  userId: Id<"users">
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const isEdit = !!plan
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<IncomeFormData>({
    label: plan?.label ?? "",
    expected_date:
      plan?.expected_date ?? new Date().toISOString().split("T")[0],
    expected_amount: plan?.expected_amount?.toString() ?? "",
    recurrence: plan?.recurrence ?? "monthly",
    notes: plan?.notes ?? "",
  })

  useMemo(() => {
    setForm({
      label: plan?.label ?? "",
      expected_date:
        plan?.expected_date ?? new Date().toISOString().split("T")[0],
      expected_amount: plan?.expected_amount?.toString() ?? "",
      recurrence: plan?.recurrence ?? "monthly",
      notes: plan?.notes ?? "",
    })
  }, [plan])

  const createPlan = useMutation(api.incomePlans.createIncomePlan)
  const updatePlan = useMutation(api.incomePlans.updateIncomePlan)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  async function handleSave() {
    const amount = parseFloat(form.expected_amount)
    if (!form.label || !form.expected_date || isNaN(amount)) return
    setSaving(true)
    try {
      if (isEdit && plan) {
        await updatePlan({
          planId: plan._id,
          label: form.label,
          expected_date: form.expected_date,
          expected_amount: amount,
          recurrence: form.recurrence,
          notes: form.notes || undefined,
        })
        if (plan.status === "planned") {
          await runAllocations({ userId, incomePlanId: plan._id })
        }
      } else {
        const planId = await createPlan({
          userId,
          label: form.label,
          expected_date: form.expected_date,
          expected_amount: amount,
          recurrence: form.recurrence,
          notes: form.notes || undefined,
        })
        await runAllocations({ userId, incomePlanId: planId })
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  function setField(key: keyof IncomeFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Income" : "Add Income"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this income plan."
              : "Plan an expected income and automatically run allocations."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Label</Label>
            <Input
              placeholder="e.g. Salary, Freelance Invoice..."
              value={form.label}
              onChange={(e) => setField("label", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Expected Date</Label>
              <Input
                type="date"
                value={form.expected_date}
                onChange={(e) => setField("expected_date", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Expected Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.expected_amount}
                onChange={(e) => setField("expected_amount", e.target.value)}
                min={0}
                step={100}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Recurrence</Label>
            <Select
              value={form.recurrence}
              onValueChange={(v) => setField("recurrence", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">One-time</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              placeholder="Any details about this income..."
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={3}
            />
          </div>

          {isEdit && plan?.status === "planned" && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              Saving will re-run allocation rules with the updated amount.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Create & Allocate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
