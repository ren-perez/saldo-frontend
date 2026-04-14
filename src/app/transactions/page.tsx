"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import {
    Search, X, Download, Trash2, ArrowRightLeft, ChevronDown, Upload, Plus, Info,
    CreditCard, ArrowUp, ArrowDown, ArrowUpDown, Link2
} from "lucide-react";
import { CreateTransactionDialog } from "@/components/CreateTransactionDialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { currencyExact, formatDate } from "@/lib/format";
import { toast } from "sonner";

function formatTimestampToDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
}

function dateStringToTimestamp(dateString: string): number {
    return new Date(dateString + "T00:00:00").getTime();
}

// Combobox component for categories and groups
function CategoryCombobox({
    value,
    onValueChange,
    options,
    placeholder,
    emptyText = "No options found",
    includeEmpty = true,
    emptyLabel = "— Uncategorized —"
}: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder: string;
    emptyText?: string;
    includeEmpty?: boolean;
    emptyLabel?: string;
}) {
    const [open, setOpen] = useState(false);

    const sortedOptions = [...options].sort((a, b) => a.label.localeCompare(b.label));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-left px-2 py-1 h-8 text-xs sm:text-sm"
                >
                    <span className="truncate">
                        {value
                            ? (value === "NONE" ? emptyLabel : options.find(opt => opt.value === value)?.label)
                            : placeholder
                        }
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50 ml-1 flex-shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-auto">
                        {includeEmpty && (
                            <CommandItem
                                value="NONE"
                                onSelect={() => {
                                    onValueChange("NONE");
                                    setOpen(false);
                                }}
                            >
                                {emptyLabel}
                            </CommandItem>
                        )}
                        {sortedOptions.map((option) => (
                            <CommandItem
                                key={option.value}
                                value={option.value}
                                onSelect={() => {
                                    onValueChange(option.value);
                                    setOpen(false);
                                }}
                            >
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

interface Transaction {
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

interface Account {
    _id: Id<"accounts">;
    userId: Id<"users">;
    name: string;
    number?: string;
    type: string;
    bank: string;
    createdAt: string;
    balance?: number;
}

interface Category {
    _id: Id<"categories">;
    userId: Id<"users">;
    name: string;
    transactionType?: string;
    groupId?: Id<"category_groups">;
    createdAt?: number;
}

interface CategoryGroup {
    _id: Id<"category_groups">;
    userId: Id<"users">;
    name: string;
    createdAt?: number;
}

interface TransactionUpdateData {
    transactionType?: string;
    categoryId?: Id<"categories">;
    clearTransactionType?: boolean;
    clearCategoryId?: boolean;
}

interface MobileTransactionCardProps {
    transaction: Transaction;
    account: Account | undefined;
    category: Category | undefined;
    group: CategoryGroup | undefined;
    categories: Category[];
    categoryGroups: CategoryGroup[];
    isDeleteMode: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    isExportMode: boolean;
    isSelectedForExport: boolean;
    onToggleExportSelect: () => void;
    onUpdate: (updates: TransactionUpdateData) => void;
    onUpdateByGroup: (groupId: string | undefined, clearGroup: boolean) => void;
    onPair: () => void;
}

function MobileTransactionCard({
    transaction,
    account,
    group,
    categories,
    categoryGroups,
    isDeleteMode,
    isSelected,
    onToggleSelect,
    isExportMode,
    isSelectedForExport,
    onToggleExportSelect,
    onUpdate,
    onUpdateByGroup,
    onPair,
}: MobileTransactionCardProps) {
    const getFilteredCategoryOptions = (transactionType: string | undefined, selectedGroupId: string | undefined) => {
        let filtered = categories || [];
        if (transactionType) {
            filtered = filtered.filter(cat => !cat.transactionType || cat.transactionType === transactionType);
        }
        if (selectedGroupId) {
            filtered = filtered.filter(cat => cat.groupId === selectedGroupId);
        }
        return filtered.map(cat => ({ value: cat._id, label: cat.name })).filter(o => o.value?.trim());
    };

    const getFilteredGroupOptions = (transactionType: string | undefined) => {
        if (!transactionType || !categories || !categoryGroups) {
            return categoryGroups?.map(g => ({ value: g._id, label: g.name })).filter(o => o.value?.trim()) || [];
        }
        const validGroupIds = new Set(
            categories.filter(cat => !cat.transactionType || cat.transactionType === transactionType).map(cat => cat.groupId).filter(Boolean)
        );
        return categoryGroups.filter(g => validGroupIds.has(g._id)).map(g => ({ value: g._id, label: g.name })).filter(o => o.value?.trim());
    };

    const isUnpairedTransfer = transaction.transactionType === "transfer" && !transaction.transfer_pair_id;

    return (
        <div
            className={cn(
                "border rounded-lg p-3 bg-card text-card-foreground transition-colors",
                isSelected && "border-primary bg-primary/5",
                isSelectedForExport && "border-primary bg-primary/5"
            )}
        >
            {/* Top row: checkbox (delete/export mode) | description | amount */}
            <div className="flex items-start gap-2">
                {isDeleteMode && (
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onToggleSelect}
                        className="mt-0.5 flex-shrink-0"
                    />
                )}
                {isExportMode && (
                    <Checkbox
                        checked={isSelectedForExport}
                        onCheckedChange={onToggleExportSelect}
                        className="mt-0.5 flex-shrink-0"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="text-sm font-medium text-left truncate max-w-[180px] hover:underline">
                                    {transaction.description || "—"}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                                {transaction.description || "—"}
                            </PopoverContent>
                        </Popover>
                        <span className={cn(
                            "text-sm font-mono font-semibold flex-shrink-0",
                            transaction.amount > 0 ? "text-green-600" : "text-red-500"
                        )}>
                            {transaction.amount > 0 ? "+" : ""}{currencyExact(transaction.amount)}
                        </span>
                    </div>
                    {/* Sub info: date + account */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formatTimestampToDate(transaction.date)}</span>
                        <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">{account?.name || "Unknown"}</Badge>
                        {transaction.transfer_pair_id && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs py-0 px-1.5 h-4">
                                <ArrowRightLeft className="h-2.5 w-2.5 mr-1" />Paired
                            </Badge>
                        )}
                        {isUnpairedTransfer && (
                            <button
                                onClick={onPair}
                                className="flex items-center gap-0.5 text-xs text-amber-600 hover:text-amber-700 underline"
                            >
                                <Link2 className="h-3 w-3" />Pair
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Category row (hidden in delete mode) */}
            {!isDeleteMode && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Type</span>
                        {transaction.transfer_pair_id ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs py-0">
                                <ArrowRightLeft className="h-2.5 w-2.5 mr-1" />Transfer
                            </Badge>
                        ) : (
                            <Select
                                value={transaction.transactionType || "NONE"}
                                onValueChange={(value) =>
                                    onUpdate(value === "NONE" ? { clearTransactionType: true } : { transactionType: value })
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
                            onValueChange={(value) =>
                                onUpdateByGroup(value === "NONE" ? undefined : value as Id<"category_groups">, value === "NONE")
                            }
                            options={getFilteredGroupOptions(transaction.transactionType)}
                            placeholder="Select..."
                            emptyLabel="— None —"
                        />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Category</span>
                        <CategoryCombobox
                            value={transaction.categoryId || "NONE"}
                            onValueChange={(value) =>
                                onUpdate(value === "NONE" ? { clearCategoryId: true } : { categoryId: value as Id<"categories"> })
                            }
                            options={getFilteredCategoryOptions(transaction.transactionType, group?._id)}
                            placeholder="Select..."
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Sortable header button
function SortableHead({
    label,
    field,
    sortField,
    sortDirection,
    onSort,
    className,
}: {
    label: string;
    field: "date" | "description" | "amount";
    sortField: string | null;
    sortDirection: "asc" | "desc";
    onSort: (f: "date" | "description" | "amount") => void;
    className?: string;
}) {
    const isActive = sortField === field;
    return (
        <TableHead className={cn("font-bold text-xs", className)}>
            <button
                onClick={() => onSort(field)}
                className="flex items-center gap-1 hover:text-foreground transition-colors group"
            >
                {label}
                {isActive ? (
                    sortDirection === "asc"
                        ? <ArrowUp className="h-3 w-3 text-primary" />
                        : <ArrowDown className="h-3 w-3 text-primary" />
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60" />
                )}
            </button>
        </TableHead>
    );
}

export default function TransactionsPage() {
    return (
        <Suspense fallback={<AppLayout><div className="flex items-center justify-center h-64"><div className="text-lg text-foreground">Loading...</div></div></AppLayout>}>
            <TransactionsContent />
        </Suspense>
    );
}

function TransactionsContent() {
    const { convexUser } = useConvexUser();
    const searchParams = useSearchParams();

    // Filters
    const [selectedAccount, setSelectedAccount] = useState<Id<"accounts"> | null>(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [groupFilter, setGroupFilter] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // Sort
    const [sortField, setSortField] = useState<"date" | "description" | "amount" | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    // Delete mode
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedForDelete, setSelectedForDelete] = useState<Set<Id<"transactions">>>(new Set());
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

    // Export mode
    const [exportMode, setExportMode] = useState(false);
    const [selectedForExport, setSelectedForExport] = useState<Set<Id<"transactions">>>(new Set());

    // Pair transfer dialog
    const [pairDialogTx, setPairDialogTx] = useState<Transaction | null>(null);

    const [showCreateDialog, setShowCreateDialog] = useState(false);

    useEffect(() => {
        const accountId = searchParams.get("accountId");
        if (accountId) setSelectedAccount(accountId as Id<"accounts">);
        const group = searchParams.get("groupId");
        if (group) setGroupFilter(group);
        const category = searchParams.get("categoryId");
        if (category) setCategoryFilter(category);
        const sd = searchParams.get("startDate");
        if (sd) setStartDate(sd);
        const ed = searchParams.get("endDate");
        if (ed) setEndDate(ed);
    }, [searchParams]);

    const updateTransaction = useMutation(api.transactions.updateTransaction);
    const updateTransactionByGroup = useMutation(api.transactions.updateTransactionByGroup);
    const deleteTransaction = useMutation(api.transactions.deleteTransaction);
    const updateTransactionAndCreateRule = useMutation(api.transactions.updateTransactionAndCreateRule);
    const pairTransfersMutation = useMutation(api.transfers.pairTransfers);

    const accounts = useQuery(api.accounts.listAccounts, convexUser ? { userId: convexUser._id } : "skip");
    const categories = useQuery(api.categories.listCategories, convexUser ? { userId: convexUser._id } : "skip");
    const categoryGroups = useQuery(api.categoryGroups.listCategoryGroups, convexUser ? { userId: convexUser._id } : "skip");

    const startTimestamp = startDate ? dateStringToTimestamp(startDate) : undefined;
    const endTimestamp = endDate ? dateStringToTimestamp(endDate) + (24 * 60 * 60 * 1000 - 1) : undefined;

    const transactions = useQuery(
        api.transactions.listTransactionsPaginated,
        convexUser
            ? {
                userId: convexUser._id,
                accountId: selectedAccount || undefined,
                transactionType: typeFilter === "UNTYPED" ? "untyped" : (typeFilter || undefined),
                categoryId: categoryFilter === "UNCATEGORIZED" ? "NONE" : (categoryFilter || undefined),
                groupId: groupFilter === "UNGROUPED" ? "NONE" : (groupFilter || undefined),
                searchTerm: search || undefined,
                startDate: startTimestamp,
                endDate: endTimestamp,
                page: currentPage,
                pageSize,
            }
            : "skip"
    );

    // Pair suggestions query: ±7 days around the selected transaction's date
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

    const pairSuggestions = pairSuggestionsRaw?.data.filter(tx =>
        tx._id !== pairDialogTx?._id &&
        tx.accountId !== pairDialogTx?.accountId &&
        !tx.transfer_pair_id &&
        pairDialogTx !== null &&
        ((pairDialogTx.amount < 0 && tx.amount > 0) || (pairDialogTx.amount > 0 && tx.amount < 0))
    ).sort((a, b) => {
        const aDiff = Math.abs(Math.abs(a.amount) - Math.abs(pairDialogTx!.amount));
        const bDiff = Math.abs(Math.abs(b.amount) - Math.abs(pairDialogTx!.amount));
        return aDiff - bDiff;
    }) || [];

    // Sort logic (client-side, current page)
    const sortedData = [...(transactions?.data || [])].sort((a, b) => {
        if (!sortField) return 0;
        let result = 0;
        if (sortField === "date") result = a.date - b.date;
        else if (sortField === "description") result = (a.description || "").localeCompare(b.description || "");
        else if (sortField === "amount") result = a.amount - b.amount;
        return sortDirection === "asc" ? result : -result;
    });

    const handleSort = (field: "date" | "description" | "amount") => {
        if (sortField === field) {
            setSortDirection(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    };

    const handleFilterChange = (fn: () => void) => {
        fn();
        setCurrentPage(1);
    };

    const clearSearch = () => {
        setSearch("");
        setCurrentPage(1);
    };

    const clearAllFilters = () => {
        setSelectedAccount(null);
        setTypeFilter(null);
        setCategoryFilter(null);
        setGroupFilter(null);
        setStartDate(null);
        setEndDate(null);
        setSearch("");
        setCurrentPage(1);
    };

    const setMTD = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const startStr = firstDay.toISOString().slice(0, 10);
        const endStr = now.toISOString().slice(0, 10);
        setStartDate(startStr);
        setEndDate(endStr);
        setCurrentPage(1);
    };

    const handleDeleteTransaction = async (transactionId: Id<"transactions">) => {
        try {
            await deleteTransaction({ transactionId });
        } catch (error) {
            console.error("Error deleting transaction:", error);
        }
    };

    const toggleDeleteMode = () => {
        setDeleteMode(d => !d);
        setSelectedForDelete(new Set());
        setExportMode(false);
        setSelectedForExport(new Set());
    };

    const toggleExportMode = () => {
        setExportMode(d => !d);
        setSelectedForExport(new Set());
        setDeleteMode(false);
        setSelectedForDelete(new Set());
    };

    const toggleSelectForDelete = (id: Id<"transactions">) => {
        setSelectedForDelete(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedForDelete.size === sortedData.length) {
            setSelectedForDelete(new Set());
        } else {
            setSelectedForDelete(new Set(sortedData.map(t => t._id)));
        }
    };

    const toggleSelectForExport = (id: Id<"transactions">) => {
        setSelectedForExport(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllForExport = () => {
        if (selectedForExport.size === sortedData.length) {
            setSelectedForExport(new Set());
        } else {
            setSelectedForExport(new Set(sortedData.map(t => t._id)));
        }
    };

    const handleExportCSV = (txs: Transaction[]) => {
        const headers = ["Date", "Description", "Account", "Type", "Group", "Category", "Amount"];
        const rows = txs.map(tx => {
            const account = accounts?.find(a => a._id === tx.accountId);
            const category = categories?.find(c => c._id === tx.categoryId);
            const group = categoryGroups?.find(g => g._id === category?.groupId);
            const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
            return [
                formatDate(tx.date),
                escape(tx.description || ""),
                escape(account?.name || ""),
                tx.transactionType || "",
                escape(group?.name || ""),
                escape(category?.name || ""),
                tx.amount.toString(),
            ].join(",");
        });
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${txs.length} transaction${txs.length !== 1 ? "s" : ""}`);
    };

    const handleBulkDelete = async () => {
        const count = selectedForDelete.size;
        for (const id of selectedForDelete) {
            await deleteTransaction({ transactionId: id });
        }
        setSelectedForDelete(new Set());
        setDeleteMode(false);
        setShowBulkDeleteDialog(false);
        toast.success(`Deleted ${count} transaction${count !== 1 ? "s" : ""}`);
    };

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
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to pair transactions");
        }
    };

    const totalPages = transactions ? Math.ceil(transactions.total / pageSize) : 0;
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, transactions?.total || 0);

    const categoryOptions = categories?.map(cat => ({ value: cat._id, label: cat.name })).filter(o => o.value?.trim()) || [];
    const groupOptions = categoryGroups?.map(g => ({ value: g._id, label: g.name })).filter(o => o.value?.trim()) || [];

    const getFilteredCategoryOptions = (transactionType: string | undefined, selectedGroupId: string | undefined) => {
        let filtered = categories || [];
        if (transactionType) filtered = filtered.filter(cat => !cat.transactionType || cat.transactionType === transactionType);
        if (selectedGroupId) filtered = filtered.filter(cat => cat.groupId === selectedGroupId);
        return filtered.map(cat => ({ value: cat._id, label: cat.name })).filter(o => o.value?.trim());
    };

    const getFilteredGroupOptions = (transactionType: string | undefined) => {
        if (!transactionType || !categories || !categoryGroups) return groupOptions;
        const validGroupIds = new Set(
            categories.filter(cat => !cat.transactionType || cat.transactionType === transactionType).map(cat => cat.groupId).filter(Boolean)
        );
        return categoryGroups.filter(g => validGroupIds.has(g._id)).map(g => ({ value: g._id, label: g.name })).filter(o => o.value?.trim());
    };

    const activeFiltersCount = [selectedAccount, typeFilter, categoryFilter, groupFilter, startDate, endDate, search].filter(Boolean).length;

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg text-foreground">Please sign in to view transactions.</div>
                </div>
            </AppLayout>
        );
    }

    return (
        <>
            <AppLayout>
                <InitUser />
                <div className="container mx-auto py-6 px-6">

                    {/* Header */}
                    <div className="flex flex-col gap-4 mb-6">

                        {/* Title */}
                        <div className="flex items-center gap-1.5">
                            <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
                                <CreditCard className="h-8 w-8 text-primary" />
                                Transactions
                            </h1>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>View and manage your imported transactions</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* CTAs */}
                        <div className="flex items-center gap-2 justify-end mb-6 flex-wrap">
                            {deleteMode ? (
                                <>
                                    <span className="text-sm text-muted-foreground">
                                        {selectedForDelete.size} selected
                                    </span>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={selectedForDelete.size === 0}
                                        onClick={() => setShowBulkDeleteDialog(true)}
                                        className="gap-1.5"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete {selectedForDelete.size > 0 ? selectedForDelete.size : ""}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={toggleDeleteMode}>
                                        Cancel
                                    </Button>
                                </>
                            ) : exportMode ? (
                                <>
                                    <span className="text-sm text-muted-foreground">
                                        {selectedForExport.size > 0 ? `${selectedForExport.size} selected` : "Select rows to export"}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={selectedForExport.size === 0}
                                        onClick={() => {
                                            const txs = sortedData.filter(t => selectedForExport.has(t._id));
                                            handleExportCSV(txs);
                                        }}
                                        className="gap-1.5"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export Selected ({selectedForExport.size})
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={sortedData.length === 0}
                                        onClick={() => handleExportCSV(sortedData)}
                                        className="gap-1.5"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export Page ({sortedData.length})
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={toggleExportMode}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="sm" className="gap-1.5">
                                                <Plus className="h-4 w-4" />
                                                Add
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem asChild>
                                                <Link href="/import-csv" className="flex items-center gap-2">
                                                    <Upload className="h-4 w-4" />
                                                    Import CSV
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="flex items-center gap-2" onClick={() => setShowCreateDialog(true)}>
                                                <Plus className="h-4 w-4" />
                                                Add Transaction
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/transfers-inbox">
                                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                                            Transfers Inbox
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={toggleExportMode}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={toggleDeleteMode}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete transactions</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </>
                            )}
                        </div>

                        {/* Divider with Clear All */}
                        <div className="relative mb-3">
                            <div className="border-t border-border" />
                            {activeFiltersCount > 0 && (
                                <div className="absolute right-0 -top-3 bg-background">
                                    <Button
                                        variant="ghost"
                                        onClick={clearAllFilters}
                                        className="h-6 gap-2 text-muted-foreground hover:text-foreground text-xs px-2 py-3"
                                    >
                                        Clear all
                                        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[11px]">
                                            {activeFiltersCount}
                                        </Badge>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col gap-3 mb-3">
                            {/* Row 1: Transaction Types | Search */}
                            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-3">
                                <div className="flex items-center gap-1.5 overflow-x-auto">
                                    {([
                                        { value: null, label: "All" },
                                        { value: "income", label: "Income" },
                                        { value: "expense", label: "Expenses" },
                                        { value: "transfer", label: "Transfers" },
                                        { value: "UNTYPED", label: "Untyped" },
                                    ] as const).map((tab) => (
                                        <Button
                                            key={tab.label}
                                            variant={typeFilter === tab.value ? "default" : "outline"}
                                            size="sm"
                                            className="h-8 text-xs flex-shrink-0"
                                            onClick={() => handleFilterChange(() => setTypeFilter(tab.value))}
                                        >
                                            {tab.label}
                                            {transactions && tab.value === null && (
                                                <span className="ml-1.5 text-xs opacity-70">{transactions.total}</span>
                                            )}
                                        </Button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        type="text"
                                        placeholder="Search transactions..."
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                        className="pl-9 pr-9 h-8 text-sm"
                                    />
                                    {search && (
                                        <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Accounts + Categories + Groups | From + To + MTD */}
                            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={selectedAccount || "ALL_ACCOUNTS"}
                                        onValueChange={(value) =>
                                            handleFilterChange(() => setSelectedAccount(value === "ALL_ACCOUNTS" ? null : value as Id<"accounts">))
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                                            <SelectValue placeholder="All Accounts" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL_ACCOUNTS">All Accounts</SelectItem>
                                            {accounts?.filter(a => a._id?.trim()).map((account) => (
                                                <SelectItem key={account._id} value={account._id}>
                                                    {account.name} ({account.bank})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={categoryFilter === "NONE" ? "UNCATEGORIZED" : (categoryFilter || "ALL_CATEGORIES")}
                                        onValueChange={(value) =>
                                            handleFilterChange(() => setCategoryFilter(value === "ALL_CATEGORIES" ? null : (value === "UNCATEGORIZED" ? "NONE" : value)))
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL_CATEGORIES">All Categories</SelectItem>
                                            <SelectItem value="UNCATEGORIZED">-- Uncategorized --</SelectItem>
                                            {categoryOptions.sort((a, b) => a.label.localeCompare(b.label)).map((option) => (
                                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={groupFilter === "NONE" ? "UNGROUPED" : (groupFilter || "ALL_GROUPS")}
                                        onValueChange={(value) =>
                                            handleFilterChange(() => setGroupFilter(value === "ALL_GROUPS" ? null : (value === "UNGROUPED" ? "NONE" : value)))
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                                            <SelectValue placeholder="All Groups" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL_GROUPS">All Groups</SelectItem>
                                            <SelectItem value="UNGROUPED">-- No Group --</SelectItem>
                                            {groupOptions.sort((a, b) => a.label.localeCompare(b.label)).map((option) => (
                                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Date Filters + MTD */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                                        <Input
                                            type="date"
                                            value={startDate || ""}
                                            onChange={(e) => handleFilterChange(() => setStartDate(e.target.value || null))}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                                        <Input
                                            type="date"
                                            value={endDate || ""}
                                            onChange={(e) => handleFilterChange(() => setEndDate(e.target.value || null))}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={setMTD}
                                                    className="h-8 px-2 text-xs text-muted-foreground flex-shrink-0"
                                                >
                                                    MTD
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Set to month-to-date</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {(!transactions || transactions.data.length === 0) ? (
                        <Card>
                            <CardContent className="p-6 sm:p-8 text-center">
                                <div className="text-3xl sm:text-4xl mb-4">💰</div>
                                <h3 className="text-base sm:text-lg font-medium mb-2">No transactions found</h3>
                                <p className="mb-4 text-muted-foreground text-sm sm:text-base">
                                    {activeFiltersCount > 0
                                        ? "Try adjusting your filters to see more transactions."
                                        : selectedAccount
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
                            {/* Mobile View */}
                            <div className="block lg:hidden space-y-2">
                                {deleteMode && sortedData.length > 0 && (
                                    <div className="flex items-center gap-2 pb-1">
                                        <Checkbox
                                            checked={selectedForDelete.size === sortedData.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                        <span className="text-xs text-muted-foreground">Select all on this page</span>
                                    </div>
                                )}
                                {exportMode && sortedData.length > 0 && (
                                    <div className="flex items-center gap-2 pb-1">
                                        <Checkbox
                                            checked={selectedForExport.size === sortedData.length}
                                            onCheckedChange={toggleSelectAllForExport}
                                        />
                                        <span className="text-xs text-muted-foreground">Select all on this page</span>
                                    </div>
                                )}
                                {sortedData.map((transaction) => {
                                    const account = accounts?.find(a => a._id === transaction.accountId);
                                    const category = categories?.find(c => c._id === transaction.categoryId);
                                    const group = categoryGroups?.find(g => g._id === category?.groupId);
                                    return (
                                        <MobileTransactionCard
                                            key={transaction._id}
                                            transaction={transaction}
                                            account={account}
                                            category={category}
                                            group={group}
                                            categories={categories || []}
                                            categoryGroups={categoryGroups || []}
                                            isDeleteMode={deleteMode}
                                            isSelected={selectedForDelete.has(transaction._id)}
                                            onToggleSelect={() => toggleSelectForDelete(transaction._id)}
                                            isExportMode={exportMode}
                                            isSelectedForExport={selectedForExport.has(transaction._id)}
                                            onToggleExportSelect={() => toggleSelectForExport(transaction._id)}
                                            onUpdate={(updates) => updateTransaction({ transactionId: transaction._id, updates })}
                                            onUpdateByGroup={(groupId, clearGroup) =>
                                                updateTransactionByGroup({
                                                    transactionId: transaction._id,
                                                    groupId: groupId as Id<"category_groups"> | undefined,
                                                    clearGroup,
                                                })
                                            }
                                            onPair={() => setPairDialogTx(transaction)}
                                        />
                                    );
                                })}
                            </div>

                            {/* Desktop Table View */}
                            <Card className="hidden lg:block">
                                {/* Page Size + Info */}
                                <div className="px-6 mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                        {!transactions ? "Loading..." : transactions.total === 0 ? "Showing 0 transactions" : `Showing ${startItem} to ${endItem} of ${transactions.total} transactions`}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs sm:text-sm text-muted-foreground">Show</span>
                                        <Select
                                            value={pageSize.toString()}
                                            onValueChange={(value) => { setPageSize(parseInt(value)); setCurrentPage(1); }}
                                        >
                                            <SelectTrigger className="w-16 sm:w-20 text-xs sm:text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="15">15</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <span className="text-xs sm:text-sm text-muted-foreground">per page</span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {deleteMode && (
                                                    <TableHead className="pl-6 w-10">
                                                        <Checkbox
                                                            checked={selectedForDelete.size === sortedData.length && sortedData.length > 0}
                                                            onCheckedChange={toggleSelectAll}
                                                        />
                                                    </TableHead>
                                                )}
                                                {exportMode && (
                                                    <TableHead className="pl-6 w-10">
                                                        <Checkbox
                                                            checked={selectedForExport.size === sortedData.length && sortedData.length > 0}
                                                            onCheckedChange={toggleSelectAllForExport}
                                                        />
                                                    </TableHead>
                                                )}
                                                <SortableHead label="Date" field="date" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="pl-6" />
                                                <SortableHead label="Description" field="description" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                                                <TableHead className="font-bold text-xs">Account</TableHead>
                                                <TableHead className="font-bold text-xs">Type</TableHead>
                                                <TableHead className="font-bold text-xs">Group</TableHead>
                                                <TableHead className="font-bold text-xs">Category</TableHead>
                                                <SortableHead label="Amount" field="amount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="text-right" />
                                                {!deleteMode && <TableHead className="w-10 pr-6" />}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedData.map((transaction) => {
                                                const account = accounts?.find(a => a._id === transaction.accountId);
                                                const category = categories?.find(c => c._id === transaction.categoryId);
                                                const group = categoryGroups?.find(g => g._id === category?.groupId);
                                                const isUnpairedTransfer = transaction.transactionType === "transfer" && !transaction.transfer_pair_id;

                                                return (
                                                    <TableRow
                                                        key={transaction._id}
                                                        className={cn(
                                                            deleteMode && selectedForDelete.has(transaction._id) && "bg-primary/5",
                                                            exportMode && selectedForExport.has(transaction._id) && "bg-primary/5",
                                                        )}
                                                        onClick={
                                                            deleteMode ? () => toggleSelectForDelete(transaction._id)
                                                            : exportMode ? () => toggleSelectForExport(transaction._id)
                                                            : undefined
                                                        }
                                                    >
                                                        {deleteMode && (
                                                            <TableCell className="pl-6">
                                                                <Checkbox
                                                                    checked={selectedForDelete.has(transaction._id)}
                                                                    onCheckedChange={() => toggleSelectForDelete(transaction._id)}
                                                                />
                                                            </TableCell>
                                                        )}
                                                        {exportMode && (
                                                            <TableCell className="pl-6">
                                                                <Checkbox
                                                                    checked={selectedForExport.has(transaction._id)}
                                                                    onCheckedChange={() => toggleSelectForExport(transaction._id)}
                                                                />
                                                            </TableCell>
                                                        )}
                                                        <TableCell className="pl-6 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                                                            {formatDate(transaction.date)}
                                                        </TableCell>
                                                        <TableCell className="max-w-[300px] truncate">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" className="w-full justify-start p-0 h-auto font-normal text-left truncate text-sm">
                                                                        {transaction.description || "—"}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                                                                    {transaction.description}
                                                                </PopoverContent>
                                                            </Popover>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {account?.name || "None"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {transaction.transfer_pair_id ? (
                                                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                                                                    <ArrowRightLeft className="h-3 w-3 mr-1" />Transfer
                                                                </Badge>
                                                            ) : isUnpairedTransfer ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Select
                                                                        value={transaction.transactionType || "NONE"}
                                                                        onValueChange={(value) =>
                                                                            updateTransaction({
                                                                                transactionId: transaction._id,
                                                                                updates: value === "NONE" ? { clearTransactionType: true } : { transactionType: value },
                                                                            })
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
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600"
                                                                                    onClick={() => setPairDialogTx(transaction)}
                                                                                >
                                                                                    <Link2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Pair this transfer</TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            ) : (
                                                                <Select
                                                                    value={transaction.transactionType || "NONE"}
                                                                    onValueChange={(value) =>
                                                                        updateTransaction({
                                                                            transactionId: transaction._id,
                                                                            updates: value === "NONE" ? { clearTransactionType: true } : { transactionType: value },
                                                                        })
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
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <CategoryCombobox
                                                                value={group?._id || "NONE"}
                                                                onValueChange={(value) =>
                                                                    updateTransactionByGroup({
                                                                        transactionId: transaction._id,
                                                                        groupId: value === "NONE" ? undefined : value as Id<"category_groups">,
                                                                        clearGroup: value === "NONE",
                                                                    })
                                                                }
                                                                options={getFilteredGroupOptions(transaction.transactionType)}
                                                                placeholder="Select..."
                                                                emptyLabel="— No Group —"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <CategoryCombobox
                                                                value={transaction.categoryId || "NONE"}
                                                                onValueChange={async (value) => {
                                                                    if (value === "NONE") {
                                                                        await updateTransaction({ transactionId: transaction._id, updates: { clearCategoryId: true } });
                                                                        return;
                                                                    }
                                                                    await updateTransaction({ transactionId: transaction._id, updates: { categoryId: value as Id<"categories"> } });
                                                                    const catName = categories?.find(c => c._id === value)?.name ?? value;
                                                                    const desc = transaction.description;
                                                                    if (desc && desc.trim().length >= 3) {
                                                                        toast(`Updated to ${catName}.`, {
                                                                            action: {
                                                                                label: `Always → ${catName}`,
                                                                                onClick: () => {
                                                                                    updateTransactionAndCreateRule({
                                                                                        transactionId: transaction._id,
                                                                                        categoryId: value as Id<"categories">,
                                                                                        saveRule: true,
                                                                                        rulePattern: desc.trim(),
                                                                                    }).catch(() => {});
                                                                                },
                                                                            },
                                                                            duration: 6000,
                                                                        });
                                                                    }
                                                                }}
                                                                options={getFilteredCategoryOptions(transaction.transactionType, group?._id)}
                                                                placeholder="Select..."
                                                            />
                                                        </TableCell>
                                                        <TableCell className={cn(
                                                            "text-right font-mono font-semibold text-sm",
                                                            transaction.amount > 0 ? "text-green-600" : "text-red-500"
                                                        )}>
                                                            {transaction.amount > 0 ? "+" : ""}{currencyExact(transaction.amount)}
                                                        </TableCell>
                                                        {!deleteMode && (
                                                            <TableCell className="w-10 pr-6">
                                                                {/* intentionally empty — use delete mode for deletes */}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </>
                    )}

                    {/* Pagination */}
                    {transactions && transactions.total > pageSize && (
                        <div className="mt-6">
                            <Pagination>
                                <PaginationContent className="flex-wrap gap-1">
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            className={`text-xs sm:text-sm ${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
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
                                            className={`text-xs sm:text-sm ${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            </AppLayout>

            {/* Create Transaction Dialog */}
            <CreateTransactionDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

            {/* Bulk Delete Confirmation */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedForDelete.size} transaction{selectedForDelete.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {selectedForDelete.size} selected transaction{selectedForDelete.size !== 1 ? "s" : ""}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete {selectedForDelete.size}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Pair Transfer Dialog */}
            <Dialog open={!!pairDialogTx} onOpenChange={(open) => { if (!open) setPairDialogTx(null); }}>
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
                            {/* Source transaction */}
                            <div className="rounded-lg border bg-muted/40 p-3">
                                <div className="text-xs text-muted-foreground mb-1">Selected transaction</div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium truncate max-w-[260px]">{pairDialogTx.description}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatTimestampToDate(pairDialogTx.date)} · {accounts?.find(a => a._id === pairDialogTx.accountId)?.name || "Unknown"}
                                        </div>
                                    </div>
                                    <span className={cn("text-sm font-mono font-semibold", pairDialogTx.amount > 0 ? "text-green-600" : "text-red-500")}>
                                        {pairDialogTx.amount > 0 ? "+" : ""}{currencyExact(pairDialogTx.amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Suggestions */}
                            <div>
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                    Suggested matches (±7 days, different account, opposite sign)
                                </div>
                                {!pairSuggestionsRaw ? (
                                    <div className="text-sm text-muted-foreground py-4 text-center">Loading suggestions...</div>
                                ) : pairSuggestions.length === 0 ? (
                                    <div className="text-sm text-muted-foreground py-4 text-center">No matching transactions found in the ±7 day window.</div>
                                ) : (
                                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                        {pairSuggestions.map((suggestion) => {
                                            const suggAccount = accounts?.find(a => a._id === suggestion.accountId);
                                            const amountDiff = Math.abs(Math.abs(suggestion.amount) - Math.abs(pairDialogTx.amount));
                                            const isExactMatch = amountDiff < 0.01;
                                            return (
                                                <button
                                                    key={suggestion._id}
                                                    onClick={() => handlePairTransfer(suggestion._id)}
                                                    className="w-full flex items-center justify-between rounded-md border px-3 py-2.5 hover:bg-accent hover:border-primary/40 transition-colors text-left group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm truncate">{suggestion.description}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatTimestampToDate(suggestion.date)} · {suggAccount?.name || "Unknown"}
                                                            {isExactMatch && (
                                                                <span className="ml-2 text-green-600 font-medium">exact match</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={cn("text-sm font-mono font-semibold ml-3 flex-shrink-0", suggestion.amount > 0 ? "text-green-600" : "text-red-500")}>
                                                        {suggestion.amount > 0 ? "+" : ""}{currencyExact(suggestion.amount)}
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
                        <Button variant="outline" onClick={() => setPairDialogTx(null)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
