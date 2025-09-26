// src/app/dashboard/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import TransfersDashboardCard from "@/components/TransfersDashboardCard";
import Link from "next/link";
import { useMemo } from "react";

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
    convexUser ? { userId: convexUser._id, limit: 1000 } : "skip"
  );

  const categories = useQuery(
    api.categories.listCategories,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Calculate financial insights
  const financialData = useMemo(() => {
    if (!allTransactions || !accounts) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Current and last month transactions
    const currentMonthTxns = allTransactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear;
    });

    const lastMonthTxns = allTransactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate.getMonth() === lastMonth && txnDate.getFullYear() === lastMonthYear;
    });

    // Income vs Expenses this month
    const currentMonthIncome = currentMonthTxns
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonthExpenses = Math.abs(currentMonthTxns
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    const lastMonthIncome = lastMonthTxns
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpenses = Math.abs(lastMonthTxns
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    // Account balances (running totals)
    const accountBalances = accounts.map(account => {
      const accountTxns = allTransactions.filter(t => t.accountId === account._id);
      const balance = accountTxns.reduce((sum, t) => sum + t.amount, 0);
      return {
        ...account,
        balance,
        txnCount: accountTxns.length
      };
    });

    // Net worth calculation
    const netWorth = accountBalances.reduce((sum, acc) => sum + acc.balance, 0);

    // Cash flow (income - expenses)
    const currentCashFlow = currentMonthIncome - currentMonthExpenses;
    const lastMonthCashFlow = lastMonthIncome - lastMonthExpenses;
    const cashFlowChange = currentCashFlow - lastMonthCashFlow;

    // Top spending categories this month
    const categorySpending = currentMonthTxns
      .filter(t => t.amount < 0)
      .reduce((acc, t) => {
        const categoryName = categories?.find(c => c._id === t.categoryId)?.name || 'Uncategorized';
        acc[categoryName] = (acc[categoryName] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const topCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Recent large transactions (last 30 days, >$100)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const largeTransactions = allTransactions
      .filter(t => new Date(t.date) >= thirtyDaysAgo && Math.abs(t.amount) >= 100)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Spending trend (last 6 months)
    const monthlySpending = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthTxns = allTransactions.filter(t => {
        const txnDate = new Date(t.date);
        return txnDate.getMonth() === date.getMonth() && txnDate.getFullYear() === date.getFullYear();
      });
      const spending = Math.abs(monthTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
      monthlySpending.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: spending
      });
    }

    return {
      currentMonthIncome,
      currentMonthExpenses,
      lastMonthIncome,
      lastMonthExpenses,
      accountBalances,
      netWorth,
      currentCashFlow,
      cashFlowChange,
      topCategories,
      largeTransactions,
      monthlySpending
    };
  }, [allTransactions, accounts, categories]);

  // Get potential transfers count
  const potentialTransfers = useQuery(
    api.transfers.getPotentialTransfers,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const pendingTransferCount = potentialTransfers?.length || 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">
            Please sign in to view your dashboard.
          </div>
        </div>
      </AppLayout>
    );
  }

  // Check if user needs setup
  const accountCount = accounts?.length || 0;
  const presetCount = presets?.length || 0;
  const transactionCount = allTransactions?.length || 0;
  const needsSetup = accountCount === 0 || presetCount === 0 || transactionCount === 0;

  return (
    <AppLayout>
      <InitUser />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Your financial overview and insights
          </p>
        </div>

        {/* Quick Setup Reminder - Only show if setup needed */}
        {needsSetup && (
          <div className="mb-8 bg-accent border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              🚀 Complete Your Setup
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${accountCount > 0 ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className="text-sm text-accent-foreground">Accounts</span>
                </div>
                {accountCount === 0 ? (
                  <Link href="/accounts" className="text-primary hover:underline text-xs font-medium">
                    Setup →
                  </Link>
                ) : (
                  <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${presetCount > 0 ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className="text-sm text-accent-foreground">CSV Presets</span>
                </div>
                {presetCount === 0 ? (
                  <Link href="/presets" className="text-primary hover:underline text-xs font-medium">
                    Setup →
                  </Link>
                ) : (
                  <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${transactionCount > 0 ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className="text-sm text-accent-foreground">Import Data</span>
                </div>
                {transactionCount === 0 ? (
                  <Link href="/import" className="text-primary hover:underline text-xs font-medium">
                    Import →
                  </Link>
                ) : (
                  <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                )}
              </div>
            </div>
          </div>
        )}

        {financialData && transactionCount > 0 ? (
          <>
            {/* Key Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      ${financialData.netWorth.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Net Worth</div>
                  </div>
                  <div className="text-2xl">🏦</div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${financialData.currentMonthIncome.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Income (This Month)</div>
                  </div>
                  <div className="text-2xl">💰</div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-destructive">
                      ${financialData.currentMonthExpenses.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Expenses (This Month)</div>
                  </div>
                  <div className="text-2xl">💸</div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-2xl font-bold ${
                      financialData.currentCashFlow >= 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-destructive"
                    }`}>
                      ${financialData.currentCashFlow.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center">
                      Cash Flow
                      {financialData.cashFlowChange !== 0 && (
                        <span className={`ml-2 text-xs ${
                          financialData.cashFlowChange > 0 ? "text-green-500" : "text-red-500"
                        }`}>
                          {financialData.cashFlowChange > 0 ? "↗" : "↘"}
                          ${Math.abs(financialData.cashFlowChange).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl">📊</div>
                </div>
              </div>
            </div>

            {/* Transfers Inbox Card */}
            <div className="mb-8">
              <TransfersDashboardCard pendingTransferCount={pendingTransferCount} />
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Account Balances */}
              <div className="bg-card rounded-lg shadow-sm border border-border">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">Account Balances</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {financialData.accountBalances.map((account, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-foreground">{account.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {account.bank} • {account.type}
                          </div>
                        </div>
                        <div className={`font-semibold ${
                          account.balance >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-destructive"
                        }`}>
                          ${account.balance.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Spending Categories */}
              <div className="bg-card rounded-lg shadow-sm border border-border">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">Top Spending (This Month)</h2>
                </div>
                <div className="p-6">
                  {financialData.topCategories.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No expenses this month
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {financialData.topCategories.map(([category, amount], index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-foreground">{category}</div>
                            <div className="w-full bg-muted rounded-full h-2 mt-1">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ 
                                  width: `${(amount / financialData.topCategories[0][1]) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="font-semibold text-destructive ml-4">
                            ${amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Recent Large Transactions */}
              <div className="bg-card rounded-lg shadow-sm border border-border">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">
                    Large Transactions (Last 30 Days)
                  </h2>
                </div>
                <div className="p-6">
                  {financialData.largeTransactions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No large transactions ($100+)
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {financialData.largeTransactions.map((transaction, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium text-foreground truncate">
                              {transaction.description}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className={`font-semibold ml-4 ${
                            transaction.amount >= 0 
                              ? "text-green-600 dark:text-green-400" 
                              : "text-destructive"
                          }`}>
                            {transaction.amount >= 0 ? "+" : ""}${transaction.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                      <div className="pt-4 border-t border-border">
                        <Link
                          href="/transactions"
                          className="text-primary hover:underline font-medium text-sm"
                        >
                          View all transactions →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Spending Trend */}
              <div className="bg-card rounded-lg shadow-sm border border-border">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">
                    Spending Trend (6 Months)
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {financialData.monthlySpending.map((month, index) => {
                      const maxAmount = Math.max(...financialData.monthlySpending.map(m => m.amount));
                      const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="w-12 text-sm text-muted-foreground">
                            {month.month}
                          </div>
                          <div className="flex-1 mx-4">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="w-20 text-sm font-medium text-right text-foreground">
                            ${month.amount.toFixed(0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No Data State */
          <div className="text-center py-16">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome to Your Financial Dashboard
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Complete the setup above to start tracking your finances and gain valuable insights into your spending patterns.
            </p>
            <Link
              href="/import"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}