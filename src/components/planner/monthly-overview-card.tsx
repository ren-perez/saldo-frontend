// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Calendar, TrendingUp, Target, CreditCard, Wallet } from "lucide-react"
// import {
//   mockCategories,
//   getTotalIncome,
//   getTotalCommitted,
//   getTotalFlexibleSpending,
//   getTotalGoalContributions,
//   getUnallocatedIncome,
// } from "@/lib/mock-data"
// import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
// import type { SpendingCategory, CommitmentCategory, GoalCategory } from "@/types/category"

// export function MonthlyOverviewCard() {
//   const totalIncome = getTotalIncome()
//   const totalCommitted = getTotalCommitted()
//   const totalFlexibleSpending = getTotalFlexibleSpending()
//   const totalGoalContributions = getTotalGoalContributions()
//   const remaining = getUnallocatedIncome()

//   const chartData = [
//     { name: "Commitments", value: totalCommitted || 0, color: "#3b82f6" },
//     { name: "Flexible Spending", value: totalFlexibleSpending || 0, color: "#10b981" },
//     { name: "Goal Contributions", value: totalGoalContributions || 0, color: "#f59e0b" },
//     { name: "Unallocated", value: remaining || 0, color: "#ef4444" },
//   ].filter((item) => item.value > 0) // Only show categories with values

//   return (
//     <Card className="h-full">
//       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
//         <CardTitle className="text-lg font-semibold">Monthly Overview</CardTitle>
//         <Calendar className="h-5 w-5 text-muted-foreground" />
//       </CardHeader>
//       <CardContent className="space-y-6">
//         {/* Income Summary */}
//         <div className="space-y-3">
//           <div className="flex justify-between items-center">
//             <span className="text-sm font-medium">Expected Income:</span>
//             <span className="font-semibold text-emerald-600">${(totalIncome || 0).toLocaleString()}</span>
//           </div>
//           <div className="flex justify-between items-center">
//             <span className="text-sm font-medium">Total Committed:</span>
//             <span className="font-semibold text-blue-600">${(totalCommitted || 0).toLocaleString()}</span>
//           </div>
//           <div className="flex justify-between items-center">
//             <span className="text-sm font-medium">Flexible Spending:</span>
//             <span className="font-semibold text-emerald-600">${(totalFlexibleSpending || 0).toLocaleString()}</span>
//           </div>
//           <div className="flex justify-between items-center">
//             <span className="text-sm font-medium">Goal Contributions:</span>
//             <span className="font-semibold text-orange-600">${(totalGoalContributions || 0).toLocaleString()}</span>
//           </div>
//           {remaining > 0 && (
//             <div className="flex justify-between items-center">
//               <span className="text-sm font-medium">Unallocated:</span>
//               <span className="font-semibold text-red-600">${(remaining || 0).toLocaleString()}</span>
//             </div>
//           )}
//         </div>

//         {/* Donut Chart */}
//         {chartData.length > 0 && (
//           <div className="h-48">
//             <ResponsiveContainer width="100%" height="100%">
//               <PieChart>
//                 <Pie
//                   data={chartData}
//                   cx="50%"
//                   cy="50%"
//                   innerRadius={40}
//                   outerRadius={80}
//                   paddingAngle={2}
//                   dataKey="value"
//                 >
//                   {chartData.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={entry.color} />
//                   ))}
//                 </Pie>
//                 <Legend
//                   verticalAlign="bottom"
//                   height={36}
//                   formatter={(value, entry) => <span style={{ color: entry.color, fontSize: "12px" }}>{value}</span>}
//                 />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>
//         )}

//         <div className="border-t pt-4">
//           <h4 className="font-medium mb-3 flex items-center">
//             <TrendingUp className="h-4 w-4 mr-2" />
//             Category List
//           </h4>
//           <div className="space-y-3">
//             {mockCategories.map((category) => {
//               let amount = 0
//               let icon = null
//               let badgeColor = ""
//               let description = ""

//               if (category.mode === "spending") {
//                 amount = (category as SpendingCategory).monthlyTarget || 0
//                 icon = <Wallet className="h-3 w-3" />
//                 badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
//                 description = "Track vs spend"
//               } else if (category.mode === "commitment") {
//                 amount = (category as CommitmentCategory).monthlyDue || 0
//                 icon = <CreditCard className="h-3 w-3" />
//                 badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
//                 description = "Reserve → release"
//               } else if (category.mode === "goal") {
//                 amount = ((category as GoalCategory).weeklyContribution || 0) * 4
//                 icon = <Target className="h-3 w-3" />
//                 badgeColor = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
//                 description = "Save until target"
//               }

//               return (
//                 <div key={category.id} className="flex justify-between items-center p-3 rounded-lg border bg-card">
//                   <div className="flex items-center space-x-3">
//                     <div className={`w-3 h-3 rounded-full ${category.color}`} />
//                     <div className="flex flex-col">
//                       <span className="font-medium text-sm">{category.name}</span>
//                       <div className="flex items-center space-x-2">
//                         <Badge variant="secondary" className={`text-xs px-2 py-0.5 ${badgeColor}`}>
//                           <span className="flex items-center space-x-1">
//                             {icon}
//                             <span className="capitalize">{category.mode}</span>
//                           </span>
//                         </Badge>
//                         <span className="text-xs text-muted-foreground">{description}</span>
//                       </div>
//                     </div>
//                   </div>
//                   <span className="font-semibold text-sm">${amount.toLocaleString()}</span>
//                 </div>
//               )
//             })}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }
