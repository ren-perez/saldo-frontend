"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Search, X, Download, Trash2, ArrowRightLeft, ChevronDown, Upload, Plus } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { currencyExact, formatDate } from "@/lib/format";

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

    // Sort options alphabetically
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

// Update function props interface
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
    onUpdate: (updates: TransactionUpdateData) => void;
    onUpdateByGroup: (groupId: string | undefined, clearGroup: boolean) => void;
    onDelete: () => void;
}

function MobileTransactionCard({
    transaction,
    account,
    group,
    categories,
    categoryGroups,
    onUpdate,
    onUpdateByGroup,
    onDelete
}: MobileTransactionCardProps) {
    const getFilteredCategoryOptions = (transactionType: string | undefined, selectedGroupId: string | undefined) => {
        let filtered = categories || [];

        if (transactionType) {
            filtered = filtered.filter(cat =>
                !cat.transactionType || cat.transactionType === transactionType
            );
        }

        if (selectedGroupId) {
            filtered = filtered.filter(cat => cat.groupId === selectedGroupId);
        }

        return filtered.map(cat => ({
            value: cat._id,
            label: cat.name
        })).filter(option => option.value && option.value.trim() !== "");
    };

    const getFilteredGroupOptions = (transactionType: string | undefined) => {
        if (!transactionType || !categories || !categoryGroups) {
            return categoryGroups?.map(group => ({
                value: group._id,
                label: group.name
            })).filter(option => option.value && option.value.trim() !== "") || [];
        }

        const validGroupIds = new Set(
            categories
                .filter(cat => !cat.transactionType || cat.transactionType === transactionType)
                .map(cat => cat.groupId)
                .filter(Boolean)
        );

        return categoryGroups
            .filter(group => validGroupIds.has(group._id))
            .map(group => ({
                value: group._id,
                label: group.name
            }))
            .filter(option => option.value && option.value.trim() !== "");
    };

    return (
        <Card className="mb-3">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start p-0 h-auto font-medium text-sm text-left"
                                >
                                    <div className="truncate">{transaction.description || "—"}</div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                                {transaction.description || "—"}
                            </PopoverContent>
                        </Popover>
                        <div className="text-xs text-muted-foreground">
                            {formatTimestampToDate(transaction.date)}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                            {account?.name || "Unknown"}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                            className={cn(
                                "text-sm font-mono font-semibold",
                                transaction.amount >= 0 ? "text-primary" : "text-foreground"
                            )}
                        >
                            {transaction.amount >= 0 ? "+" : ""}{currencyExact(transaction.amount)}
                        </span>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete this transaction?
                                        <br /><br />
                                        <strong>Description:</strong> {transaction.description}
                                        <br />
                                        <strong>Amount:</strong> ${Math.abs(transaction.amount).toFixed(2)}
                                        <br />
                                        <strong>Date:</strong> {formatTimestampToDate(transaction.date)}
                                        <br /><br />
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={onDelete}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        {transaction.transfer_pair_id ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                Transfer
                            </Badge>
                        ) : (
                            <Select
                                value={transaction.transactionType || "NONE"}
                                onValueChange={(value) =>
                                    onUpdate(value === "NONE"
                                        ? { clearTransactionType: true }
                                        : { transactionType: value })
                                }
                            >
                                <SelectTrigger className="w-full h-7 text-xs">
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

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs text-muted-foreground">Group</Label>
                            <CategoryCombobox
                                value={group?._id || "NONE"}
                                onValueChange={(value) =>
                                    onUpdateByGroup(
                                        value === "NONE" ? undefined : value as Id<"category_groups">,
                                        value === "NONE"
                                    )
                                }
                                options={getFilteredGroupOptions(transaction.transactionType)}
                                placeholder="Select..."
                                emptyLabel="— No Group —"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Category</Label>
                            <CategoryCombobox
                                value={transaction.categoryId || "NONE"}
                                onValueChange={(value) =>
                                    onUpdate(value === "NONE"
                                        ? { clearCategoryId: true }
                                        : { categoryId: value as Id<"categories"> })
                                }
                                options={getFilteredCategoryOptions(transaction.transactionType, group?._id)}
                                placeholder="Select..."
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TransactionsPage() {
    const { convexUser } = useConvexUser();
    const [selectedAccount, setSelectedAccount] = useState<Id<"accounts"> | null>(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [groupFilter, setGroupFilter] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const updateTransaction = useMutation(api.transactions.updateTransaction);
    const updateTransactionByGroup = useMutation(api.transactions.updateTransactionByGroup);
    const deleteTransaction = useMutation(api.transactions.deleteTransaction);

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

    const startTimestamp = startDate
        ? dateStringToTimestamp(startDate)
        : undefined;
    const endTimestamp = endDate
        ? dateStringToTimestamp(endDate) + (24 * 60 * 60 * 1000 - 1)
        : undefined;

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

    const handleDeleteTransaction = async (transactionId: Id<"transactions">) => {
        try {
            await deleteTransaction({ transactionId });
        } catch (error) {
            console.error("Error deleting transaction:", error);
        }
    };

    const totalPages = transactions
        ? Math.ceil(transactions.total / pageSize)
        : 0;
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, transactions?.total || 0);

    // Prepare options for comboboxes
    const categoryOptions = categories?.map(cat => ({
        value: cat._id,
        label: cat.name
    })).filter(option => option.value && option.value.trim() !== "") || [];

    const groupOptions = categoryGroups?.map(group => ({
        value: group._id,
        label: group.name
    })).filter(option => option.value && option.value.trim() !== "") || [];

    const getFilteredCategoryOptions = (transactionType: string | undefined, selectedGroupId: string | undefined) => {
        let filtered = categories || [];

        if (transactionType) {
            filtered = filtered.filter(cat =>
                !cat.transactionType || cat.transactionType === transactionType
            );
        }

        if (selectedGroupId) {
            filtered = filtered.filter(cat => cat.groupId === selectedGroupId);
        }

        return filtered.map(cat => ({
            value: cat._id,
            label: cat.name
        })).filter(option => option.value && option.value.trim() !== "");
    };

    const getFilteredGroupOptions = (transactionType: string | undefined) => {
        if (!transactionType || !categories || !categoryGroups) return groupOptions;

        const validGroupIds = new Set(
            categories
                .filter(cat => !cat.transactionType || cat.transactionType === transactionType)
                .map(cat => cat.groupId)
                .filter(Boolean)
        );

        return categoryGroups
            .filter(group => validGroupIds.has(group._id))
            .map(group => ({
                value: group._id,
                label: group.name
            }))
            .filter(option => option.value && option.value.trim() !== "");
    };

    const activeFiltersCount = [
        selectedAccount,
        typeFilter,
        categoryFilter,
        groupFilter,
        startDate,
        endDate,
        search
    ].filter(Boolean).length;

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg text-foreground">
                        Please sign in to view transactions.
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <InitUser />
            <div className="container mx-auto py-6 px-4">
                {/* Header */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Transactions
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                View and manage your imported transactions
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Add/Create dropdown - CSV default, manual option */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" className="gap-1.5">
                                        <Plus className="h-4 w-4" />
                                        Add
                                        <ChevronDown className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href="/import-csv" className="flex items-center gap-2">
                                            <Upload className="h-4 w-4" />
                                            Import CSV
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="flex items-center gap-2">
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
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col gap-3">
                        {/* Row 1: Transaction Types + Search + Clear All */}
                        <div className="flex items-center gap-3">
                            {/* Transaction Types */}
                            <div className="flex items-center gap-1.5">
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
                                        className="h-8 text-xs"
                                        onClick={() => handleFilterChange(() => setTypeFilter(tab.value))}
                                    >
                                        {tab.label}
                                        {transactions && tab.value === null && (
                                            <span className="ml-1.5 text-xs opacity-70">
                                                {transactions.total}
                                            </span>
                                        )}
                                    </Button>
                                ))}
                            </div>

                            {/* Search Bar */}
                            <div className="flex-1 max-w-xs">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        type="text"
                                        placeholder="Search transactions..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="pl-9 pr-9 h-8 text-sm"
                                    />
                                    {search && (
                                        <button
                                            onClick={clearSearch}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Clear All with badge */}
                            {activeFiltersCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAllFilters}
                                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Clear all
                                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                                        {activeFiltersCount}
                                    </Badge>
                                </Button>
                            )}
                        </div>

                        {/* Row 2: Accounts, Categories, Groups, Date Range */}
                        <div className="flex items-center gap-3">
                            {/* Accounts */}
                            <Select
                                value={selectedAccount || "ALL_ACCOUNTS"}
                                onValueChange={(value) =>
                                    handleFilterChange(() =>
                                        setSelectedAccount(value === "ALL_ACCOUNTS" ? null : value as Id<"accounts">)
                                    )
                                }
                            >
                                <SelectTrigger className="w-[160px] h-8 text-xs">
                                    <SelectValue placeholder="All Accounts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL_ACCOUNTS">All Accounts</SelectItem>
                                    {accounts?.filter(account => account._id && account._id.trim()).map((account) => (
                                        <SelectItem key={account._id} value={account._id}>
                                            {account.name} ({account.bank})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Category */}
                            <Select
                                value={categoryFilter === "NONE" ? "UNCATEGORIZED" : (categoryFilter || "ALL_CATEGORIES")}
                                onValueChange={(value) =>
                                    handleFilterChange(() =>
                                        setCategoryFilter(value === "ALL_CATEGORIES" ? null : (value === "UNCATEGORIZED" ? "NONE" : value))
                                    )
                                }
                            >
                                <SelectTrigger className="w-[160px] h-8 text-xs">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL_CATEGORIES">All Categories</SelectItem>
                                    <SelectItem value="UNCATEGORIZED">-- Uncategorized --</SelectItem>
                                    {categoryOptions
                                        .sort((a, b) => a.label.localeCompare(b.label))
                                        .map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>

                            {/* Group */}
                            <Select
                                value={groupFilter === "NONE" ? "UNGROUPED" : (groupFilter || "ALL_GROUPS")}
                                onValueChange={(value) =>
                                    handleFilterChange(() =>
                                        setGroupFilter(value === "ALL_GROUPS" ? null : (value === "UNGROUPED" ? "NONE" : value))
                                    )
                                }
                            >
                                <SelectTrigger className="w-[140px] h-8 text-xs">
                                    <SelectValue placeholder="All Groups" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL_GROUPS">All Groups</SelectItem>
                                    <SelectItem value="UNGROUPED">-- No Group --</SelectItem>
                                    {groupOptions
                                        .sort((a, b) => a.label.localeCompare(b.label))
                                        .map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>

                            {/* Date Filters - inline labels */}
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                                <Input
                                    type="date"
                                    value={startDate || ""}
                                    onChange={(e) =>
                                        handleFilterChange(() => setStartDate(e.target.value || null))
                                    }
                                    className="w-[130px] h-8 text-xs"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                                <Input
                                    type="date"
                                    value={endDate || ""}
                                    onChange={(e) =>
                                        handleFilterChange(() => setEndDate(e.target.value || null))
                                    }
                                    className="w-[130px] h-8 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile/Desktop View Toggle */}
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
                        <div className="block lg:hidden space-y-3">
                            {transactions.data.map((transaction) => {
                                const account = accounts?.find(
                                    (a) => a._id === transaction.accountId
                                );
                                const category = categories?.find(
                                    (c) => c._id === transaction.categoryId
                                );
                                const group = categoryGroups?.find(
                                    (g) => g._id === category?.groupId
                                );

                                return (
                                    <MobileTransactionCard
                                        key={transaction._id}
                                        transaction={transaction}
                                        account={account}
                                        category={category}
                                        group={group}
                                        categories={categories || []}
                                        categoryGroups={categoryGroups || []}
                                        onUpdate={(updates) =>
                                            updateTransaction({
                                                transactionId: transaction._id,
                                                updates,
                                            })
                                        }
                                        onUpdateByGroup={(groupId, clearGroup) =>
                                            updateTransactionByGroup({
                                                transactionId: transaction._id,
                                                groupId: groupId as Id<"category_groups"> | undefined,
                                                clearGroup,
                                            })
                                        }
                                        onDelete={() => handleDeleteTransaction(transaction._id)}
                                    />
                                );
                            })}
                        </div>

                        {/* Desktop Table View */}
                        <Card className="hidden lg:block">
                            {/* Page Size + Info */}
                            <div className="px-6 mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                    {!transactions ? (
                                        "Loading..."
                                    ) : transactions.total === 0 ? (
                                        "Showing 0 transactions"
                                    ) : (
                                        `Showing ${startItem} to ${endItem} of ${transactions.total} transactions`
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm text-muted-foreground">Show</span>
                                    <Select
                                        value={pageSize.toString()}
                                        onValueChange={(value) => {
                                            setPageSize(parseInt(value));
                                            setCurrentPage(1);
                                        }}
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
                                            <TableHead className="font-bold pl-6 text-xs">Date</TableHead>
                                            <TableHead className="font-bold text-xs">Description</TableHead>
                                            <TableHead className="font-bold text-xs">Account</TableHead>
                                            <TableHead className="font-bold text-xs">Type</TableHead>
                                            <TableHead className="font-bold text-xs">Group</TableHead>
                                            <TableHead className="font-bold text-xs">Category</TableHead>
                                            <TableHead className="font-bold text-right text-xs">Amount</TableHead>
                                            <TableHead className="font-bold pr-6 w-12 text-xs">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.data.map((transaction) => {
                                            const account = accounts?.find(
                                                (a) => a._id === transaction.accountId
                                            );
                                            const category = categories?.find(
                                                (c) => c._id === transaction.categoryId
                                            );
                                            const group = categoryGroups?.find(
                                                (g) => g._id === category?.groupId
                                            );

                                            return (
                                                <TableRow key={transaction._id}>
                                                    <TableCell className="pl-6 text-sm tabular-nums text-muted-foreground">
                                                        {formatDate(transaction.date)}
                                                    </TableCell>
                                                    <TableCell className="max-w-[180px] truncate">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    className="w-full justify-start p-0 h-auto font-normal text-left truncate text-sm"
                                                                >
                                                                    {transaction.description || "—"}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                                                                {transaction.description}
                                                            </PopoverContent>
                                                        </Popover>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {account?.name || "None"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {transaction.transfer_pair_id ? (
                                                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                                                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                                                Transfer
                                                            </Badge>
                                                        ) : (
                                                            <Select
                                                                value={transaction.transactionType || "NONE"}
                                                                onValueChange={(value) =>
                                                                    updateTransaction({
                                                                        transactionId: transaction._id,
                                                                        updates: value === "NONE"
                                                                            ? { clearTransactionType: true }
                                                                            : { transactionType: value },
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
                                                            onValueChange={(value) =>
                                                                updateTransaction({
                                                                    transactionId: transaction._id,
                                                                    updates: value === "NONE"
                                                                        ? { clearCategoryId: true }
                                                                        : { categoryId: value as Id<"categories"> },
                                                                })
                                                            }
                                                            options={getFilteredCategoryOptions(transaction.transactionType, group?._id)}
                                                            placeholder="Select..."
                                                        />
                                                    </TableCell>
                                                    <TableCell
                                                        className={cn(
                                                            "text-right font-mono font-semibold text-sm",
                                                            transaction.amount > 0 && "text-green-600"
                                                        )}
                                                    >
                                                        {transaction.amount > 0 ? "+" : ""}
                                                        {currencyExact(transaction.amount)}
                                                    </TableCell>

                                                    <TableCell>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to delete this transaction?
                                                                        <br />
                                                                        <br />
                                                                        <strong>Description:</strong> {transaction.description}
                                                                        <br />
                                                                        <strong>Amount:</strong> ${Math.abs(transaction.amount).toFixed(2)}
                                                                        <br />
                                                                        <strong>Date:</strong> {formatTimestampToDate(transaction.date)}
                                                                        <br />
                                                                        <br />
                                                                        This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDeleteTransaction(transaction._id)}
                                                                        className="bg-destructive hover:bg-destructive/90"
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
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
                                        onClick={() =>
                                            setCurrentPage(Math.max(1, currentPage - 1))
                                        }
                                        className={`text-xs sm:text-sm ${currentPage === 1
                                            ? "pointer-events-none opacity-50"
                                            : "cursor-pointer"
                                            }`}
                                    />
                                </PaginationItem>

                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
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
                                        onClick={() =>
                                            setCurrentPage(
                                                Math.min(totalPages, currentPage + 1)
                                            )
                                        }
                                        className={`text-xs sm:text-sm ${currentPage === totalPages
                                            ? "pointer-events-none opacity-50"
                                            : "cursor-pointer"
                                            }`}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}