"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Search, X, Filter, Download, RefreshCw, Trash2 } from "lucide-react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
                    className="w-full justify-between text-left px-2 py-1 h-8 text-sm"
                >
                    {value
                        ? (value === "NONE" ? emptyLabel : options.find(opt => opt.value === value)?.label)
                        : placeholder
                    }
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

export default function TransactionsPage() {
    const { convexUser } = useConvexUser();
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [groupFilter, setGroupFilter] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

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

    const handleDeleteTransaction = async (transactionId: string) => {
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

    // Prepare options for comboboxes - filter out any with empty values
    const categoryOptions = categories?.map(cat => ({
        value: cat._id,
        label: cat.name
    })).filter(option => option.value && option.value.trim() !== "") || [];

    const groupOptions = categoryGroups?.map(group => ({
        value: group._id,
        label: group.name
    })).filter(option => option.value && option.value.trim() !== "") || [];

    // Helper function to get filtered categories for a transaction
    const getFilteredCategoryOptions = (transactionType: string | undefined, selectedGroupId: string | undefined) => {
        let filtered = categories || [];

        // Filter by transaction type if both are specified
        if (transactionType) {
            filtered = filtered.filter(cat =>
                !cat.transactionType || cat.transactionType === transactionType
            );
        }

        // Filter by group if specified
        if (selectedGroupId) {
            filtered = filtered.filter(cat => cat.groupId === selectedGroupId);
        }

        return filtered.map(cat => ({
            value: cat._id,
            label: cat.name
        })).filter(option => option.value && option.value.trim() !== "");
    };

    // Helper function to get filtered groups for a transaction
    const getFilteredGroupOptions = (transactionType: string | undefined) => {
        if (!transactionType || !categories || !categoryGroups) return groupOptions;

        // Find groups that have at least one category matching the transaction type
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">
                                Transactions
                            </h1>
                            <p className="text-muted-foreground">
                                View and manage your imported transactions
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                            <Button variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                {transactions && transactions.data.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Transactions</CardDescription>
                                <CardTitle className="text-2xl">{transactions.total}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Income</CardDescription>
                                <CardTitle className="text-2xl text-green-600">
                                    $
                                    {transactions.data
                                        .filter((t) => t.amount > 0)
                                        .reduce((sum, t) => sum + t.amount, 0)
                                        .toFixed(2)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Total Expenses</CardDescription>
                                <CardTitle className="text-2xl text-red-600">
                                    $
                                    {Math.abs(
                                        transactions.data
                                            .filter((t) => t.amount < 0)
                                            .reduce((sum, t) => sum + t.amount, 0)
                                    ).toFixed(2)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Net Amount</CardDescription>
                                <CardTitle className={`text-2xl ${transactions.data.reduce((sum, t) => sum + t.amount, 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}>
                                    $
                                    {transactions.data
                                        .reduce((sum, t) => sum + t.amount, 0)
                                        .toFixed(2)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filters
                                {activeFiltersCount > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {activeFiltersCount}
                                    </Badge>
                                )}
                            </CardTitle>
                            {activeFiltersCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                                    Clear all
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search */}
                        <div>
                            <Label htmlFor="search" className="block mb-2 text-sm font-medium">
                                Search Description
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-10 pr-10"
                                />
                                {search && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="account-select" className="block mb-2 text-sm font-medium">
                                    Account
                                </Label>
                                <Select
                                    value={selectedAccount || "ALL_ACCOUNTS"}
                                    onValueChange={(value) =>
                                        handleFilterChange(() =>
                                            setSelectedAccount(value === "ALL_ACCOUNTS" ? null : value)
                                        )
                                    }
                                >
                                    <SelectTrigger>
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
                            </div>

                            <div>
                                <Label htmlFor="type-filter" className="block mb-2 text-sm font-medium">
                                    Transaction Type
                                </Label>
                                <Select
                                    value={typeFilter || "ALL_TYPES"}
                                    onValueChange={(value) =>
                                        handleFilterChange(() =>
                                            setTypeFilter(value === "ALL_TYPES" ? null : value)
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL_TYPES">All Types</SelectItem>
                                        <SelectItem value="UNTYPED">— Untyped —</SelectItem>
                                        <SelectItem value="income">Income</SelectItem>
                                        <SelectItem value="expense">Expense</SelectItem>
                                        <SelectItem value="transfer">Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="category-filter" className="block mb-2 text-sm font-medium">
                                    Category
                                </Label>
                                <Select
                                    value={categoryFilter === "NONE" ? "UNCATEGORIZED" : (categoryFilter || "ALL_CATEGORIES")}
                                    onValueChange={(value) =>
                                        handleFilterChange(() =>
                                            setCategoryFilter(value === "ALL_CATEGORIES" ? null : (value === "UNCATEGORIZED" ? "NONE" : value))
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL_CATEGORIES">All Categories</SelectItem>
                                        <SelectItem value="UNCATEGORIZED">— Uncategorized —</SelectItem>
                                        {categoryOptions
                                            .sort((a, b) => a.label.localeCompare(b.label))
                                            .map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="group-filter" className="block mb-2 text-sm font-medium">
                                    Category Group
                                </Label>
                                <Select
                                    value={groupFilter === "NONE" ? "UNGROUPED" : (groupFilter || "ALL_GROUPS")}
                                    onValueChange={(value) =>
                                        handleFilterChange(() =>
                                            setGroupFilter(value === "ALL_GROUPS" ? null : (value === "UNGROUPED" ? "NONE" : value))
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Groups" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL_GROUPS">All Groups</SelectItem>
                                        <SelectItem value="UNGROUPED">— No Group —</SelectItem>
                                        {groupOptions
                                            .sort((a, b) => a.label.localeCompare(b.label))
                                            .map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Filter Row 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="start-date" className="block mb-2 text-sm font-medium">
                                    Start Date
                                </Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate || ""}
                                    onChange={(e) =>
                                        handleFilterChange(() => setStartDate(e.target.value || null))
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="end-date" className="block mb-2 text-sm font-medium">
                                    End Date
                                </Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate || ""}
                                    onChange={(e) =>
                                        handleFilterChange(() => setEndDate(e.target.value || null))
                                    }
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Page Size + Info */}
                <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Show</span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => {
                                setPageSize(parseInt(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">per page</span>
                    </div>

                    {transactions && transactions.total > 0 && (
                        <div className="text-sm text-muted-foreground">
                            Showing {startItem} to {endItem} of {transactions.total} transactions
                        </div>
                    )}
                </div>

                {/* Table / No Results */}
                <Card>
                    {(!transactions || transactions.data.length === 0) ? (
                        <CardContent className="p-8 text-center">
                            <div className="text-4xl mb-4">💰</div>
                            <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                            <p className="mb-4 text-muted-foreground">
                                {activeFiltersCount > 0
                                    ? "Try adjusting your filters to see more transactions."
                                    : selectedAccount
                                        ? "This account has no transactions yet."
                                        : "You haven't imported any transactions yet."}
                            </p>
                            <div className="flex gap-2 justify-center">
                                {activeFiltersCount > 0 && (
                                    <Button variant="outline" onClick={clearAllFilters}>
                                        Clear Filters
                                    </Button>
                                )}
                                <Button asChild>
                                    <a href="/import-csv">Import CSV →</a>
                                </Button>
                            </div>
                        </CardContent>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted dark:bg-muted">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Account</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Group</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.data.map((transaction, idx) => {
                                        const account = accounts?.find(
                                            (a) => a._id === transaction.accountId
                                        );
                                        const category = categories?.find(
                                            (c) => c._id === transaction.categoryId
                                        );
                                        const group = categoryGroups?.find(
                                            (g) => g._id === category?.groupId
                                        );

                                        const rowBgClass =
                                            idx % 2 === 0 ? "bg-background" : "bg-muted/30";
                                        return (
                                            <TableRow key={transaction._id} className={rowBgClass}>
                                                <TableCell className="font-medium">
                                                    {formatTimestampToDate(transaction.date)}
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate">
                                                    {transaction.description}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {account?.name || "Unknown"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
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
                                                </TableCell>
                                                <TableCell>
                                                    <CategoryCombobox
                                                        value={group?._id || "NONE"}
                                                        onValueChange={(value) =>
                                                            updateTransactionByGroup({
                                                                transactionId: transaction._id,
                                                                groupId: value === "NONE" ? undefined : value,
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
                                                                    : { categoryId: value },
                                                            })
                                                        }
                                                        options={getFilteredCategoryOptions(transaction.transactionType, group?._id)}
                                                        placeholder="Select..."
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    <span
                                                        className={
                                                            transaction.amount >= 0
                                                                ? "text-green-600 font-semibold"
                                                                : "text-red-600 font-semibold"
                                                        }
                                                    >
                                                        {transaction.amount >= 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                                                    className="bg-red-600 hover:bg-red-700"
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
                    )}
                </Card>

                {/* Pagination */}
                {transactions && transactions.total > pageSize && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() =>
                                            setCurrentPage(Math.max(1, currentPage - 1))
                                        }
                                        className={
                                            currentPage === 1
                                                ? "pointer-events-none opacity-50"
                                                : "cursor-pointer"
                                        }
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
                                                className="cursor-pointer"
                                            >
                                                {pageNum}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {totalPages > 5 && currentPage < totalPages - 2 && (
                                    <>
                                        <PaginationItem>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink
                                                onClick={() => setCurrentPage(totalPages)}
                                                className="cursor-pointer"
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
                                        className={
                                            currentPage === totalPages
                                                ? "pointer-events-none opacity-50"
                                                : "cursor-pointer"
                                        }
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