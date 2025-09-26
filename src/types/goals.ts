// types/goals.ts
import { Id } from "../../convex/_generated/dataModel"

export interface Goal {
  id: Id<"goals">; // Changed from _id to id to match your API response
  name: string;
  note?: string;
  total_amount: number;
  current_amount: number;
  monthly_contribution: number;
  due_date?: string; // Required based on error message
  color: string;
  emoji: string;
  priority: number;
  priority_label?: string;
  tracking_type: string;
  calculation_type?: string;
  linked_account_id?: Id<"accounts">;
  image_url?: string;
  image?: string; // Add image property for backward compatibility
  is_completed?: boolean;
  createdAt?: number;
  updatedAt?: number;
  // Populated via join for UI
  linked_account?: {
    id: Id<"accounts">; // Changed from _id to id
    name: string;
    account_type: string;
    balance?: number;
  } | null;
  monthly_plans?: MonthlyPlanData[];
}

export interface MonthlyPlanData {
  id: Id<"goal_monthly_plans">; // Changed from _id to id
  name: string;
  month: number;
  year: number;
  allocated_amount: number;
}

export interface FilterOptions {
  accounts: Array<{
    id: Id<"accounts">; // Changed from _id to id
    name: string;
    type: string;
  }>;
}

export interface Filters {
  account_id: string;
  status?: string;
  search?: string;
}