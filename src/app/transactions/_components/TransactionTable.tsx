"use client";

import { ArrowUp, ArrowDown, ArrowUpDown, ArrowRightLeft, Link2, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import {
  Select as SelectPageSize,
  SelectContent as SelectPageSizeContent,
  SelectItem as SelectPageSizeItem,
  SelectTrigger as SelectPageSizeTrigger,
  SelectValue as SelectPageSizeValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { currencyExact, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Transaction, Account, Category, CategoryGroup } from "../_types";
import { TransactionSelectionState } from "../_hooks/useTransactionSelection";
import { CategoryCombobox } from "./CategoryCombobox";
import { Id } from "../../../../convex/_generated/dataModel";

type SortField = "date" | "description" | "amount";

interface TransactionTableProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
  selection: TransactionSelectionState;
  sortField: SortField | null;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalCount: number;
  startItem: number;
  endItem: number;
  onUpdate: (transactionId: Id<"transactions">, updates: Record<string, unknown>) => void;
  onUpdateByGroup: (
    transactionId: Id<"transactions">,
    groupId: Id<"category_groups"> | undefined,
    clearGroup: boolean
  ) => void;
  onUpdateAndCreateRule: (
    transactionId: Id<"transactions">,
    categoryId: Id<"categories">
  ) => Promise<void>;
  onPair: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
}

function SortableHead({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  sortField: SortField | null;
  sortDirection: "asc" | "desc";
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = sortField === field;
  return (
    <TableHead className={cn("font-bold text-xs", className)}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors group"
      >
        {label}
        {active ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60" />
        )}
      </button>
    </TableHead>
  );
}

export function TransactionTable({
  transactions,
  accounts,
  categories,
  categoryGroups,
  selection,
  sortField,
  sortDirection,
  onSort,
  pageSize,
  onPageSizeChange,
  totalCount,
  startItem,
  endItem,
  onUpdate,
  onUpdateByGroup,
  onUpdateAndCreateRule,
  onPair,
  onEdit,
}: TransactionTableProps) {
  const { selectedIds, isAllPageSelected, toggleOne, selectPage, clearSelection } = selection;

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

  const handleHeaderCheckbox = () => {
    if (isAllPageSelected) clearSelection();
    else selectPage();
  };

  return (
    <Card className="hidden lg:block">
      {/* Toolbar: count info + page size */}
      <div className="px-6 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="text-xs sm:text-sm text-muted-foreground">
          {totalCount === 0
            ? "Showing 0 transactions"
            : `Showing ${startItem}–${endItem} of ${totalCount} transactions`}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">Show</span>
          <SelectPageSize
            value={pageSize.toString()}
            onValueChange={(v) => onPageSizeChange(parseInt(v))}
          >
            <SelectPageSizeTrigger className="w-16 sm:w-20 text-xs sm:text-sm">
              <SelectPageSizeValue />
            </SelectPageSizeTrigger>
            <SelectPageSizeContent>
              {[15, 25, 50, 100].map((n) => (
                <SelectPageSizeItem key={n} value={n.toString()}>
                  {n}
                </SelectPageSizeItem>
              ))}
            </SelectPageSizeContent>
          </SelectPageSize>
          <span className="text-xs sm:text-sm text-muted-foreground">per page</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Persistent checkbox column */}
              <TableHead className="pl-6 w-10">
                <Checkbox
                  checked={isAllPageSelected}
                  onCheckedChange={handleHeaderCheckbox}
                  aria-label="Select all on this page"
                />
              </TableHead>
              <SortableHead
                label="Date"
                field="date"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableHead
                label="Description"
                field="description"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <TableHead className="font-bold text-xs">Account</TableHead>
              <TableHead className="font-bold text-xs">Type</TableHead>
              <TableHead className="font-bold text-xs">Group</TableHead>
              <TableHead className="font-bold text-xs">Category</TableHead>
              <SortableHead
                label="Amount"
                field="amount"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <TableHead className="w-10 pr-6" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {transactions.map((tx) => {
              const account = accounts.find((a) => a._id === tx.accountId);
              const category = categories.find((c) => c._id === tx.categoryId);
              const group = categoryGroups.find((g) => g._id === category?.groupId);
              const isSelected = selectedIds.has(tx._id);
              const isPairedTransfer = !!tx.transfer_pair_id;
              const isUnpairedTransfer = tx.transactionType === "transfer" && !tx.transfer_pair_id;

              return (
                <TableRow
                  key={tx._id}
                  className={cn(isSelected && "bg-primary/5")}
                  onClick={() => toggleOne(tx._id)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Checkbox */}
                  <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(tx._id)}
                    />
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatDate(tx.date)}
                  </TableCell>

                  {/* Description */}
                  <TableCell
                    className="max-w-[300px] truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start p-0 h-auto font-normal text-left truncate text-sm"
                        >
                          {tx.description || "—"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                        {tx.description}
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  {/* Account */}
                  <TableCell className="text-xs text-muted-foreground">
                    {account?.name || "None"}
                  </TableCell>

                  {/* Type */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {isPairedTransfer ? (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                        <ArrowRightLeft className="h-3 w-3 mr-1" />Transfer
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={tx.transactionType || "NONE"}
                          onValueChange={(v) =>
                            onUpdate(tx._id, v === "NONE" ? { clearTransactionType: true } : { transactionType: v })
                          }
                        >
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">—</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                        {isUnpairedTransfer && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600"
                                  onClick={() => onPair(tx)}
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Pair this transfer</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Group */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
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
                      emptyLabel="— No Group —"
                    />
                  </TableCell>

                  {/* Category */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <CategoryCombobox
                      value={tx.categoryId || "NONE"}
                      onValueChange={async (v) => {
                        if (v === "NONE") {
                          onUpdate(tx._id, { clearCategoryId: true });
                          return;
                        }
                        onUpdate(tx._id, { categoryId: v as Id<"categories"> });
                        const catName = categories.find((c) => c._id === v)?.name ?? v;
                        const desc = tx.description;
                        if (desc && desc.trim().length >= 3) {
                          toast(`Updated to ${catName}.`, {
                            action: {
                              label: `Always → ${catName}`,
                              onClick: () => {
                                onUpdateAndCreateRule(tx._id, v as Id<"categories">).catch(
                                  () => {}
                                );
                              },
                            },
                            duration: 6000,
                          });
                        }
                      }}
                      options={getFilteredCategoryOptions(tx.transactionType, group?._id)}
                      placeholder="Select..."
                    />
                  </TableCell>

                  {/* Amount */}
                  <TableCell
                    className={cn(
                      "text-right font-mono font-semibold text-sm",
                      tx.amount > 0 ? "text-green-600" : "text-red-500"
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {currencyExact(tx.amount)}
                  </TableCell>

                  {/* Edit */}
                  <TableCell className="w-10 pr-6" onClick={(e) => e.stopPropagation()}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(tx)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit transaction</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
