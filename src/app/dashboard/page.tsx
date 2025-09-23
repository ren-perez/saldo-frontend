// src/app/dashboard/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import Link from "next/link";

export default function DashboardPage() {
    const { convexUser, isLoading } = useConvexUser();

    const accounts = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const presets = useQuery(
        api.presets.listPresets,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const allTransactions = useQuery(
        api.transactions.listTransactions,
        convexUser ? { userId: convexUser._id, limit: 100 } : "skip"
    );

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Loading...</div>
                </div>
            </AppLayout>
        );
    }

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Please sign in to view your dashboard.</div>
                </div>
            </AppLayout>
        );
    }

    // Calculate some basic stats
    const totalBalance = allTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const transactionCount = allTransactions?.length || 0;
    const accountCount = accounts?.length || 0;
    const presetCount = presets?.length || 0;

    // Recent transactions (last 5)
    const recentTransactions = allTransactions?.slice(0, 5) || [];

    return (
        <AppLayout>
            <InitUser />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600">Overview of your financial accounts and activity</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center">
                            <div className="text-2xl mr-3">🏦</div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{accountCount}</div>
                                <div className="text-sm text-gray-500">Accounts</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center">
                            <div className="text-2xl mr-3">💰</div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{transactionCount}</div>
                                <div className="text-sm text-gray-500">Transactions</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center">
                            <div className="text-2xl mr-3">⚙️</div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{presetCount}</div>
                                <div className="text-sm text-gray-500">CSV Presets</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <div className="flex items-center">
                            <div className="text-2xl mr-3">📊</div>
                            <div>
                                <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${totalBalance.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500">Net Total</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Recent Transactions */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="p-6 border-b">
                            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                        </div>
                        <div className="p-6">
                            {recentTransactions.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-4">📥</div>
                                    <p className="text-gray-500 mb-4">No transactions yet</p>
                                    <Link
                                        href="/import-csv"
                                        className="text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Import your first CSV →
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentTransactions.map((transaction, index) => (
                                        <div key={index} className="flex justify-between items-center">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {transaction.description}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {transaction.date}
                                                </div>
                                            </div>
                                            <div className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                ${transaction.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t">
                                        <Link
                                            href="/transactions"
                                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                        >
                                            View all transactions →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Setup */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="p-6 border-b">
                            <h2 className="text-lg font-semibold text-gray-900">Quick Setup</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-3 ${accountCount > 0 ? 'bg-green-500' : 'bg-gray-300'
                                            }`}></div>
                                        <span className="text-gray-900">Create Accounts</span>
                                    </div>
                                    {accountCount === 0 ? (
                                        <Link
                                            href="/accounts"
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            Setup →
                                        </Link>
                                    ) : (
                                        <span className="text-green-600 text-sm">✓ Done</span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-3 ${presetCount > 0 ? 'bg-green-500' : 'bg-gray-300'
                                            }`}></div>
                                        <span className="text-gray-900">Create CSV Presets</span>
                                    </div>
                                    {presetCount === 0 ? (
                                        <Link
                                            href="/presets"
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            Setup →
                                        </Link>
                                    ) : (
                                        <span className="text-green-600 text-sm">✓ Done</span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-3 ${transactionCount > 0 ? 'bg-green-500' : 'bg-gray-300'
                                            }`}></div>
                                        <span className="text-gray-900">Import Transactions</span>
                                    </div>
                                    {transactionCount === 0 ? (
                                        <Link
                                            href="/import"
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            Import →
                                        </Link>
                                    ) : (
                                        <span className="text-green-600 text-sm">✓ Done</span>
                                    )}
                                </div>
                            </div>

                            {accountCount > 0 && presetCount > 0 && transactionCount === 0 && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-blue-800 text-sm">
                                        🎉 You're ready to import! Download the sample CSV to test your setup.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}