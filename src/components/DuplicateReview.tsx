"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExistingTransaction {
  _id: Id<"transactions">;
  amount: number;
  description: string;
  date: number;
  categoryId?: Id<"categories"> | null; // added
}

interface DuplicateTransaction {
  existingId: Id<"transactions">;
  newTransaction: {
    date: number;
    amount: number;
    description: string;
    transactionType?: string;
    rawData: Record<string, unknown>;
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
  isResolved: boolean;
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
  const [resolvingDuplicates, setResolvingDuplicates] = useState<Set<number>>(
    new Set()
  );
  const [resolvedDuplicates, setResolvedDuplicates] = useState<Set<number>>(
    new Set()
  );

  const mergeTransaction = useMutation(api.transactions.mergeTransaction);
  const resolveImportSession = useMutation(api.transactions.resolveImportSession);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatAmount = (amount: number) => {
    return amount >= 0 ? `+$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`;
  };

  const getExistingTransaction = (existingId: string) => {
    return existingTransactions.find((t) => t._id === existingId);
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
      console.error("Error merging transaction:", error);
      alert(`Error merging transaction: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setResolvingDuplicates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(duplicateIndex);
        return newSet;
      });
    }
  };

  const handleIgnore = (duplicateIndex: number) => {
    setResolvedDuplicates((prev) => new Set(prev).add(duplicateIndex));
  };

  const handleFinishReview = async () => {
    try {
      await resolveImportSession({
        sessionId: session.sessionId,
        userId: session.userId,
      });
      onSessionResolved();
    } catch (error) {
      console.error("Error resolving session:", error);
      alert(`Error finishing review: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const unresolved = session.duplicates.filter((_, i) => !resolvedDuplicates.has(i));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="p-4 rounded-md border bg-muted">
        <h2 className="text-xl font-semibold mb-2">Import Summary</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>✅ {session.summary.inserted} transactions imported successfully</div>
          {session.duplicates.length > 0 && (
            <div>⚠️ {session.duplicates.length} possible duplicates found</div>
          )}
          {session.errors.length > 0 && (
            <div>❌ {session.errors.length} rows skipped due to errors</div>
          )}
        </div>
      </div>

      {/* Errors Section */}
      {session.errors.length > 0 && (
        <div className="p-4 rounded-md border bg-destructive/10">
          <h3 className="text-lg font-medium text-destructive mb-2">
            ⚠️ {session.errors.length} rows skipped due to errors:
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

      {/* Duplicates Review */}
      {session.duplicates.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">
            ⚠️ Possible duplicates found: {unresolved.length} remaining
          </h3>

          <div className="space-y-4">
            {session.duplicates.map((duplicate, i) => {
              const existing = getExistingTransaction(duplicate.existingId);
              const isResolved = resolvedDuplicates.has(i);
              const isResolving = resolvingDuplicates.has(i);

              if (isResolved) return null;

              return (
                <div
                  key={i}
                  className="p-4 rounded-md border bg-background space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Existing Transaction */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Existing:
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium">Date:</span>{" "}
                          {existing ? formatDate(existing.date) : "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span>{" "}
                          <span
                            className={
                              existing && existing.amount >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {existing ? formatAmount(existing.amount) : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Description:</span>{" "}
                          {existing?.description || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span>{" "}
                          {existing?.categoryId ? (
                            <Badge variant="secondary">Categorized</Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              (uncategorized)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* New Transaction */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        New:
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium">Date:</span>{" "}
                          {formatDate(duplicate.newTransaction.date)}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span>{" "}
                          <span
                            className={
                              duplicate.newTransaction.amount >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {formatAmount(duplicate.newTransaction.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Description:</span>{" "}
                          {duplicate.newTransaction.description}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          {duplicate.newTransaction.transactionType || (
                            <span className="text-muted-foreground">(none)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleMerge(i)}
                      disabled={isResolving}
                      variant="default"
                      size="sm"
                    >
                      {isResolving ? "Merging..." : "Merge ✅"}
                    </Button>
                    <Button
                      onClick={() => handleIgnore(i)}
                      disabled={isResolving}
                      variant="secondary"
                      size="sm"
                    >
                      Ignore ❌
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>Merge:</strong> Update existing with new file data,
                    keep user edits (category).{" "}
                    <strong>Ignore:</strong> Keep existing, skip new transaction.
                  </div>
                </div>
              );
            })}
          </div>

          {/* Finish Review Button */}
          {unresolved.length === 0 && (
            <div className="mt-6 p-4 rounded-md border bg-green-50 dark:bg-green-950/20">
              <div className="text-sm text-green-700 dark:text-green-300 mb-3">
                All duplicates have been reviewed. Click below to finish the import process.
              </div>
              <Button onClick={handleFinishReview} variant="default">
                Finish Import Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}