// "use client"

// import { Button } from "@/components/ui/button"
// import { Card, CardContent } from "@/components/ui/card"
// import { Progress } from "@/components/ui/progress"
// import { mockCategories } from "@/lib/mock-data"
// import type { AllocationData } from "./allocation-modal"
// import type { SpendingCategory, CommitmentCategory, GoalCategory } from "@/lib/mock-data"

// interface AllocationStep1Props {
//   unallocatedAmount: number
//   suggestedAllocations: AllocationData
//   onComplete: (allocations: AllocationData) => void
// }

// export function AllocationStep1({ unallocatedAmount, suggestedAllocations, onComplete }: AllocationStep1Props) {
//   const generateBetterSuggestions = (): AllocationData => {
//     const suggestions: AllocationData = {}
//     let remaining = unallocatedAmount

//     // First, handle commitments (fixed amounts)
//     mockCategories.forEach((category) => {
//       if (category.mode === "commitment") {
//         const commitment = category as CommitmentCategory
//         const needed = Math.max(0, commitment.stillToReserve || 0)
//         suggestions[category.id] = Math.min(needed, remaining)
//         remaining -= suggestions[category.id]
//       }
//     })

//     // Then allocate to goals (weekly contributions * 4)
//     mockCategories.forEach((category) => {
//       if (category.mode === "goal" && remaining > 0) {
//         const goal = category as GoalCategory
//         const weeklyAmount = goal.weeklyContribution || 0
//         const monthlyAmount = weeklyAmount * 4
//         suggestions[category.id] = Math.min(monthlyAmount, remaining)
//         remaining -= suggestions[category.id]
//       }
//     })

//     // Finally, allocate remaining to spending categories
//     const spendingCategories = mockCategories.filter((c) => c.mode === "spending")
//     if (spendingCategories.length > 0 && remaining > 0) {
//       const perSpendingCategory = Math.floor(remaining / spendingCategories.length)
//       spendingCategories.forEach((category) => {
//         const spending = category as SpendingCategory
//         const needed = Math.max(0, spending.remaining || 0)
//         suggestions[category.id] = Math.min(needed, perSpendingCategory)
//       })
//     }

//     return suggestions
//   }

//   const betterSuggestions = generateBetterSuggestions()
//   const totalSuggested = Object.values(betterSuggestions).reduce((sum, amount) => sum + (amount || 0), 0)

//   const handleAcceptSuggested = () => {
//     onComplete(betterSuggestions)
//   }

//   const handleAdjustManually = () => {
//     onComplete(betterSuggestions)
//   }

//   return (
//     <div className="space-y-6">
//       <div>
//         <h3 className="text-lg font-medium mb-2">Suggested Allocation</h3>
//         <p className="text-sm text-muted-foreground">Based on your category needs and spending patterns</p>
//       </div>

//       <Card>
//         <CardContent className="p-4 space-y-4">
//           {mockCategories.map((category) => {
//             const suggestedAmount = betterSuggestions[category.id] || 0
//             const percentage = unallocatedAmount > 0 ? (suggestedAmount / unallocatedAmount) * 100 : 0

//             if (suggestedAmount === 0) return null

//             return (
//               <div key={category.id} className="space-y-2">
//                 <div className="flex justify-between items-center">
//                   <div className="flex items-center space-x-2">
//                     <div className={`w-3 h-3 rounded-full ${category.color}`} />
//                     <span className="font-medium">{category.name}</span>
//                     <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded capitalize">
//                       {category.mode}
//                     </span>
//                   </div>
//                   <div className="text-right">
//                     <div className="font-semibold">${suggestedAmount.toLocaleString()}</div>
//                     <div className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</div>
//                   </div>
//                 </div>
//                 <Progress value={percentage} className="h-2" />
//               </div>
//             )
//           })}
//         </CardContent>
//       </Card>

//       {/* Summary */}
//       <div className="bg-muted p-4 rounded-lg">
//         <div className="flex justify-between items-center">
//           <span className="font-medium">Total Allocation:</span>
//           <span className="font-semibold">${totalSuggested.toLocaleString()}</span>
//         </div>
//         <div className="flex justify-between items-center mt-1">
//           <span className="text-sm text-muted-foreground">Remaining:</span>
//           <span className="text-sm font-medium">${(unallocatedAmount - totalSuggested).toLocaleString()}</span>
//         </div>
//       </div>

//       {/* Action buttons */}
//       <div className="flex space-x-3">
//         <Button onClick={handleAcceptSuggested} className="flex-1">
//           Accept Suggested
//         </Button>
//         <Button onClick={handleAdjustManually} variant="outline" className="flex-1 bg-transparent">
//           Adjust Manually
//         </Button>
//       </div>
//     </div>
//   )
// }
