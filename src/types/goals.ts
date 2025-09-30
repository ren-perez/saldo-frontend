// types/goals.ts
import { Id } from "../../convex/_generated/dataModel"

export interface Goal {
  _id: Id<"goals">; // Keep as _id to match Convex document format
  name: string;
  note?: string;
  total_amount: number;
  current_amount: number;
  monthly_contribution: number;
  due_date?: string;
  color: string;
  emoji: string;
  priority: number;
  priority_label?: string;
  tracking_type: string; // "MANUAL" | "LINKED_ACCOUNT" | "EXPENSE_CATEGORY"
  calculation_type?: string;
  linked_account_id?: Id<"accounts">;
  linked_category_id?: Id<"categories">; // For expense-linked goals
  image_url?: string;
  image?: string;
  is_completed?: boolean;
  createdAt?: number;
  updatedAt?: number;
  // Populated via join for UI
  linked_account?: {
    _id: Id<"accounts">; // Keep as _id
    name: string;
    account_type: string;
    balance?: number;
  } | null;
  linked_category?: {
    _id: Id<"categories">;
    name: string;
    group_name?: string;
  } | null;
  monthly_plans?: MonthlyPlanData[];
}

export interface MonthlyPlanData {
  _id: Id<"goal_monthly_plans">; // Changed from _id to id
  name: string;
  month: number;
  year: number;
  allocated_amount: number;
}

export interface FilterOptions {
  accounts: Array<{
    _id: Id<"accounts">; // Changed from _id to id
    name: string;
    type: string;
  }>;
}

export interface Filters {
  account_id: string;
  status?: string;
  search?: string;
}