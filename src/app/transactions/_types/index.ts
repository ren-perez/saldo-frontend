import { Id } from "../../../../convex/_generated/dataModel";

export interface Transaction {
  _id: Id<"transactions">;
  userId: Id<"users">;
  accountId: Id<"accounts">;
  amount: number;
  date: number;
  description: string;
  transactionType?: string;
  categoryId?: Id<"categories">;
  transfer_pair_id?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Account {
  _id: Id<"accounts">;
  userId: Id<"users">;
  name: string;
  number?: string;
  type: string;
  bank: string;
  createdAt: string;
  balance?: number;
}

export interface Category {
  _id: Id<"categories">;
  userId: Id<"users">;
  name: string;
  transactionType?: string;
  groupId?: Id<"category_groups">;
  createdAt?: number;
}

export interface CategoryGroup {
  _id: Id<"category_groups">;
  userId: Id<"users">;
  name: string;
  createdAt?: number;
}

export interface TransactionUpdateData {
  transactionType?: string;
  categoryId?: Id<"categories">;
  clearTransactionType?: boolean;
  clearCategoryId?: boolean;
}

export interface FilterState {
  selectedAccount: Id<"accounts"> | null;
  search: string;
  typeFilter: string | null;
  categoryFilter: string | null;
  groupFilter: string | null;
  startDate: string | null;
  endDate: string | null;
}
