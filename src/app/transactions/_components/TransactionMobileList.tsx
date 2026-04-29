"use client";

import { ArrowRightLeft, Link2, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { currencyExact } from "@/lib/format";
import { Transaction, Account, Category, CategoryGroup } from "../_types";
import { TransactionSelectionState } from "../_hooks/useTransactionSelection";
import { CategoryCombobox } from "./CategoryCombobox";
import { Id } from "../../../../convex/_generated/dataModel";

interface TransactionMobileListProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
  selection: TransactionSelectionState;
  onUpdate: (transactionId: Id<"transactions">, updates: Record<string, unknown>) => void;
  onUpdateByGroup: (
    transactionId: Id<"transactions">,
    groupId: Id<"category_groups"> | undefined,
    clearGroup: boolean
  ) => void;
  onPair: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
}

export function TransactionMobileList({
  transactions,
  accounts,
  categories,
  categoryGroups,
  selection,
  onUpdate,
  onUpdateByGroup,
  onPair,
  onEdit,
}: TransactionMobileListProps) {
  const { selectedIds, isAllPageSelected, toggleOne, selectPage, clearSelection } = selection;

  const handleHeaderCheckbox = () => {
    if (isAllPageSelected) clearSelection();
    else selectPage();
  };

  const getFilteredCategoryOptions = (txType: string | undefined, groupId: string | undefined) => {
    let filtered = categories;
    if (txType) filtered = filtered.filter((c) => !c.transactionType || c.transactionType === txType);
    if (groupId) filtered = filtered.filter((c) => c.groupId === groupId);
    return filtered.map((c) => ({ value: c._id, label: c.name })).filter((o) => o.value?.trim());
  };

  const getFilteredGroupOptions = (txType: string | undefined) => {
    if (!txType) return categoryGroups.map((g) => ({ value: g._id, label: g.name })).filter((o) => o.value?.trim());
    const validGroupIds = new Set(
      categories
        .filter((c) => !c.transactionType || c.transactionType === txType)
        .map((c) => c.groupId)
        .filter(Boolean)
    );
    return categoryGroups
      .filter((g) => validGroupIds.has(g._id))
      .map((g) => ({ value: g._id, label: g.name }))
      .filter((o) => o.value?.trim());
  };

  return (
    <div className="block lg:hidden space-y-2">
      {/* Select all on page */}
      {transactions.length > 0 && (
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            checked={isAllPageSelected}
            onCheckedChange={handleHeaderCheckbox}
            aria-label="Select all on this page"
          />
          <span className="text-xs text-muted-foreground">
            {isAllPageSelected ? "Deselect all" : "Select all on this page"}
          </span>
        </div>
      )}

      {transactions.map((tx) => {
        const account = accounts.find((a) => a._id === tx.accountId);
        const category = categories.find((c) => c._id === tx.categoryId);
        const group = categoryGroups.find((g) => g._id === category?.groupId);
        const isSelected = selectedIds.has(tx._id);
        const isPairedTransfer = !!tx.transfer_pair_id;
        const isUnpairedTransfer = tx.transactionType === "transfer" && !tx.transfer_pair_id;
        const isReimbursement =
          tx.amount > 0 &&
          (tx.transactionType === "expense" || category?.transactionType === "expense");

        return (
          <div
            key={tx._id}
            className={cn(
              "border rounded-lg p-3 bg-card text-card-foreground transition-colors",
              isSelected && "border-primary bg-primary/5"
            )}
            onClick={() => toggleOne(tx._id)}
          >
            {/* Top row: checkbox | description | amount */}
            <div className="flex items-start gap-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleOne(tx._id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Popover>
                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="text-sm font-medium text-left truncate max-w-[180px] hover:underline">
                        {tx.description || "—"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                      {tx.description || "—"}
                    </PopoverContent>
                  </Popover>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                      className={cn(
                        "text-sm font-mono font-semibold",
                        tx.amount > 0 ? "text-green-600" : "text-red-500"
                      )}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {currencyExact(tx.amount)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(tx);
                      }}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Sub info */}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">
                    {account?.name || "Unknown"}
                  </Badge>
                  {isPairedTransfer && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs py-0 px-1.5 h-4">
                      <ArrowRightLeft className="h-2.5 w-2.5 mr-1" />Paired
                    </Badge>
                  )}
                  {isReimbursement && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs py-0 px-1.5 h-4">
                      Reimbursement
                    </Badge>
                  )}
                  {isUnpairedTransfer && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPair(tx);
                      }}
                      className="flex items-center gap-0.5 text-xs text-amber-600 hover:text-amber-700 underline"
                    >
                      <Link2 className="h-3 w-3" />Pair
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Category row */}
            <div
              className="mt-2 grid grid-cols-3 gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <span className="text-[10px] text-muted-foreground block mb-0.5">Type</span>
                {isPairedTransfer ? (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs py-0">
                    <ArrowRightLeft className="h-2.5 w-2.5 mr-1" />Transfer
                  </Badge>
                ) : (
                  <Select
                    value={tx.transactionType || "NONE"}
                    onValueChange={(v) =>
                      onUpdate(
                        tx._id,
                        v === "NONE" ? { clearTransactionType: true } : { transactionType: v }
                      )
                    }
                  >
                    <SelectTrigger className="h-6 text-xs px-1.5">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">—</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground block mb-0.5">Group</span>
                <CategoryCombobox
                  value={group?._id || "NONE"}
                  onValueChange={(v) =>
                    onUpdateByGroup(
                      tx._id,
                      v === "NONE" ? undefined : (v as Id<"category_groups">),
                      v === "NONE"
                    )
                  }
                  options={getFilteredGroupOptions(tx.transactionType)}
                  placeholder="Select..."
                  emptyLabel="— None —"
                />
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground block mb-0.5">Category</span>
                <CategoryCombobox
                  value={tx.categoryId || "NONE"}
                  onValueChange={(v) =>
                    onUpdate(
                      tx._id,
                      v === "NONE" ? { clearCategoryId: true } : { categoryId: v as Id<"categories"> }
                    )
                  }
                  options={getFilteredCategoryOptions(tx.transactionType, group?._id)}
                  placeholder="Select..."
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
