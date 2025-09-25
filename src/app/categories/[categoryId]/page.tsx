"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useConvexUser } from "../../../hooks/useConvexUser";
import { useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import Link from "next/link";
import { format } from "date-fns";

export default function CategoryTransactionsPage() {
  const { convexUser } = useConvexUser();
  const params = useParams();
  const categoryId = params.categoryId as string;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Get category details
  const categories = useQuery(
    api.categories.listCategories,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const category = categories?.find(c => c._id === categoryId);

  // Get transactions for this category
  const transactions = useQuery(
    api.transactions.listTransactionsPaginated,
    convexUser && categoryId !== "uncategorized"
      ? {
          userId: convexUser._id,
          categoryId: categoryId,
          page: currentPage,
          pageSize: pageSize,
        }
      : convexUser && categoryId === "uncategorized"
      ? {
          userId: convexUser._id,
          categoryId: "NONE", // Special value for uncategorized
          page: currentPage,
          pageSize: pageSize,
        }
      : "skip"
  );

  // Get accounts for display
  const accounts = useQuery(
    api.accounts.listAccounts,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "MMM d, yyyy");
  };

  const getAccountName = (accountId: string) => {
    return accounts?.find(a => a._id === accountId)?.name || "Unknown Account";
  };

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Please sign in to view transactions.</div>
        </div>
      </AppLayout>
    );
  }

  const categoryName = categoryId === "uncategorized"
    ? "Uncategorized"
    : category?.name || "Unknown Category";

  const totalAmount = transactions?.data.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
  const transactionCount = transactions?.total || 0;
  const currentTransactions = transactions?.data || [];

  // Calculate total pages
  const totalPages = Math.ceil(transactionCount / pageSize);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <AppLayout>
      <InitUser />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/categories">
                <Button variant="outline" size="sm">
                  ← Back to Categories
                </Button>
              </Link>
              <Link href="/reflection">
                <Button variant="outline" size="sm">
                  ← Back to Reflection
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">🏷️ {categoryName}</h1>
            <p className="text-muted-foreground mt-1">
              All transactions in this category
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Amount
              </p>
              <p className="text-3xl font-bold">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Transaction Count
              </p>
              <p className="text-3xl font-bold">
                {transactionCount}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Average Amount
              </p>
              <p className="text-3xl font-bold">
                {transactionCount > 0 ? formatCurrency(totalAmount / transactionCount) : "$0.00"}
              </p>
            </div>
          </Card>
        </div>

        {/* Controls */}
        {transactions && transactions.total > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
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
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, transactionCount)} of {transactionCount} transactions
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {transactions && transactions.data.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentTransactions.map((transaction) => (
                    <tr
                      key={transaction._id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="max-w-xs truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {getAccountName(transaction.accountId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {transaction.transactionType || "Untyped"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span
                          className={
                            transaction.amount >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {transaction.amount >= 0 ? "+" : ""}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <div className="text-muted-foreground">
                <p className="text-lg">No transactions found</p>
                <p>This category doesn&rsquo;t have any transactions yet.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {transactions && transactions.total > 0 && totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {/* First page */}
                {currentPage > 2 && (
                  <>
                    <PaginationItem key="first-page">
                      <PaginationLink onClick={() => handlePageChange(1)} className="cursor-pointer">
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {currentPage > 3 && (
                      <PaginationItem key="first-ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {/* Current page range */}
                {(() => {
                  const pages = [];
                  const startPage = Math.max(1, currentPage - 1);
                  const endPage = Math.min(totalPages, currentPage + 1);

                  for (let page = startPage; page <= endPage; page++) {
                    // Skip if this page is already shown as first or last page
                    if (page === 1 && currentPage > 2) continue;
                    if (page === totalPages && currentPage < totalPages - 1) continue;

                    pages.push(
                      <PaginationItem key={`current-${page}`}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={page === currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return pages;
                })()}

                {/* Last page */}
                {currentPage < totalPages - 1 && (
                  <>
                    {currentPage < totalPages - 2 && (
                      <PaginationItem key="last-ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem key="last-page">
                      <PaginationLink onClick={() => handlePageChange(totalPages)} className="cursor-pointer">
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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