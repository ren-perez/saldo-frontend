// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Card, CardContent } from "@/components/ui/card"
// import { Alert, AlertDescription } from "@/components/ui/alert"
// import { AlertTriangle, ArrowLeft } from "lucide-react"
// import { mockCategories } from "@/lib/mock-data"
// import type { AllocationData } from "./allocation-modal"

// interface AllocationStep2Props {
//   unallocatedAmount: number
//   initialAllocations: AllocationData
//   onComplete: (allocations: AllocationData) => void
//   onBack: () => void
// }

// export function AllocationStep2({ unallocatedAmount, initialAllocations, onComplete, onBack }: AllocationStep2Props) {
//   const [allocations, setAllocations] = useState<AllocationData>(initialAllocations)
//   const [errors, setErrors] = useState<{ [key: string]: string }>({})

//   const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + (amount || 0), 0)
//   const remaining = unallocatedAmount - totalAllocated
//   const hasError = remaining !== 0

//   const handleAllocationChange = (categoryId: string, value: string) => {
//     const numValue = Number.parseFloat(value) || 0
//     setAllocations((prev) => ({
//       ...prev,
//       [categoryId]: numValue,
//     }))

//     // Clear error for this field
//     if (errors[categoryId]) {
//       setErrors((prev) => {
//         const newErrors = { ...prev }
//         delete newErrors[categoryId]
//         return newErrors
//       })
//     }
//   }

//   const validateAndComplete = () => {
//     const newErrors: { [key: string]: string } = {}

//     // Check if total matches unallocated amount
//     if (remaining !== 0) {
//       return // Don't proceed if amounts don't match
//     }

//     // Check for negative values
//     Object.entries(allocations).forEach(([categoryId, amount]) => {
//       if (amount < 0) {
//         newErrors[categoryId] = "Amount cannot be negative"
//       }
//     })

//     if (Object.keys(newErrors).length > 0) {
//       setErrors(newErrors)
//       return
//     }

//     onComplete(allocations)
//   }

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center space-x-2">
//         <Button variant="ghost" size="sm" onClick={onBack}>
//           <ArrowLeft className="h-4 w-4" />
//         </Button>
//         <div>
//           <h3 className="text-lg font-medium">Manual Adjustment</h3>
//           <p className="text-sm text-muted-foreground">Adjust the allocation amounts as needed</p>
//         </div>
//       </div>

//       {hasError && (
//         <Alert variant="destructive">
//           <AlertTriangle className="h-4 w-4" />
//           <AlertDescription>
//             Total allocation must equal ${unallocatedAmount.toLocaleString()}. Current difference: $
//             {Math.abs(remaining).toLocaleString()}
//             {remaining > 0 ? " under" : " over"} allocated.
//           </AlertDescription>
//         </Alert>
//       )}

//       <Card>
//         <CardContent className="p-4 space-y-4">
//           {mockCategories.map((category) => {
//             const currentAmount = allocations[category.id] || 0
//             const hasFieldError = errors[category.id]

//             return (
//               <div key={category.id} className="space-y-2">
//                 <Label htmlFor={`allocation-${category.id}`} className="flex items-center space-x-2">
//                   <div className={`w-3 h-3 rounded-full ${category.color}`} />
//                   <span>{category.name}</span>
//                   {category.type === "fixed" && (
//                     <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Fixed</span>
//                   )}
//                 </Label>
//                 <div className="flex items-center space-x-2">
//                   <span className="text-sm">$</span>
//                   <Input
//                     id={`allocation-${category.id}`}
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={currentAmount}
//                     onChange={(e) => handleAllocationChange(category.id, e.target.value)}
//                     className={hasFieldError ? "border-destructive" : ""}
//                   />
//                 </div>
//                 {hasFieldError && <p className="text-sm text-destructive">{hasFieldError}</p>}
//               </div>
//             )
//           })}
//         </CardContent>
//       </Card>

//       {/* Summary */}
//       <div className="bg-muted p-4 rounded-lg">
//         <div className="flex justify-between items-center">
//           <span className="font-medium">Total Allocation:</span>
//           <span className="font-semibold">${totalAllocated.toLocaleString()}</span>
//         </div>
//         <div className="flex justify-between items-center mt-1">
//           <span className="text-sm text-muted-foreground">Target Amount:</span>
//           <span className="text-sm font-medium">${unallocatedAmount.toLocaleString()}</span>
//         </div>
//         <div className="flex justify-between items-center mt-1">
//           <span className={`text-sm font-medium ${remaining === 0 ? "text-emerald-600" : "text-destructive"}`}>
//             Difference:
//           </span>
//           <span className={`text-sm font-medium ${remaining === 0 ? "text-emerald-600" : "text-destructive"}`}>
//             ${Math.abs(remaining).toLocaleString()} {remaining > 0 ? "under" : remaining < 0 ? "over" : "perfect"}
//           </span>
//         </div>
//       </div>

//       {/* Action buttons */}
//       <div className="flex space-x-3">
//         <Button onClick={onBack} variant="outline" className="flex-1 bg-transparent">
//           Back
//         </Button>
//         <Button onClick={validateAndComplete} className="flex-1" disabled={hasError}>
//           Apply Allocation
//         </Button>
//       </div>
//     </div>
//   )
// }
