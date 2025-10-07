// src/app/dashboard/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import TransfersDashboardCard from "@/components/TransfersDashboardCard";
import Link from "next/link";
import { useMemo, useState } from "react";

interface PopoverState {
  isOpen: boolean;
  content: string;
  x: number;
  y: number;
}

export default function DashboardPage() {
  const { convexUser, isLoading } = useConvexUser();
  const [popover, setPopover] = useState<PopoverState>({
    isOpen: false,
    content: '',
    x: 0,
    y: 0
  });

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

    // Income vs Expenses this month - using transactionType, excluding transfers
    const currentMonthIncome = currentMonthTxns
      .filter(t => t.transactionType === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const currentMonthExpenses = currentMonthTxns
      .filter(t => t.transactionType === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const lastMonthIncome = lastMonthTxns
      .filter(t => t.transactionType === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const lastMonthExpenses = lastMonthTxns
      .filter(t => t.transactionType === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

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

    // Top spending categories this month - only expenses, excluding transfers
    const categorySpending = currentMonthTxns
      .filter(t => t.transactionType === 'expense')
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

    // Enhanced spending trend with income and expenses (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthTxns = allTransactions.filter(t => {
        const txnDate = new Date(t.date);
        return txnDate.getMonth() === date.getMonth() && txnDate.getFullYear() === date.getFullYear();
      });
      
      const income = monthTxns
        .filter(t => t.transactionType === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const expenses = monthTxns
        .filter(t => t.transactionType === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        income,
        expenses,
        net: income - expenses
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
      monthlyData
    };
  }, [allTransactions, accounts, categories]);

  // Get potential transfers count
  const potentialTransfers = useQuery(
    api.transfers.getPotentialTransfers,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const pendingTransferCount = potentialTransfers?.length || 0;

  const handleTransactionClick = (event: React.MouseEvent, description: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopover({
      isOpen: true,
      content: description,
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 8
    });
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(popover.content);
      setPopover(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const closePopover = () => {
    setPopover(prev => ({ ...prev, isOpen: false }));
  };

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
      {/* Popover */}
      {popover.isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closePopover}
          />
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs"
            style={{
              left: `${popover.x}px`,
              top: `${popover.y}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-sm text-foreground mb-2 break-words">
              {popover.content}
            </div>
            <button
              onClick={handleCopyToClipboard}
              className="w-full px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
        </>
      )}
      
      {/* Fixed container with proper mobile handling */}
      <div className="w-full min-w-0 mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your financial overview and insights
          </p>
        </div>

        {/* Quick Setup Reminder - Only show if setup needed */}
        {needsSetup && (
          <div className="mb-6 sm:mb-8 bg-accent border border-border rounded-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">
              🚀 Complete Your Setup
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${accountCount > 0 ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className="text-sm text-accent-foreground truncate">Accounts</span>
                </div>
                {accountCount === 0 ? (
                  <Link href="/accounts" className="text-primary hover:underline text-xs font-medium whitespace-nowrap ml-2">
                    Setup →
                  </Link>
                ) : (
                  <span className="text-green-600 dark:text-green-400 text-xs ml-2">✓</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${presetCount > 0 ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className="text-sm text-accent-foreground truncate">CSV Presets</span>
                </div>
                {presetCount === 0 ? (
                  <Link href="/presets" className="text-primary hover:underline text-xs font-medium whitespace-nowrap ml-2">
                    Setup →
                  </Link>
                ) : (
                  <span className="text-green-600 dark:text-green-400 text-xs ml-2">✓</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${transactionCount > 0 ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className="text-sm text-accent-foreground truncate">Import Data</span>
                </div>
                {transactionCount === 0 ? (
                  <Link href="/import" className="text-primary hover:underline text-xs font-medium whitespace-nowrap ml-2">
                    Import →
                  </Link>
                ) : (
                  <span className="text-green-600 dark:text-green-400 text-xs ml-2">✓</span>
                )}
              </div>
            </div>
          </div>
        )}

        {financialData && transactionCount > 0 ? (
          <>
            {/* Key Financial Metrics - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-foreground truncate">
                      ${Math.abs(financialData.netWorth) < 1000000 
                        ? financialData.netWorth.toFixed(2)
                        : `${(financialData.netWorth / 1000000).toFixed(1)}M`}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Net Worth</div>
                  </div>
                  <div className="text-xl sm:text-2xl ml-2">🏦</div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                      ${Math.abs(financialData.currentMonthIncome) < 1000000 
                        ? financialData.currentMonthIncome.toFixed(2)
                        : `${(financialData.currentMonthIncome / 1000000).toFixed(1)}M`}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Income (This Month)</div>
                  </div>
                  <div className="text-xl sm:text-2xl ml-2">💰</div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xl sm:text-2xl font-bold text-destructive truncate">
                      ${Math.abs(financialData.currentMonthExpenses) < 1000000 
                        ? financialData.currentMonthExpenses.toFixed(2)
                        : `${(financialData.currentMonthExpenses / 1000000).toFixed(1)}M`}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Expenses (This Month)</div>
                  </div>
                  <div className="text-xl sm:text-2xl ml-2">💸</div>
                </div>
              </div>

              <div className="bg-card rounded-lg shadow-sm border border-border p-4 sm:p-6 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className={`text-xl sm:text-2xl font-bold truncate ${
                      financialData.currentCashFlow >= 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-destructive"
                    }`}>
                      ${Math.abs(financialData.currentCashFlow) < 1000000 
                        ? financialData.currentCashFlow.toFixed(2)
                        : `${(financialData.currentCashFlow / 1000000).toFixed(1)}M`}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                      <span className="truncate">Cash Flow</span>
                      {financialData.cashFlowChange !== 0 && (
                        <span className={`ml-1 text-xs whitespace-nowrap ${
                          financialData.cashFlowChange > 0 ? "text-green-500" : "text-red-500"
                        }`}>
                          {financialData.cashFlowChange > 0 ? "↗" : "↘"}
                          ${Math.abs(financialData.cashFlowChange).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl ml-2">📊</div>
                </div>
              </div>
            </div>

            {/* Transfers Inbox Card */}
            <div className="mb-6 sm:mb-8">
              <TransfersDashboardCard pendingTransferCount={pendingTransferCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              {/* Account Balances */}
              <div className="bg-card rounded-lg shadow-sm border border-border min-w-0">
                <div className="p-4 sm:p-6 border-b border-border">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Account Balances</h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {financialData.accountBalances.map((account, index) => (
                      <div key={index} className="flex justify-between items-start gap-4 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">{account.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">
                            {account.bank} • {account.type}
                          </div>
                        </div>
                        <div className={`font-semibold text-right whitespace-nowrap ${
                          account.balance >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-destructive"
                        }`}>
                          ${Math.abs(account.balance) < 1000000 
                            ? account.balance.toFixed(2)
                            : `${(account.balance / 1000000).toFixed(1)}M`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Spending Categories */}
              <div className="bg-card rounded-lg shadow-sm border border-border min-w-0">
                <div className="p-4 sm:p-6 border-b border-border">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Top Spending (This Month)</h2>
                </div>
                <div className="p-4 sm:p-6">
                  {financialData.topCategories.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No expenses this month
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {financialData.topCategories.map(([category, amount], index) => (
                        <div key={index} className="min-w-0">
                          <div className="flex justify-between items-center mb-1 gap-4">
                            <div className="font-medium text-foreground truncate text-sm">{category}</div>
                            <div className="font-semibold text-destructive whitespace-nowrap text-sm">
                              ${amount < 1000000 ? amount.toFixed(2) : `${(amount / 1000000).toFixed(1)}M`}
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ 
                                width: `${(amount / financialData.topCategories[0][1]) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Recent Large Transactions with Copy Popover */}
              <div className="bg-card rounded-lg shadow-sm border border-border min-w-0">
                <div className="p-4 sm:p-6 border-b border-border">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    Large Transactions (Last 30 Days)
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  {financialData.largeTransactions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No large transactions ($100+)
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {financialData.largeTransactions.map((transaction, index) => (
                        <div key={index} className="flex justify-between items-start gap-4 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div 
                              className="font-medium text-foreground truncate text-sm cursor-pointer hover:text-primary transition-colors"
                              onClick={(e) => handleTransactionClick(e, transaction.description)}
                            >
                              {transaction.description}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className={`font-semibold whitespace-nowrap ${
                            transaction.amount >= 0 
                              ? "text-green-600 dark:text-green-400" 
                              : "text-destructive"
                          }`}>
                            {transaction.amount >= 0 ? "+" : ""}${Math.abs(transaction.amount) < 1000000 
                              ? transaction.amount.toFixed(2)
                              : `${(transaction.amount / 1000000).toFixed(1)}M`}
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

              {/* Enhanced Stacked Income/Expense Chart */}
              <div className="bg-card rounded-lg shadow-sm border border-border min-w-0">
                <div className="p-4 sm:p-6 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">
                      Income vs Expenses (6 Months)
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-muted-foreground">Income</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-muted-foreground">Expenses</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {financialData.monthlyData.map((month, index) => {
                      const maxAmount = Math.max(
                        ...financialData.monthlyData.map(m => Math.max(m.income, m.expenses))
                      );
                      const incomePercentage = maxAmount > 0 ? (month.income / maxAmount) * 100 : 0;
                      const expensePercentage = maxAmount > 0 ? (month.expenses / maxAmount) * 100 : 0;
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground w-12">
                              {month.month}
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`font-medium ${month.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                Net: ${month.net >= 0 ? '+' : ''}${month.net < 1000000 
                                  ? month.net.toFixed(0)
                                  : `${(month.net / 1000000).toFixed(1)}M`}
                              </span>
                            </div>
                          </div>
                          
                          {/* Income Bar */}
                          <div className="flex items-center gap-2">
                            <div className="w-12 text-xs text-green-600 dark:text-green-400">+</div>
                            <div className="flex-1">
                              <div className="w-full bg-muted rounded-full h-3">
                                <div 
                                  className="bg-green-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2" 
                                  style={{ width: `${incomePercentage}%` }}
                                >
                                  {month.income > 0 && (
                                    <span className="text-xs font-medium text-white">
                                      ${month.income < 1000 
                                        ? month.income.toFixed(0)
                                        : month.income < 1000000 
                                          ? `${(month.income / 1000).toFixed(0)}k`
                                          : `${(month.income / 1000000).toFixed(1)}M`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expense Bar */}
                          <div className="flex items-center gap-2">
                            <div className="w-12 text-xs text-red-600 dark:text-red-400">-</div>
                            <div className="flex-1">
                              <div className="w-full bg-muted rounded-full h-3">
                                <div 
                                  className="bg-red-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2" 
                                  style={{ width: `${expensePercentage}%` }}
                                >
                                  {month.expenses > 0 && (
                                    <span className="text-xs font-medium text-white">
                                      ${month.expenses < 1000 
                                        ? month.expenses.toFixed(0)
                                        : month.expenses < 1000000 
                                          ? `${(month.expenses / 1000).toFixed(0)}k`
                                          : `${(month.expenses / 1000000).toFixed(1)}M`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
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
          <div className="text-center py-12 sm:py-16">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">📊</div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              Welcome to Your Financial Dashboard
            </h2>
            <p className="text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base px-4">
              Complete the setup above to start tracking your finances and gain valuable insights into your spending patterns.
            </p>
            <Link
              href="/import-csv"
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}