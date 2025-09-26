// types/transfers.ts
import { Id } from "../../convex/_generated/dataModel";

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
  name: string;
  bank: string;
  type: string;
  number?: string;
}

export interface PotentialTransfer {
  id: string;
  outgoingTransaction: Transaction;
  incomingTransaction: Transaction;
  outgoingAccount: Account;
  incomingAccount: Account;
  matchScore: number;
  matchType: 'exact' | 'close' | 'loose';
  daysDifference: number;
  amountDifference: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface TransferSuggestion {
  outgoingTransactions: Array<Transaction & { account: Account }>;
  incomingTransactions: Array<Transaction & { account: Account }>;
  selectedOutgoing?: string;
  selectedIncoming?: string;
}

export interface TransferPairAction {
  type: 'pair' | 'ignore' | 'manual';
  outgoingTransactionId: Id<"transactions">;
  incomingTransactionId?: Id<"transactions">;
  transferPairId?: string;
}