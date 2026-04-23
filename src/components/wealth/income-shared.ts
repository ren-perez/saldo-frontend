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
  schedule_pattern?: {
    type: string
    days: number[]
  }
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
  goalName?: string | null
  goalEmoji?: string | null
  category: string
  amount: number
  is_forecast: boolean
  verification_status?: "pending" | "reserved" | "verified"
  transfer_transaction_id?: Id<"transactions">
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const statusConfig = {
  planned: {
    label: "Planned",
    badgeClass: "border-border text-muted-foreground bg-muted",
    rowClass: "border-border",
    dotClass: "border-muted-foreground/40 bg-muted",
    accentColor: null,
  },
  matched: {
    label: "Matched",
    badgeClass: "border-sky-400/30 text-sky-600 bg-sky-400/10",
    rowClass: "border-border",
    dotClass: "border-sky-400 bg-sky-400/10",
    accentColor: "#0ea5e9",
  },
  completed: {
    label: "Completed",
    badgeClass: "border-emerald-500/30 text-emerald-600 bg-emerald-500/10",
    rowClass: "border-border",
    dotClass: "border-emerald-500 bg-emerald-500/10",
    accentColor: "#10b981",
  },
  missed: {
    label: "Missed",
    badgeClass: "border-destructive/30 text-destructive bg-destructive/10",
    rowClass: "border-border",
    dotClass: "border-destructive bg-destructive/10",
    accentColor: "#ef4444",
  },
} as const

export const allocColors = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#f43f5e", // rose-500
  "#64748b", // slate-500
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
