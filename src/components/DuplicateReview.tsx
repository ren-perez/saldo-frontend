"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExistingTransaction {
  _id: Id<"transactions">;
  amount: number;
  description: string;
  date: number;
  categoryId?: Id<"categories"> | null;
  accountId: Id<"accounts">;
}

interface DuplicateTransaction {
  existingId: Id<"transactions">;
  newTransaction: {
    date: number;
    amount: number;
    description: string;
    transactionType?: string;
    rawData: Record<string, unknown>;
    importId: Id<"imports">;
  };
}

interface ImportSession {
  _id: string;
  sessionId: string;
  userId: Id<"users">;
  accountId: Id<"accounts">;
  duplicates: DuplicateTransaction[];
  errors: Array<{ rowIndex: number; message: string }>;
  summary: {
    inserted: number;
    totalErrors: number;
  };
  createdAt: number;
  status: string;
  resolvedAt?: number;
}

interface DuplicateReviewProps {
  session: ImportSession;
  existingTransactions: ExistingTransaction[];
  onSessionResolved: () => void;
}

export default function DuplicateReview({
  session,
  existingTransactions,
  onSessionResolved,
}: DuplicateReviewProps) {
  const [resolvingDuplicates, setResolvingDuplicates] = useState<Set<number>>(new Set());
  const [resolvedDuplicates, setResolvedDuplicates] = useState<Set<number>>(new Set());

  const mergeTransaction = useMutation(api.transactions.mergeTransaction);
  const addAsNewTransaction = useMutation(api.transactions.addAsNewTransaction);

  const categories = useQuery(api.categories.listCategories, { userId: session.userId });
  const accounts = useQuery(api.accounts.listAccounts, { userId: session.userId });

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();

  const formatAmount = (amount: number) =>
    amount >= 0 ? `+$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`;

  const getExistingTransaction = (existingId: string) =>
    existingTransactions.find((t) => t._id === existingId);

  const getCategoryName = (categoryId?: Id<"categories"> | null) => {
    if (!categoryId || !categories) return null;
    return categories.find(c => c._id === categoryId)?.name ?? null;
  };

  const getAccountName = (accountId: Id<"accounts">) => {
    if (!accounts) return "Loading...";
    const account = accounts.find(a => a._id === accountId);
    return account ? `${account.name} (${account.bank})` : "Unknown Account";
  };

  const handleMerge = async (duplicateIndex: number) => {
    setResolvingDuplicates((prev) => new Set(prev).add(duplicateIndex));
    try {
      const duplicate = session.duplicates[duplicateIndex];
      await mergeTransaction({
        existingTransactionId: duplicate.existingId,
        newTransactionData: duplicate.newTransaction,
        userId: session.userId,
      });
      setResolvedDuplicates((prev) => new Set(prev).add(duplicateIndex));
    } catch (error) {
      toast.error(`Failed to merge: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setResolvingDuplicates((prev) => {
        const next = new Set(prev);
        next.delete(duplicateIndex);
        return next;
      });
    }
  };

  const handleIgnore = (duplicateIndex: number) => {
    setResolvedDuplicates((prev) => new Set(prev).add(duplicateIndex));
  };

  const handleAddAsNew = async (duplicateIndex: number) => {
    setResolvingDuplicates((prev) => new Set(prev).add(duplicateIndex));
    try {
      const duplicate = session.duplicates[duplicateIndex];
      await addAsNewTransaction({
        newTransactionData: duplicate.newTransaction,
        userId: session.userId,
        accountId: session.accountId,
      });
      setResolvedDuplicates((prev) => new Set(prev).add(duplicateIndex));
    } catch (error) {
      toast.error(`Failed to add transaction: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setResolvingDuplicates((prev) => {
        const next = new Set(prev);
        next.delete(duplicateIndex);
        return next;
      });
    }
  };

  const unresolved = session.duplicates.filter((_, i) => !resolvedDuplicates.has(i));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="p-4 rounded-md border bg-muted">
        <h2 className="text-base font-semibold mb-2">Import Summary</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="size-3.5 text-green-500 shrink-0" />
            {session.summary.inserted} transactions imported successfully
          </div>
          {session.duplicates.length > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-yellow-500 shrink-0" />
              {session.duplicates.length} possible duplicates found
            </div>
          )}
          {session.errors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <XCircle className="size-3.5 text-destructive shrink-0" />
              {session.errors.length} rows skipped due to errors
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {session.errors.length > 0 && (
        <div className="p-4 rounded-md border bg-destructive/10">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-destructive mb-2">
            <AlertTriangle className="size-3.5 shrink-0" />
            {session.errors.length} rows skipped due to errors
          </h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {session.errors.map((error, i) => (
              <div key={i} className="text-sm text-destructive">
                Row {error.rowIndex + 1}: {error.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicates */}
      {session.duplicates.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-medium mb-4">
            <AlertTriangle className="size-3.5 text-yellow-500 shrink-0" />
            Possible duplicates — {unresolved.length} remaining
          </h3>

          <div className="space-y-4">
            {session.duplicates.map((duplicate, i) => {
              const existing = getExistingTransaction(duplicate.existingId);
              const isResolved = resolvedDuplicates.has(i);
              const isResolving = resolvingDuplicates.has(i);

              if (isResolved) return null;

              return (
                <div key={i} className="p-4 rounded-md border bg-background space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Existing</div>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Date:</span> {existing ? formatDate(existing.date) : "N/A"}</div>
                        <div>
                          <span className="font-medium">Amount:</span>{" "}
                          <span className={cn(existing && existing.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                            {existing ? formatAmount(existing.amount) : "N/A"}
                          </span>
                        </div>
                        <div><span className="font-medium">Description:</span> {existing?.description || "N/A"}</div>
                        <div>
                          <span className="font-medium">Category:</span>{" "}
                          {existing?.categoryId ? (
                            <Badge variant="secondary">{getCategoryName(existing.categoryId) || "Unknown"}</Badge>
                          ) : (
                            <span className="text-muted-foreground">(uncategorized)</span>
                          )}
                        </div>
                        <div><span className="font-medium">Account:</span> {existing ? getAccountName(existing.accountId) : "N/A"}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">New</div>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Date:</span> {formatDate(duplicate.newTransaction.date)}</div>
                        <div>
                          <span className="font-medium">Amount:</span>{" "}
                          <span className={cn(duplicate.newTransaction.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                            {formatAmount(duplicate.newTransaction.amount)}
                          </span>
                        </div>
                        <div><span className="font-medium">Description:</span> {duplicate.newTransaction.description}</div>
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          {duplicate.newTransaction.transactionType || <span className="text-muted-foreground">(none)</span>}
                        </div>
                        <div><span className="font-medium">Account:</span> {getAccountName(session.accountId)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleMerge(i)} disabled={isResolving} variant="default" size="sm" className="gap-1.5">
                      <Check className="size-3.5" />
                      {isResolving ? "Merging..." : "Merge"}
                    </Button>
                    <Button onClick={() => handleIgnore(i)} disabled={isResolving} variant="secondary" size="sm" className="gap-1.5">
                      <X className="size-3.5" />
                      Ignore
                    </Button>
                    <Button onClick={() => handleAddAsNew(i)} disabled={isResolving} variant="outline" size="sm" className="gap-1.5">
                      <Plus className="size-3.5" />
                      {isResolving ? "Adding..." : "Add as New"}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>Merge:</strong> Update existing with new file data, keep user edits.{" "}
                    <strong>Ignore:</strong> Keep existing, skip new transaction.{" "}
                    <strong>Add as New:</strong> They are different transactions — add both.
                  </div>
                </div>
              );
            })}
          </div>

          {unresolved.length === 0 && (
            <div className="mt-6 p-4 rounded-md border bg-green-50 dark:bg-green-950/20">
              <div className="text-sm text-green-700 dark:text-green-300 mb-3">
                All duplicates have been reviewed. Click below to finish the import.
              </div>
              <Button onClick={onSessionResolved}>Finish Import</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
