"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { ArrowRightLeft, ChevronDown, Upload, Plus, Link2 } from "lucide-react";
import { CreateTransactionDialog } from "@/components/CreateTransactionDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { currencyExact } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";

import { FilterState, Transaction } from "./_types";
import { useTransactionSelection } from "./_hooks/useTransactionSelection";
import { exportTransactionsToCSV } from "./_utils/csv";
import { BulkActionBar } from "./_components/BulkActionBar";
import { TransactionFilters } from "./_components/TransactionFilters";
import { TransactionTable } from "./_components/TransactionTable";
import { TransactionMobileList } from "./_components/TransactionMobileList";

function dateStringToTimestamp(dateString: string): number {
  return new Date(dateString + "T00:00:00").getTime();
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-foreground">Loading...</div>
          </div>
        </AppLayout>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const { convexUser } = useConvexUser();
  const searchParams = useSearchParams();
  const convex = useConvex();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>({
    selectedAccount: null,
    search: "",
    typeFilter: null,
    categoryFilter: null,
    groupFilter: null,
    startDate: null,
    endDate: null,
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<"date" | "description" | "amount" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // ── UI state ─────────────────────────────────────────────────────────────
  const [pairDialogTx, setPairDialogTx] = useState<Transaction | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateTransaction = useMutation(api.transactions.updateTransaction);
  const updateTransactionByGroup = useMutation(api.transactions.updateTransactionByGroup);
  const deleteTransaction = useMutation(api.transactions.deleteTransaction);
  const updateTransactionAndCreateRule = useMutation(api.transactions.updateTransactionAndCreateRule);
  const pairTransfersMutation = useMutation(api.transfers.pairTransfers);

  // ── Queries ───────────────────────────────────────────────────────────────
  const accounts = useQuery(
    api.accounts.listAccounts,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const categories = useQuery(
    api.categories.listCategories,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const categoryGroups = useQuery(
    api.categoryGroups.listCategoryGroups,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const startTimestamp = filters.startDate
    ? dateStringToTimestamp(filters.startDate)
    : undefined;
  const endTimestamp = filters.endDate
    ? dateStringToTimestamp(filters.endDate) + 24 * 60 * 60 * 1000 - 1
    : undefined;

  const transactions = useQuery(
    api.transactions.listTransactionsPaginated,
    convexUser
      ? {
        userId: convexUser._id,
        accountId: filters.selectedAccount || undefined,
        transactionType:
          filters.typeFilter === "UNTYPED"
            ? "untyped"
            : filters.typeFilter || undefined,
        categoryId:
          filters.categoryFilter === "UNCATEGORIZED"
            ? "NONE"
            : filters.categoryFilter || undefined,
        groupId:
          filters.groupFilter === "UNGROUPED"
            ? "NONE"
            : filters.groupFilter || undefined,
        searchTerm: filters.search || undefined,
        startDate: startTimestamp,
        endDate: endTimestamp,
        page: currentPage,
        pageSize,
      }
      : "skip"
  );

  // Pair suggestions
  const pairSuggestionsRaw = useQuery(
    api.transactions.listTransactionsPaginated,
    convexUser && pairDialogTx
      ? {
        userId: convexUser._id,
        startDate: pairDialogTx.date - 7 * 24 * 60 * 60 * 1000,
        endDate: pairDialogTx.date + 7 * 24 * 60 * 60 * 1000,
        page: 1,
        pageSize: 50,
      }
      : "skip"
  );

  const pairSuggestions =
    pairSuggestionsRaw?.data.filter(
      (tx) =>
        tx._id !== pairDialogTx?._id &&
        tx.accountId !== pairDialogTx?.accountId &&
        !tx.transfer_pair_id &&
        pairDialogTx !== null &&
        ((pairDialogTx.amount < 0 && tx.amount > 0) ||
          (pairDialogTx.amount > 0 && tx.amount < 0))
    ).sort((a, b) => {
      const aDiff = Math.abs(Math.abs(a.amount) - Math.abs(pairDialogTx!.amount));
      const bDiff = Math.abs(Math.abs(b.amount) - Math.abs(pairDialogTx!.amount));
      return aDiff - bDiff;
    }) || [];

  // ── Sorted page data ──────────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    return [...(transactions?.data || [])].sort((a, b) => {
      if (!sortField) return 0;
      let result = 0;
      if (sortField === "date") result = a.date - b.date;
      else if (sortField === "description")
        result = (a.description || "").localeCompare(b.description || "");
      else if (sortField === "amount") result = a.amount - b.amount;
      return sortDirection === "asc" ? result : -result;
    });
  }, [transactions, sortField, sortDirection]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const selection = useTransactionSelection({
    pageIds: sortedData.map((t) => t._id),
    totalCount: transactions?.total ?? 0,
  });

  // ── URL param hydration ───────────────────────────────────────────────────
  useEffect(() => {
    const patch: Partial<FilterState> = {};
    const accountId = searchParams.get("accountId");
    if (accountId) patch.selectedAccount = accountId as Id<"accounts">;
    const group = searchParams.get("groupId");
    if (group) patch.groupFilter = group === "uncategorized" ? "NONE" : group;
    const category = searchParams.get("categoryId");
    if (category) patch.categoryFilter = category;
    const sd = searchParams.get("startDate");
    if (sd) patch.startDate = sd;
    const ed = searchParams.get("endDate");
    if (ed) patch.endDate = ed;
    if (Object.keys(patch).length > 0) setFilters((f) => ({ ...f, ...patch }));
  }, [searchParams]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFiltersChange = (patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setCurrentPage(1);
    selection.clearSelection();
  };

  const clearAllFilters = () => {
    setFilters({
      selectedAccount: null,
      search: "",
      typeFilter: null,
      categoryFilter: null,
      groupFilter: null,
      startDate: null,
      endDate: null,
    });
    setCurrentPage(1);
    selection.clearSelection();
  };

  const handleSort = (field: "date" | "description" | "amount") => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleUpdate = (
    transactionId: Id<"transactions">,
    updates: Record<string, unknown>
  ) => {
    updateTransaction({ transactionId, updates: updates as Parameters<typeof updateTransaction>[0]["updates"] });
  };

  const handleUpdateByGroup = (
    transactionId: Id<"transactions">,
    groupId: Id<"category_groups"> | undefined,
    clearGroup: boolean
  ) => {
    updateTransactionByGroup({ transactionId, groupId, clearGroup });
  };

  const handleUpdateAndCreateRule = async (
    transactionId: Id<"transactions">,
    categoryId: Id<"categories">
  ) => {
    const tx = sortedData.find((t) => t._id === transactionId);
    if (!tx?.description?.trim()) return;
    await updateTransactionAndCreateRule({
      transactionId,
      categoryId,
      saveRule: true,
      rulePattern: tx.description.trim(),
    });
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const lookups = {
    accounts: accounts || [],
    categories: categories || [],
    categoryGroups: categoryGroups || [],
  };

  const handleExportSelected = () => {
    const selected = sortedData.filter((t) => selection.selectedIds.has(t._id));
    exportTransactionsToCSV(selected, lookups);
    toast.success(`Exported ${selected.length} transaction${selected.length !== 1 ? "s" : ""}`);
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      if (!convexUser) return;
      const count = transactions?.total ?? 0;
      if (count > 500) {
        toast.info(`Gathering ${count} transactions…`);
      }
      const result = await convex.query(api.transactions.listTransactions, {
        userId: convexUser._id,
        accountId: filters.selectedAccount || undefined,
        transactionType:
          filters.typeFilter === "UNTYPED"
            ? "untyped"
            : filters.typeFilter || undefined,
        categoryId: (filters.categoryFilter === "NONE" || !filters.categoryFilter) ? undefined : filters.categoryFilter as Id<"categories">,
        searchTerm: filters.search || undefined,
        startDate: startTimestamp,
        endDate: endTimestamp,
        limit: 10000,
      });

      // Client-side group filter (listTransactions doesn't support groupId)
      let txs = result as Transaction[];
      if (filters.groupFilter) {
        const gf = filters.groupFilter;
        const catIds = new Set(
          (categories || [])
            .filter((c) => (gf === "NONE" ? !c.groupId : c.groupId === gf))
            .map((c) => c._id)
        );
        txs = txs.filter((t) => (gf === "NONE" ? !t.categoryId || catIds.has(t.categoryId) : t.categoryId && catIds.has(t.categoryId)));
      }

      exportTransactionsToCSV(txs, lookups);
      toast.success(`Exported ${txs.length} transaction${txs.length !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const idsToDelete = selection.isAllGlobalSelected
      ? // Fetch all matching IDs then delete (best effort; re-uses current filter)
      await convex
        .query(api.transactions.listTransactions, {
          userId: convexUser!._id,
          accountId: filters.selectedAccount || undefined,
          transactionType: filters.typeFilter || undefined,
          searchTerm: filters.search || undefined,
          startDate: startTimestamp,
          endDate: endTimestamp,
          limit: 10000,
        })
        .then((res) => (res as Transaction[]).map((t) => t._id))
      : Array.from(selection.selectedIds);

    const count = idsToDelete.length;
    for (const id of idsToDelete) {
      await deleteTransaction({ transactionId: id });
    }
    selection.clearSelection();
    setShowBulkDeleteDialog(false);
    toast.success(`Deleted ${count} transaction${count !== 1 ? "s" : ""}`);
  };

  // ── Pair transfer ─────────────────────────────────────────────────────────
  const handlePairTransfer = async (suggestionId: Id<"transactions">) => {
    if (!pairDialogTx || !convexUser) return;
    try {
      const outgoing = pairDialogTx.amount < 0 ? pairDialogTx._id : suggestionId;
      const incoming = pairDialogTx.amount < 0 ? suggestionId : pairDialogTx._id;
      await pairTransfersMutation({
        userId: convexUser._id,
        outgoingTransactionId: outgoing,
        incomingTransactionId: incoming,
      });
      toast.success("Transactions paired as transfer");
      setPairDialogTx(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pair transactions");
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = transactions ? Math.ceil(transactions.total / pageSize) : 0;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, transactions?.total || 0);

  const activeFiltersCount = [
    filters.selectedAccount,
    filters.typeFilter,
    filters.categoryFilter,
    filters.groupFilter,
    filters.startDate,
    filters.endDate,
    filters.search,
  ].filter(Boolean).length;

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-foreground">Please sign in to view transactions.</div>
        </div>
      </AppLayout>
    );
  }

  const deleteCount = selection.isAllGlobalSelected
    ? (transactions?.total ?? 0)
    : selection.selectedCount;

  return (
    <>
      <AppLayout>
        <InitUser />
        <div className="container mx-auto py-6 px-6">

          {/* ── Header CTAs ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 justify-end mb-6 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/transfers-inbox">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfers Inbox
              </Link>
            </Button>

            {/* Split Add button */}
            <div className="flex items-center">
              <Button
                size="sm"
                className="gap-1.5 rounded-r-none border-r border-primary-foreground/20"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="rounded-l-none px-2">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/import-csv" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import CSV
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Filters ──────────────────────────────────────────────────── */}
          <div className="mb-8">
            <TransactionFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearAll={clearAllFilters}
              accounts={accounts || []}
              categories={categories || []}
              categoryGroups={categoryGroups || []}
              totalCount={transactions?.total}
            />
          </div>

          {/* ── Content ──────────────────────────────────────────────────── */}
          {!transactions || transactions.data.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="text-3xl sm:text-4xl mb-4">💰</div>
                <h3 className="text-base sm:text-lg font-medium mb-2">No transactions found</h3>
                <p className="mb-4 text-muted-foreground text-sm sm:text-base">
                  {activeFiltersCount > 0
                    ? "Try adjusting your filters to see more transactions."
                    : filters.selectedAccount
                      ? "This account has no transactions yet."
                      : "You haven't imported any transactions yet."}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  {activeFiltersCount > 0 && (
                    <Button variant="outline" onClick={clearAllFilters} className="text-sm">
                      Clear Filters
                    </Button>
                  )}
                  <Button asChild className="text-sm">
                    <a href="/import-csv">Import CSV →</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile */}
              <TransactionMobileList
                transactions={sortedData}
                accounts={accounts || []}
                categories={categories || []}
                categoryGroups={categoryGroups || []}
                selection={selection}
                onUpdate={handleUpdate}
                onUpdateByGroup={handleUpdateByGroup}
                onPair={setPairDialogTx}
                onEdit={setEditingTransaction}
              />

              {/* Desktop */}
              <TransactionTable
                transactions={sortedData}
                accounts={accounts || []}
                categories={categories || []}
                categoryGroups={categoryGroups || []}
                selection={selection}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                pageSize={pageSize}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                totalCount={transactions.total}
                startItem={startItem}
                endItem={endItem}
                onUpdate={handleUpdate}
                onUpdateByGroup={handleUpdateByGroup}
                onUpdateAndCreateRule={handleUpdateAndCreateRule}
                onPair={setPairDialogTx}
                onEdit={setEditingTransaction}
              />
            </>
          )}

          {/* ── Pagination ───────────────────────────────────────────────── */}
          {transactions && transactions.total > pageSize && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={cn(
                        "text-xs sm:text-sm",
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <PaginationItem>
                        <PaginationEllipsis className="text-xs sm:text-sm" />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => setCurrentPage(totalPages)}
                          className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3"
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={cn(
                        "text-xs sm:text-sm",
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </AppLayout>

      {/* ── Floating Bulk Action Bar ────────────────────────────────────── */}
      <BulkActionBar
        selectedCount={selection.selectedCount}
        totalCount={transactions?.total ?? 0}
        isAllGlobalSelected={selection.isAllGlobalSelected}
        onSelectAllGlobal={selection.selectAllGlobal}
        onExportSelected={handleExportSelected}
        onExportAll={handleExportAll}
        onDeleteSelected={() => setShowBulkDeleteDialog(true)}
        onClearSelection={selection.clearSelection}
        isExporting={isExporting}
      />

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <CreateTransactionDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <CreateTransactionDialog
        open={!!editingTransaction}
        onOpenChange={(open) => { if (!open) setEditingTransaction(null); }}
        transaction={editingTransaction ?? undefined}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteCount} transaction{deleteCount !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteCount} transaction
              {deleteCount !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete {deleteCount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pair Transfer */}
      <Dialog
        open={!!pairDialogTx}
        onOpenChange={(open) => { if (!open) setPairDialogTx(null); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Pair Transfer
            </DialogTitle>
            <DialogDescription>
              Select the matching counterpart transaction for this transfer.
            </DialogDescription>
          </DialogHeader>

          {pairDialogTx && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground mb-1">Selected transaction</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium truncate max-w-[260px]">
                      {pairDialogTx.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(pairDialogTx.date).toLocaleDateString()} ·{" "}
                      {accounts?.find((a) => a._id === pairDialogTx.accountId)?.name || "Unknown"}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-mono font-semibold",
                      pairDialogTx.amount > 0 ? "text-green-600" : "text-red-500"
                    )}
                  >
                    {pairDialogTx.amount > 0 ? "+" : ""}
                    {currencyExact(pairDialogTx.amount)}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Suggested matches (±7 days, different account, opposite sign)
                </div>
                {!pairSuggestionsRaw ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Loading suggestions...
                  </div>
                ) : pairSuggestions.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No matching transactions found in the ±7 day window.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {pairSuggestions.map((suggestion) => {
                      const suggAccount = accounts?.find((a) => a._id === suggestion.accountId);
                      const amountDiff = Math.abs(
                        Math.abs(suggestion.amount) - Math.abs(pairDialogTx.amount)
                      );
                      const isExactMatch = amountDiff < 0.01;
                      return (
                        <button
                          key={suggestion._id}
                          onClick={() => handlePairTransfer(suggestion._id)}
                          className="w-full flex items-center justify-between rounded-md border px-3 py-2.5 hover:bg-accent hover:border-primary/40 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{suggestion.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(suggestion.date).toLocaleDateString()} ·{" "}
                              {suggAccount?.name || "Unknown"}
                              {isExactMatch && (
                                <span className="ml-2 text-green-600 font-medium">
                                  exact match
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-sm font-mono font-semibold ml-3 flex-shrink-0",
                              suggestion.amount > 0 ? "text-green-600" : "text-red-500"
                            )}
                          >
                            {suggestion.amount > 0 ? "+" : ""}
                            {currencyExact(suggestion.amount)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPairDialogTx(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
