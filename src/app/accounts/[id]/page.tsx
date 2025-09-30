// src/app/accounts/[id]/page.tsx
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
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Target, FileText, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AccountDetailPage() {
    const params = useParams();
    const accountId = params.id as Id<"accounts">;
    const { convexUser } = useConvexUser();

    const accountDetails = useQuery(
        api.accounts.getAccountDetails,
        convexUser && accountId ? { accountId, userId: convexUser._id } : "skip"
    );

    const transactions = useQuery(
        api.accounts.getAccountTransactions,
        convexUser && accountId ? { accountId, userId: convexUser._id, limit: 50 } : "skip"
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

    if (!accountDetails) {
        return (
            <AppLayout>
                <InitUser />
                <div className="flex items-center justify-center h-64">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground border-t-transparent" />
                </div>
            </AppLayout>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <AppLayout>
            <InitUser />
            <div className="w-full min-w-0 mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
                <div className="mb-6">
                    <Button variant="ghost" size="sm" asChild className="mb-4">
                        <Link href="/accounts">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Accounts
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground">
                        {accountDetails.account.bank} {accountDetails.account.name}
                    </h1>
                    <p className="text-muted-foreground mt-1 capitalize">
                        {accountDetails.account.type} {accountDetails.account.number && `• ***${accountDetails.account.number}`}
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Current Balance</p>
                                    <p className="text-2xl font-bold">
                                        {formatCurrency(accountDetails.stats.currentBalance)}
                                    </p>
                                </div>
                                <Wallet className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Deposits</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(accountDetails.stats.totalDeposits)}
                                    </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {formatCurrency(accountDetails.stats.totalWithdrawals)}
                                    </p>
                                </div>
                                <TrendingDown className="h-8 w-8 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Transactions</p>
                                    <p className="text-2xl font-bold">
                                        {accountDetails.stats.totalTransactions}
                                    </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Transactions List */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Recent Transactions</CardTitle>
                                    <Badge variant="secondary">
                                        {transactions?.length || 0} shown
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!transactions || transactions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                        <p className="text-muted-foreground">No transactions yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {transactions.map((transaction) => (
                                            <div
                                                key={transaction._id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {transaction.description}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(transaction.date), 'MMM d, yyyy')}
                                                        </p>
                                                        {transaction.transactionType && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {transaction.transactionType}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className={`font-semibold ml-4 ${
                                                    transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {formatCurrency(transaction.amount)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Linked Goals */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5" />
                                    Linked Goals
                                    <Badge variant="secondary" className="ml-auto">
                                        {accountDetails.linkedGoals.length}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {accountDetails.linkedGoals.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No linked goals
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {accountDetails.linkedGoals.map((goal) => (
                                            <div
                                                key={goal._id}
                                                className="flex items-center gap-2 p-2 border rounded-lg"
                                            >
                                                <span className="text-xl">{goal.emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{goal.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatCurrency(goal.total_amount)} goal
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Imports */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Recent Imports
                                    <Badge variant="secondary" className="ml-auto">
                                        {accountDetails.recentImports.length}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {accountDetails.recentImports.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No imports yet
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {accountDetails.recentImports.map((importRecord) => (
                                            <Link
                                                key={importRecord._id}
                                                href={`/imports/${importRecord._id}`}
                                            >
                                                <div className="p-2 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                                    <p className="text-sm font-medium truncate">
                                                        {importRecord.fileName}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(importRecord.uploadedAt), 'MMM d, yyyy')}
                                                        </p>
                                                        <Badge
                                                            variant={
                                                                importRecord.status === 'completed' ? 'default' :
                                                                importRecord.status === 'failed' ? 'destructive' :
                                                                'secondary'
                                                            }
                                                            className="text-xs ml-auto"
                                                        >
                                                            {importRecord.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}