"use client"

import { useState, useEffect } from "react"
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
import { cn } from "@/lib/utils"
import { IncomePlan } from "./income-shared"

// TODO: Goal Withdrawals must NOT be created as IncomePlan records.
// They must be handled via a dedicated Goal UI mutation, completely
// decoupled from the income_plans table. Do not add withdrawal flows here.

interface IncomeFormData {
  label: string
  expected_date: string
  expected_amount: string
  recurrence: string
  notes: string
  scheduleDays: string // comma-separated day numbers, e.g. "5, 20"
}

type FormErrors = Partial<Record<keyof IncomeFormData, string>>

function emptyForm(plan: IncomePlan | null): IncomeFormData {
  return {
    label: plan?.label ?? "",
    expected_date: plan?.expected_date ?? new Date().toISOString().split("T")[0],
    expected_amount: plan?.expected_amount?.toString() ?? "",
    recurrence: plan?.recurrence ?? "monthly",
    notes: plan?.notes ?? "",
    scheduleDays: plan?.schedule_pattern?.days?.join(", ") ?? "",
  }
}

function parseScheduleDays(raw: string): number[] | null {
  if (!raw.trim()) return null
  const parts = raw.split(",").map((s) => parseInt(s.trim(), 10))
  if (parts.some((n) => isNaN(n) || n < 1 || n > 28)) return null
  return [...new Set(parts)].sort((a, b) => a - b)
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
  const [form, setForm] = useState<IncomeFormData>(emptyForm(plan))
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (open) {
      setForm(emptyForm(plan))
      setErrors({})
    }
  }, [open, plan])

  const createPlan = useMutation(api.incomePlans.createIncomePlan)
  const updatePlan = useMutation(api.incomePlans.updateIncomePlan)
  const runAllocations = useMutation(api.allocations.runAllocationsForPlan)

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.label.trim()) e.label = "Label is required"
    if (!form.expected_date) e.expected_date = "Date is required"
    const amt = parseFloat(form.expected_amount)
    if (!form.expected_amount || isNaN(amt) || amt <= 0)
      e.expected_amount = "Enter a valid amount greater than 0"
    if (form.recurrence === "monthly" && form.scheduleDays.trim()) {
      const days = parseScheduleDays(form.scheduleDays)
      if (!days) e.scheduleDays = "Enter valid day numbers 1–28, comma-separated"
    }
    return e
  }

  async function handleSave() {
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    const amount = parseFloat(form.expected_amount)
    const days = form.recurrence === "monthly" ? parseScheduleDays(form.scheduleDays) : null
    const schedule_pattern = days && days.length > 0
      ? { type: "monthly_dates", days }
      : undefined

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
          schedule_pattern,
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
          schedule_pattern,
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
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const showScheduleDays = form.recurrence === "monthly"

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
              className={cn(errors.label && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.label && (
              <p className="text-xs text-destructive">{errors.label}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Expected Date</Label>
              <Input
                type="date"
                value={form.expected_date}
                onChange={(e) => setField("expected_date", e.target.value)}
                className={cn(errors.expected_date && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.expected_date && (
                <p className="text-xs text-destructive">{errors.expected_date}</p>
              )}
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
                className={cn(errors.expected_amount && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.expected_amount && (
                <p className="text-xs text-destructive">{errors.expected_amount}</p>
              )}
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

          {/* Schedule days — only for monthly */}
          {showScheduleDays && (
            <div className="flex flex-col gap-1.5">
              <Label>
                Specific monthly dates{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. 5, 20"
                value={form.scheduleDays}
                onChange={(e) => setField("scheduleDays", e.target.value)}
                className={cn(errors.scheduleDays && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.scheduleDays ? (
                <p className="text-xs text-destructive">{errors.scheduleDays}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Day numbers (1–28). Leave blank to repeat one month from the matched date.
                </p>
              )}
            </div>
          )}

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
