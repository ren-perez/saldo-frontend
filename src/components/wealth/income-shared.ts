import { format, parseISO } from "date-fns"
import { Id } from "../../../convex/_generated/dataModel"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IncomePlan {
  _id: Id<"income_plans">
  userId: Id<"users">
  label: string
  expected_date: string
  expected_amount: number
  actual_amount?: number
  status: "planned" | "matched" | "missed"
  recurrence: string
  notes?: string
  matched_transaction_id?: Id<"transactions">
  date_received?: string
}

export interface UnmatchedTransaction {
  _id: Id<"transactions">
  amount: number
  date: number
  description: string
  account?: { name: string } | null
}

export interface AllocationRecord {
  _id: Id<"allocation_records">
  accountId: Id<"accounts">
  accountName: string
  category: string
  amount: number
  is_forecast: boolean
  matched_transaction_id?: Id<"transactions">
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const statusConfig = {
  planned: {
    label: "Planned",
    badgeClass: "border-border text-muted-foreground bg-muted",
    rowClass: "border-border",
    dotClass: "border-muted-foreground/40 bg-muted",
  },
  matched: {
    label: "Matched",
    badgeClass: "border-emerald-500/30 text-emerald-600 bg-emerald-500/10",
    rowClass: "border-emerald-500/20 bg-emerald-500/[0.02]",
    dotClass: "border-emerald-500 bg-emerald-500/10",
  },
  missed: {
    label: "Missed",
    badgeClass: "border-destructive/30 text-destructive bg-destructive/10",
    rowClass: "border-destructive/20",
    dotClass: "border-destructive bg-destructive/10",
  },
} as const

export const allocColors = [
  "oklch(0.42 0.095 165)",
  "oklch(0.55 0.08 200)",
  "oklch(0.65 0.10 130)",
  "oklch(0.50 0.06 285)",
  "oklch(0.60 0.08 45)",
  "oklch(0.48 0.09 20)",
]

export const categoryLabels: Record<string, string> = {
  savings: "Savings",
  investing: "Investing",
  spending: "Spending",
  debt: "Debt",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string) {
  return format(parseISO(dateStr), "MMM d, yyyy")
}
