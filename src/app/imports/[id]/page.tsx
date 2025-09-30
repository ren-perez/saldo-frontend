// src/app/imports/[id]/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft, Database } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ImportDetailPage() {
    const params = useParams();
    const importId = params.id as Id<"imports">;
    const { convexUser } = useConvexUser();

    const importDetails = useQuery(
        api.imports.getImportDetails,
        convexUser && importId ? { importId, userId: convexUser._id } : "skip"
    );

    const account = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Sign in required</p>
                </div>
            </AppLayout>
        );
    }

    if (!importDetails) {
        return (
            <AppLayout>
                <InitUser />
                <div className="flex items-center justify-center h-64">
                    <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </AppLayout>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                    </Badge>
                );
            case "failed":
                return (
                    <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                );
            case "processing":
                return (
                    <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Processing
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {status}
                    </Badge>
                );
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const accountInfo = account?.find(a => a._id === importDetails.import.accountId);

    return (
        <AppLayout>
            <InitUser />
            <div className="w-full min-w-0 mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
                <div className="mb-6">
                    <Button variant="ghost" size="sm" asChild className="mb-4">
                        <Link href="/imports">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Imports
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground">Import Details</h1>
                </div>

                {/* Import Info Card */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    {importDetails.import.fileName}
                                </CardTitle>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(importDetails.import.uploadedAt), 'MMM d, yyyy HH:mm')}
                                    </div>
                                    <span>{formatFileSize(importDetails.import.size)}</span>
                                    <span className="capitalize">{importDetails.import.contentType}</span>
                                </div>
                            </div>
                            <div>
                                {getStatusBadge(importDetails.import.status)}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Account</p>
                                <p className="font-medium">{accountInfo?.name || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Rows</p>
                                <p className="font-medium">{importDetails.import.totalRows || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Imported</p>
                                <p className="font-medium text-green-600">
                                    {importDetails.import.importedCount || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Errors</p>
                                <p className="font-medium text-red-600">
                                    {importDetails.import.errorCount || 0}
                                </p>
                            </div>
                        </div>
                        {importDetails.import.error && (
                            <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                                <p className="text-sm text-destructive font-medium">Error Details:</p>
                                <p className="text-sm text-destructive mt-1">{importDetails.import.error}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Session Info */}
                {importDetails.session && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Session Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <p className="font-medium capitalize">{importDetails.session.status}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Duplicates Found</p>
                                    <p className="font-medium text-orange-600">
                                        {importDetails.session.duplicates.length}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Errors</p>
                                    <p className="font-medium text-red-600">
                                        {importDetails.session.errors.length}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending Transactions</p>
                                    <p className="font-medium">
                                        {importDetails.session.pendingTransactions.length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Duplicate Resolutions */}
                {importDetails.resolutions && importDetails.resolutions.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Duplicate Resolutions</CardTitle>
                                <Badge variant="secondary">
                                    {importDetails.resolutions.length} duplicates resolved
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {importDetails.resolutions.map((resolution, index) => (
                                    <div
                                        key={resolution._id}
                                        className="p-4 border rounded-lg bg-muted/30"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={resolution.action === "import" ? "default" : "secondary"}
                                                    className={
                                                        resolution.action === "import"
                                                            ? "bg-green-600"
                                                            : "bg-orange-600"
                                                    }
                                                >
                                                    {resolution.action === "import" ? "Imported" : "Skipped"}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    Duplicate #{index + 1}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(resolution.resolvedAt), 'MMM d, yyyy HH:mm')}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Existing Transaction */}
                                            {resolution.existingTransactionId && (
                                                <div className="p-3 bg-background rounded border">
                                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                                        Existing Transaction
                                                    </p>
                                                    <p className="text-sm font-medium">
                                                        {resolution.existingTransaction?.description || 'N/A'}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            {resolution.existingTransaction?.date &&
                                                                format(new Date(resolution.existingTransaction.date), 'MMM d, yyyy')}
                                                        </span>
                                                        <span className={`text-sm font-medium ${
                                                            (resolution.existingTransaction?.amount ?? 0) >= 0
                                                                ? 'text-green-600'
                                                                : 'text-red-600'
                                                        }`}>
                                                            {resolution.existingTransaction?.amount !== undefined &&
                                                                formatCurrency(resolution.existingTransaction.amount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* New Transaction */}
                                            <div className="p-3 bg-background rounded border">
                                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                                    New Transaction (from CSV)
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {resolution.newTransaction?.description || 'N/A'}
                                                </p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {resolution.newTransaction?.date &&
                                                            format(new Date(resolution.newTransaction.date), 'MMM d, yyyy')}
                                                    </span>
                                                    <span className={`text-sm font-medium ${
                                                        (resolution.newTransaction?.amount ?? 0) >= 0
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                    }`}>
                                                        {resolution.newTransaction?.amount !== undefined &&
                                                            formatCurrency(resolution.newTransaction.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Transactions Preview */}
                {importDetails.transactions && importDetails.transactions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Imported Transactions</CardTitle>
                                <Badge variant="secondary">
                                    {importDetails.transactions.length} transactions
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b text-left text-sm text-muted-foreground">
                                            <th className="pb-3">Date</th>
                                            <th className="pb-3">Description</th>
                                            <th className="pb-3">Type</th>
                                            <th className="pb-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importDetails.transactions.slice(0, 20).map((transaction) => (
                                            <tr key={transaction._id} className="border-b hover:bg-muted/30">
                                                <td className="py-3 text-sm">
                                                    {format(new Date(transaction.date), 'MMM d, yyyy')}
                                                </td>
                                                <td className="py-3 text-sm">{transaction.description}</td>
                                                <td className="py-3 text-sm">
                                                    {transaction.transactionType && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {transaction.transactionType}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className={`py-3 text-sm text-right font-medium ${
                                                    transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {formatCurrency(transaction.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {importDetails.transactions.length > 20 && (
                                    <p className="text-sm text-muted-foreground text-center mt-4">
                                        Showing first 20 of {importDetails.transactions.length} transactions
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}