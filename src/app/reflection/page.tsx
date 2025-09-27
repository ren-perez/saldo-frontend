"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PiggyBank, CreditCard } from "lucide-react";
import Link from "next/link";

type TrendTransaction = {
  description: string;
  amount: number;
  accountName?: string;
  categoryName?: string;
  transactionType?: string;
};

type TrendTooltipData = {
  income: number;
  expense: number;
  transactionCount: number;
  transactions?: TrendTransaction[];
};

type LegendEntry = {
    name: string
    value: number
    color: string
    dataKey?: string
  }

type TransferInsight = {
  type: 'savings' | 'debt_payment';
  amount: number;
  accountName: string;
  count: number;
};

export default function ReflectionPage() {
  const { convexUser } = useConvexUser();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return {
      month: now.getMonth(),
      year: now.getFullYear(),
    };
  });

  // Daily income vs expense chart filter (independent)
  const [dailyChartCategoryId, setDailyChartCategoryId] = useState<string | undefined>(undefined);

  // Top expenses chart filters
  const [topExpensesType, setTopExpensesType] = useState<"category" | "group">("category");
  const [topExpensesFilterId, setTopExpensesFilterId] = useState<string>("all");

  // Calculate date range for current month
  const dateRange = useMemo(() => {
    const startDate = new Date(selectedMonth.year, selectedMonth.month, 1);
    const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0);
    return {
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    };
  }, [selectedMonth]);

  // Fetch data using our new queries
  const monthlySummary = useQuery(
    api.reflections.getMonthlySummary,
    convexUser ? { userId: convexUser._id, ...dateRange } : "skip"
  );

  const categoryBreakdown = useQuery(
    api.reflections.getCategoryBreakdown,
    convexUser
      ? { userId: convexUser._id, ...dateRange, expensesOnly: true }
      : "skip"
  );

  const groupBreakdown = useQuery(
    api.reflections.getGroupBreakdown,
    convexUser
      ? { userId: convexUser._id, ...dateRange, expensesOnly: true }
      : "skip"
  );

  const categoryTrend = useQuery(
    api.reflections.getCategoryTrend,
    convexUser
      ? {
        userId: convexUser._id,
        ...dateRange,
        ...(dailyChartCategoryId ? { categoryId: dailyChartCategoryId as Id<"categories"> } : {}),
      }
      : "skip"
  );

  // Get categories and groups for dropdowns
  const categories = useQuery(
    api.categories.listCategories,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const categoryGroups = useQuery(
    api.categories.listCategoryGroups,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Time-based data for top expenses chart
  const timeBasedData = useQuery(
    api.reflections.getTimeBasedBreakdown,
    convexUser
      ? {
        userId: convexUser._id,
        ...dateRange,
        filterType: topExpensesType,
        filterId: topExpensesFilterId,
      }
      : "skip"
  );

  // Fetch transfer insights
  const transferInsights = useQuery(
    api.reflections.getTransferInsights,
    convexUser ? { userId: convexUser._id, ...dateRange } : "skip"
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d");
  };

  const formatDateWithDay = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMM d");
  };

  // Navigation functions
  const navigateToPreviousMonth = () => {
    const currentDate = new Date(selectedMonth.year, selectedMonth.month);
    const previousMonth = subMonths(currentDate, 1);
    setSelectedMonth({
      month: previousMonth.getMonth(),
      year: previousMonth.getFullYear(),
    });
  };

  const navigateToNextMonth = () => {
    const currentDate = new Date(selectedMonth.year, selectedMonth.month);
    const nextMonth = addMonths(currentDate, 1);
    setSelectedMonth({
      month: nextMonth.getMonth(),
      year: nextMonth.getFullYear(),
    });
  };

  // Generate reflection insights
  const generateReflectionInsights = () => {
    const insights: string[] = [];
    
    if (transferInsights && transferInsights.length > 0) {
      transferInsights.forEach((insight: TransferInsight) => {
        if (insight.type === 'savings' && insight.amount > 0) {
          insights.push(`You saved ${formatCurrency(insight.amount)} this month through transfers to ${insight.accountName}`);
        } else if (insight.type === 'debt_payment' && insight.amount > 0) {
          insights.push(`You paid down ${formatCurrency(insight.amount)} in debt with payments to ${insight.accountName}`);
        }
      });
    }

    // Add net savings insight if positive
    if (monthlySummary && monthlySummary.netDifference > 0) {
      insights.push(`Your net savings this month is ${formatCurrency(monthlySummary.netDifference)} - great job staying within budget!`);
    }

    return insights;
  };

  // Colors for charts
  const CHART_COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7c7c",
    "#8dd1e1",
    "#d084d0",
    "#87d068",
    "#ffb347",
  ];

  // Enhanced tooltip for trend chart with income/expense breakdown
  const TrendTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ payload: TrendTooltipData; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-background border rounded-lg p-3 sm:p-4 shadow-lg max-w-xs sm:max-w-sm">
          {label && (
            <p className="font-medium mb-2 text-sm sm:text-base">{formatDateWithDay(label)}</p>
          )}

          {/* Income/Expense Summary */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-green-600">Income:</span>
              <span className="font-semibold text-green-600">{formatCurrency(data?.income || 0)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-red-600">Expenses:</span>
              <span className="font-semibold text-red-600">{formatCurrency(data?.expense || 0)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm border-t pt-1">
              <span>Net:</span>
              <span className={`font-semibold ${(data?.income || 0) - (data?.expense || 0) >= 0
                ? "text-green-600"
                : "text-red-600"
                }`}>
                {formatCurrency((data?.income || 0) - (data?.expense || 0))}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span>Transactions:</span>
              <span>{data?.transactionCount || 0}</span>
            </div>
          </div>

          {/* Transaction breakdown if available */}
          {data?.transactions && data.transactions.length > 0 && (
            <div className="border-t pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Top Transactions:</p>
              <div className="space-y-1 max-h-24 sm:max-h-32 overflow-y-auto">
                {data.transactions.slice(0, 3).map((tx: TrendTransaction, idx: number) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="truncate font-medium" title={tx.description}>
                          {tx.description}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {tx.accountName} • {tx.categoryName}
                        </div>
                      </div>
                      <div className={`font-semibold flex-shrink-0 text-xs ${tx.amount >= 0
                        ? "text-green-600"
                        : tx.transactionType === "transfer"
                          ? "text-gray-600"
                          : "text-red-600"
                        }`}>
                        {formatCurrency(Math.abs(tx.amount))}
                      </div>
                    </div>
                  </div>
                ))}
                {data.transactions.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{data.transactions.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Standard tooltip for other charts
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<LegendEntry>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-2 shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: LegendEntry, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {`${entry.dataKey}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Please sign in to view your financial reflection.</div>
        </div>
      </AppLayout>
    );
  }

  const monthName = new Date(selectedMonth.year, selectedMonth.month).toLocaleString(
    "default",
    { month: "long", year: "numeric" }
  );

  const reflectionInsights = generateReflectionInsights();

  return (
    <AppLayout>
      <InitUser />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header with Month Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold">📊 Financial Reflection</h1>

            {/* Month Navigation */}
            <div className="flex items-center justify-center sm:justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToPreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-base sm:text-lg font-semibold min-w-[180px] sm:min-w-[200px] text-center">
                {monthName}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={navigateToNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground text-center sm:text-left">
            Your spending and income insights for the selected period
          </p>
        </div>

        {/* Reflection Insights */}
        {reflectionInsights.length > 0 && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="flex-shrink-0 mx-auto sm:mx-0 sm:mt-1">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 text-center sm:text-left">
                  ✨ Financial Reflections
                </h3>
                <div className="space-y-2">
                  {reflectionInsights.map((insight, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-start space-y-2 sm:space-y-0 sm:space-x-2">
                      <div className="flex-shrink-0 mx-auto sm:mx-0 sm:mt-2">
                        {insight.includes('saved') ? (
                          <PiggyBank className="h-4 w-4 text-green-600" />
                        ) : insight.includes('debt') ? (
                          <CreditCard className="h-4 w-4 text-orange-600" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-blue-800 dark:text-blue-200 leading-relaxed text-center sm:text-left text-sm sm:text-base">
                        {insight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Summary Cards */}
        {monthlySummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="p-4 sm:p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Income
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(monthlySummary.totalIncome)}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {monthlySummary.transactionCount} transactions
                </p>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(monthlySummary.totalExpenses)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Outgoing this month
                </p>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 sm:col-span-2 md:col-span-1">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Net Difference
                </p>
                <p
                  className={`text-2xl sm:text-3xl font-bold ${monthlySummary.netDifference >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {formatCurrency(monthlySummary.netDifference)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {monthlySummary.netDifference >= 0 ? "Savings" : "Deficit"}
                </p>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Daily Income vs Expenses */}
          {categoryTrend && categoryTrend.length > 0 && (
            <Card className="p-4 sm:p-6 lg:col-span-2">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
                <h3 className="text-lg font-semibold">Daily Income vs Expenses</h3>
                {categories && (
                  <Select value={dailyChartCategoryId || "all"} onValueChange={(value) => setDailyChartCategoryId(value === "all" ? undefined : value)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Bar dataKey="income" fill="#22c55e" name="Income" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[2, 2, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Time-based Top Expenses Chart */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col space-y-4 mb-4">
              <h3 className="text-lg font-semibold">Top Expenses Over Time</h3>
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                <Select value={topExpensesType} onValueChange={(value) => setTopExpensesType(value as "category" | "group")}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={topExpensesFilterId} onValueChange={setTopExpensesFilterId}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {topExpensesType === "category" ? "Categories" : "Groups"}</SelectItem>
                    {topExpensesType === "category" && categories?.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                    {topExpensesType === "category" && (
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    )}
                    {topExpensesType === "group" && categoryGroups?.map((group) => (
                      <SelectItem key={group._id} value={group._id}>
                        {group.name}
                      </SelectItem>
                    ))}
                    {topExpensesType === "group" && (
                      <SelectItem value="ungrouped">Ungrouped</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {timeBasedData && timeBasedData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeBasedData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="expense" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Group Breakdown Donut Chart */}
          {groupBreakdown && groupBreakdown.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Expense Groups</h3>
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={groupBreakdown.slice(0, 8)}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      startAngle={90}
                      innerRadius={50}
                      outerRadius={90}
                      fill="#8884d8"
                      stroke="none"
                    >
                      {groupBreakdown.slice(0, 8).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Amount"]}
                      contentStyle={{ zIndex: 1000 }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ paddingTop: "10px", zIndex: 1 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Total amount in center */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl font-bold">
                      {formatCurrency(groupBreakdown.reduce((sum, item) => sum + item.amount, 0))}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Category Details Table */}
          {categoryBreakdown && categoryBreakdown.length > 0 && (
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
                <h3 className="text-lg font-semibold">Category Details</h3>
                <Link href="/categories">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Manage Categories →
                  </Button>
                </Link>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categoryBreakdown.map((category, index) => {
                  const categoryId = categories?.find(c => c.name === category.name)?._id ||
                    (category.name === "Uncategorized" ? "uncategorized" : null);

                  const content = (
                    <div className="flex justify-between items-center p-3 sm:p-2 rounded hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-medium text-sm sm:text-base truncate">{category.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {category.count} transaction{category.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sm sm:text-base">
                          {formatCurrency(category.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${(category.amount / category.count).toFixed(2)} avg
                        </p>
                      </div>
                    </div>
                  );

                  return categoryId ? (
                    <Link key={index} href={`/categories/${categoryId}`}>
                      {content}
                    </Link>
                  ) : (
                    <div key={index}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Empty State */}
        {monthlySummary?.transactionCount === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-muted-foreground">
              <p className="text-base sm:text-lg">No transactions found for {monthName}</p>
              <p className="text-sm sm:text-base">Import some transactions to see your financial reflection!</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}