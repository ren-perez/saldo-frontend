"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Plus,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();
  const formatAmount = (amount: number) =>
    amount >= 0 ? `+$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`;

  const getExistingTransaction = (existingId: string) =>
    existingTransactions.find((t) => t._id === existingId);

  const getCategoryName = (categoryId?: Id<"categories"> | null) => {
    if (!categoryId || !categories) return null;
    return categories.find(c => c._id === categoryId)?.name ?? null;
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
      toast.error(`Failed to add: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold">Review duplicates</h2>
          <p className="text-sm text-muted-foreground">
            {unresolved.length} possible {unresolved.length === 1 ? "duplicate" : "duplicates"} found during import.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
            <CheckCircle className="size-3.5 text-primary" />
            {session.summary.inserted} imported
          </Badge>
          {session.errors.length > 0 && (
            <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-destructive border-destructive/30">
              <XCircle className="size-3.5" />
              {session.errors.length} errors
            </Badge>
          )}
        </div>
      </div>

      {/* Main list */}
      <div className="space-y-4">
        {session.duplicates.map((duplicate, i) => {
          const existing = getExistingTransaction(duplicate.existingId);
          const isResolving = resolvingDuplicates.has(i);
          if (resolvedDuplicates.has(i)) return null;

          const dateDiff = existing ? Math.abs(existing.date - duplicate.newTransaction.date) : 0;
          const daysDiff = Math.floor(dateDiff / (1000 * 60 * 60 * 24));
          const isDateMatch = daysDiff === 0;
          const isDescMatch = existing?.description === duplicate.newTransaction.description;
          const isAmountMatch = existing?.amount === duplicate.newTransaction.amount;

          return (
            <div key={i} className="rounded-lg border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="w-1/4 px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Field</th>
                    <th className="w-3/8 px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Existing</th>
                    <th className="w-3/8 px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Incoming</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-5 py-3.5 text-sm font-medium text-muted-foreground">Date</td>
                    <td className="px-5 py-3.5 text-sm">{existing ? formatDate(existing.date) : "—"}</td>
                    <td className={cn("px-5 py-3.5 text-sm font-medium", isDateMatch ? "text-primary" : "text-foreground")}>
                      <div className="flex items-center gap-2">
                        <span>{formatDate(duplicate.newTransaction.date)}</span>
                        {isDateMatch
                          ? <Check className="size-3 text-primary" />
                          : <span className="text-[10px] text-muted-foreground font-normal">({daysDiff}d apart)</span>
                        }
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3.5 text-sm font-medium text-muted-foreground">Amount</td>
                    <td className={cn("px-5 py-3.5 text-sm font-semibold tabular-nums", existing && existing.amount >= 0 ? "text-primary" : "text-foreground")}>
                      {existing ? formatAmount(existing.amount) : "—"}
                    </td>
                    <td className={cn("px-5 py-3.5 text-sm font-semibold tabular-nums", isAmountMatch ? "text-primary" : "text-foreground")}>
                      <div className="flex items-center gap-2">
                        <span>{formatAmount(duplicate.newTransaction.amount)}</span>
                        {isAmountMatch && <Check className="size-3 text-primary" />}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3.5 text-sm font-medium text-muted-foreground">Description</td>
                    <td className="px-5 py-3.5 text-sm truncate max-w-[200px]">{existing?.description || "—"}</td>
                    <td className={cn("px-5 py-3.5 text-sm font-medium truncate max-w-[200px]", isDescMatch ? "text-primary" : "text-foreground")}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{duplicate.newTransaction.description}</span>
                        {isDescMatch && <Check className="size-3 text-primary shrink-0" />}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3.5 text-sm font-medium text-muted-foreground">Details</td>
                    <td className="px-5 py-3.5">
                      {existing?.categoryId ? (
                        <Badge variant="secondary">{getCategoryName(existing.categoryId)}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No category</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {duplicate.newTransaction.transactionType || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Action footer */}
              <div className="px-5 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-primary" />
                    <span>Match</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-muted-foreground/40" />
                    <span>Differs</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isResolving}
                    onClick={() => handleAddAsNew(i)}
                    className="gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    Keep both
                  </Button>

                  <div className="flex items-center rounded-md overflow-hidden border border-primary shadow-sm">
                    <Button
                      size="sm"
                      disabled={isResolving}
                      onClick={() => handleMerge(i)}
                      className="rounded-none border-none px-4"
                    >
                      {isResolving ? "Merging..." : (
                        <>
                          <Check className="size-3.5 mr-1.5" />
                          Merge
                        </>
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={isResolving}>
                        <Button size="sm" className="rounded-none border-l border-primary-foreground/20 px-2">
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72 p-1.5">
                        <DropdownMenuItem
                          onClick={() => handleMerge(i)}
                          className="flex flex-col items-start gap-0.5 p-3 cursor-pointer focus:bg-foreground/8"
                        >
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            <CheckCircle className="size-3.5 text-primary" />
                            <span>Merge</span>
                          </div>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            Update existing with latest file data, keep your edits.
                          </span>
                        </DropdownMenuItem>

                        <div className="h-px bg-border my-1" />

                        <DropdownMenuItem
                          onClick={() => handleIgnore(i)}
                          className="flex flex-col items-start gap-0.5 p-3 cursor-pointer focus:bg-foreground/8"
                        >
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            <XCircle className="size-3.5 text-muted-foreground" />
                            <span>Ignore incoming</span>
                          </div>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            Keep existing as-is, discard the imported row.
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion state */}
      {unresolved.length === 0 && (
        <div className="rounded-lg border bg-card p-8 shadow-sm flex flex-col items-center text-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Check className="size-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Review complete</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              All duplicates have been handled. Ready to finalize your import.
            </p>
          </div>
          <Button onClick={onSessionResolved} className="px-8">
            Finish import
          </Button>
        </div>
      )}
    </div>
  );
}