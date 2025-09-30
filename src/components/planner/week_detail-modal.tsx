// "use client"

// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { Progress } from "@/components/ui/progress"
// import { Badge } from "@/components/ui/badge"
// import { Calendar, TrendingUp, AlertTriangle, CheckCircle, Target, CreditCard, Wallet } from "lucide-react"
// import type { WeeklyPlan } from "@/lib/mock-data"
// import { SpendingCategoryCard } from "@/components/category-modes/spending-category"
// import { CommitmentCategoryCard } from "@/components/category-modes/commitment-category"
// import { GoalCategoryCard } from "@/components/category-modes/goal-category"

// interface WeekDetailModalProps {
//   isOpen: boolean
//   onClose: () => void
//   weekData: WeeklyPlan
// }

// export function WeekDetailModal({ isOpen, onClose, weekData }: WeekDetailModalProps) {
//   const { week, planned, actual, remaining, categories } = weekData
//   const progressPercentage = planned > 0 ? (actual / planned) * 100 : 0
//   const isOverBudget = actual > planned

//   const spendingCategories = categories.filter((c) => c.mode === "spending")
//   const commitmentCategories = categories.filter((c) => c.mode === "commitment")
//   const goalCategories = categories.filter((c) => c.mode === "goal")

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)]">
//         <DialogHeader>
//           <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center">
//             <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
//             Week {week} Details
//           </DialogTitle>
//         </DialogHeader>

//         <div className="space-y-4 sm:space-y-6">
//           {/* Week Summary with Status Badge */}
//           <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-3">
//             <div className="flex justify-between items-center">
//               <span className="font-medium text-sm sm:text-base">Week Status:</span>
//               <Badge variant={isOverBudget ? "destructive" : remaining > 50 ? "default" : "secondary"}>
//                 {isOverBudget ? (
//                   <>
//                     <AlertTriangle className="h-3 w-3 mr-1" />
//                     Over Budget
//                   </>
//                 ) : remaining > 50 ? (
//                   <>
//                     <CheckCircle className="h-3 w-3 mr-1" />
//                     On Track
//                   </>
//                 ) : (
//                   "Nearly Complete"
//                 )}
//               </Badge>
//             </div>

//             <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm">
//               <div>
//                 <span className="text-muted-foreground text-xs sm:text-sm">Planned</span>
//                 <div className="font-semibold text-base sm:text-lg">${planned.toLocaleString()}</div>
//               </div>
//               <div>
//                 <span className="text-muted-foreground text-xs sm:text-sm">Actual</span>
//                 <div className={`font-semibold text-base sm:text-lg ${isOverBudget ? "text-destructive" : ""}`}>
//                   ${actual.toLocaleString()}
//                 </div>
//               </div>
//               <div>
//                 <span className="text-muted-foreground text-xs sm:text-sm">Remaining</span>
//                 <div
//                   className={`font-semibold text-base sm:text-lg ${remaining < 0 ? "text-destructive" : "text-emerald-600"}`}
//                 >
//                   ${Math.abs(remaining).toLocaleString()}
//                   {remaining < 0 && " over"}
//                 </div>
//               </div>
//             </div>

//             <Progress
//               value={Math.min(progressPercentage, 100)}
//               className={`h-3 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
//             />
//           </div>

//           {/* Category Breakdown with Mode-Specific UI */}
//           <div className="space-y-4 sm:space-y-6">
//             <h4 className="font-medium text-sm sm:text-base flex items-center">
//               <TrendingUp className="h-4 w-4 mr-2" />
//               Categories by Mode
//             </h4>

//             {spendingCategories.length > 0 && (
//               <div className="space-y-3">
//                 <div className="flex items-center space-x-2 flex-wrap gap-y-1">
//                   <Wallet className="h-4 w-4 text-emerald-600" />
//                   <h5 className="font-medium text-emerald-600 text-sm sm:text-base">Spending Categories</h5>
//                   <Badge
//                     variant="secondary"
//                     className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-xs"
//                   >
//                     Track vs spend
//                   </Badge>
//                 </div>
//                 <div className="grid gap-3 sm:grid-cols-2">
//                   {spendingCategories.map((category) => (
//                     <SpendingCategoryCard key={category.id} category={category} />
//                   ))}
//                 </div>
//               </div>
//             )}

//             {commitmentCategories.length > 0 && (
//               <div className="space-y-3">
//                 <div className="flex items-center space-x-2 flex-wrap gap-y-1">
//                   <CreditCard className="h-4 w-4 text-blue-600" />
//                   <h5 className="font-medium text-blue-600 text-sm sm:text-base">Commitment Categories</h5>
//                   <Badge
//                     variant="secondary"
//                     className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs"
//                   >
//                     Reserve → release
//                   </Badge>
//                 </div>
//                 <div className="grid gap-3 sm:grid-cols-2">
//                   {commitmentCategories.map((category) => (
//                     <CommitmentCategoryCard key={category.id} category={category} />
//                   ))}
//                 </div>
//               </div>
//             )}

//             {goalCategories.length > 0 && (
//               <div className="space-y-3">
//                 <div className="flex items-center space-x-2 flex-wrap gap-y-1">
//                   <Target className="h-4 w-4 text-orange-600" />
//                   <h5 className="font-medium text-orange-600 text-sm sm:text-base">Goal Categories</h5>
//                   <Badge
//                     variant="secondary"
//                     className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs"
//                   >
//                     Save until target
//                   </Badge>
//                 </div>
//                 <div className="grid gap-3 sm:grid-cols-2">
//                   {goalCategories.map((category) => (
//                     <GoalCategoryCard key={category.id} category={category} />
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg">
//             <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100 text-sm sm:text-base">Weekly Insights</h4>
//             <ul className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
//               {isOverBudget && <li>• You&apos;re ${Math.abs(remaining).toLocaleString()} over budget this week</li>}
//               {remaining > 100 && (
//                 <li>
//                   • Great job staying under budget! Consider allocating the extra ${remaining.toLocaleString()} to goals
//                 </li>
//               )}
//               <li>
//                 • Track different category modes: Spending (track vs spend), Commitment (reserve → release), Goal (save
//                 until target)
//               </li>
//               {commitmentCategories.length > 0 && (
//                 <li>• Commitment categories help you reserve money for fixed expenses like rent</li>
//               )}
//               {goalCategories.length > 0 && <li>• Goal categories track your progress toward savings targets</li>}
//             </ul>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   )
// }
