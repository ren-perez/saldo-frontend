// src/app/transactions/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
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

// ✅ Helper function to format timestamp to readable date
function formatTimestampToDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
}

// ✅ Helper function to convert date input to timestamp for filtering
function dateStringToTimestamp(dateString: string): number {
    return new Date(dateString + "T00:00:00").getTime();
}

export default function TransactionsPage() {
    const { convexUser } = useConvexUser();
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const updateTransaction = useMutation(api.transactions.updateTransaction);

    const accounts = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    // ✅ Convert date strings to timestamps for the query
    const startTimestamp = startDate ? dateStringToTimestamp(startDate) : undefined;
    const endTimestamp = endDate ? dateStringToTimestamp(endDate) + (24 * 60 * 60 * 1000 - 1) : undefined; // End of day

    const transactions = useQuery(
        api.transactions.listTransactionsPaginated,
        convexUser
            ? {
                userId: convexUser._id,
                accountId: selectedAccount || undefined,
                transactionType: typeFilter || undefined,
                searchTerm: search || undefined,
                startDate: startTimestamp,
                endDate: endTimestamp,
                page: currentPage,
                pageSize,
            }
            : "skip"
    );

    const categories = useQuery(
        api.categories.listCategories,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    // Reset to first page when filters change
    const handleFilterChange = (filterFn: () => void) => {
        filterFn();
        setCurrentPage(1);
    };

    // Calculate pagination info
    const totalPages = transactions ? Math.ceil(transactions.total / pageSize) : 0;
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, transactions?.total || 0);

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Please sign in to view transactions.</div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <InitUser />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-gray-600">
                        View and manage your imported transactions
                    </p>
                </div>

                {/* Summary */}
                {transactions && transactions.data.length > 0 && (
                    <div className="my-6 bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {transactions.total}
                                </div>
                                <div className="text-sm text-gray-500">Total Transactions</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">
                                    $
                                    {transactions.data
                                        .filter((t) => t.amount > 0)
                                        .reduce((sum, t) => sum + t.amount, 0)
                                        .toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500">Total Income</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-600">
                                    $
                                    {Math.abs(
                                        transactions.data
                                            .filter((t) => t.amount < 0)
                                            .reduce((sum, t) => sum + t.amount, 0)
                                    ).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500">Total Expenses</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Account */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Account</label>
                        <select
                            value={selectedAccount || ""}
                            onChange={(e) =>
                                handleFilterChange(() => setSelectedAccount(e.target.value || null))
                            }
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All Accounts</option>
                            {accounts?.map((account) => (
                                <option key={account._id} value={account._id}>
                                    {account.name} ({account.bank})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Transaction Type */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                            value={typeFilter || ""}
                            onChange={(e) =>
                                handleFilterChange(() => setTypeFilter(e.target.value || null))
                            }
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="">All</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                            <option value="transfer">Transfer</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate || ""}
                            onChange={(e) =>
                                handleFilterChange(() => setStartDate(e.target.value || null))
                            }
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate || ""}
                            onChange={(e) =>
                                handleFilterChange(() => setEndDate(e.target.value || null))
                            }
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search description..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                        }}
                        className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md"
                    />
                </div>

                {/* Page Size Selector and Results Info */}
                <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show</span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => {
                                setPageSize(parseInt(value));
                                setCurrentPage(1); // Reset to first page
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
                        <span className="text-sm text-gray-600">per page</span>
                    </div>

                    {transactions && transactions.total > 0 && (
                        <div className="text-sm text-gray-600">
                            Showing {startItem} to {endItem} of {transactions.total} transactions
                        </div>
                    )}
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    {!transactions || transactions.data.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="text-4xl mb-4">💰</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No transactions found
                            </h3>
                            <p className="text-gray-500 mb-4">
                                {selectedAccount
                                    ? "This account has no transactions yet."
                                    : "You haven't imported any transactions yet."}
                            </p>
                            <a
                                href="/import-csv"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                            >
                                Import CSV →
                            </a>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Account
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {transactions.data?.map((transaction, index) => {
                                        const account = accounts?.find(
                                            (a) => a._id === transaction.accountId
                                        );
                                        return (
                                            <tr
                                                key={transaction._id}
                                                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {/* ✅ Format timestamp to readable date */}
                                                    {formatTimestampToDate(transaction.date)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {transaction.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {account?.name || "Unknown"}
                                                </td>
                                                {/* Editable Type */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <select
                                                        value={transaction.transactionType || ""}
                                                        onChange={(e) =>
                                                            updateTransaction({
                                                                transactionId: transaction._id,
                                                                updates: { transactionType: e.target.value || undefined },
                                                            })
                                                        }
                                                        className="p-1 border border-gray-300 rounded-md text-sm"
                                                    >
                                                        <option value="">—</option>
                                                        <option value="income">Income</option>
                                                        <option value="expense">Expense</option>
                                                        <option value="transfer">Transfer</option>
                                                    </select>
                                                </td>

                                                {/* Editable Category */}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <select
                                                        value={transaction.categoryId || ""}
                                                        onChange={(e) =>
                                                            updateTransaction({
                                                                transactionId: transaction._id,
                                                                updates: { categoryId: e.target.value || undefined },
                                                            })
                                                        }
                                                        className="p-1 border border-gray-300 rounded-md text-sm"
                                                    >
                                                        <option value="">— Uncategorized —</option>
                                                        {categories?.map((c) => (
                                                            <option key={c._id} value={c._id}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <span
                                                        className={
                                                            transaction.amount >= 0
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                        }
                                                    >
                                                        ${transaction.amount.toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {transactions && transactions.total > pageSize && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>

                                {/* Page numbers */}
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let pageNum;
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
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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