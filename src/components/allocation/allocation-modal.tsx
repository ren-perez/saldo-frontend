// "use client"

// import { useState } from "react"
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { Progress } from "@/components/ui/progress"
// import { AllocationStep1 } from "./allocation-step1"
// import { AllocationStep2 } from "./allocation-step2"
// import { getUnallocatedIncome } from "@/lib/mock-data"

// interface AllocationModalProps {
//   isOpen: boolean
//   onClose: () => void
// }

// export interface AllocationData {
//   [categoryId: string]: number
// }

// export function AllocationModal({ isOpen, onClose }: AllocationModalProps) {
//   const [currentStep, setCurrentStep] = useState(1)
//   const [allocations, setAllocations] = useState<AllocationData>({})
//   const unallocatedAmount = getUnallocatedIncome()

//   const handleStepComplete = (stepAllocations: AllocationData) => {
//     setAllocations(stepAllocations)
//     if (currentStep === 1) {
//       setCurrentStep(2)
//     } else {
//       console.log("Applying allocation:", stepAllocations)
//       // In a real app, this would update the backend/state
//       alert("Allocation applied successfully!")
//       onClose()
//       setCurrentStep(1)
//       setAllocations({})
//     }
//   }

//   const handleBack = () => {
//     setCurrentStep(1)
//   }

//   const handleClose = () => {
//     onClose()
//     setCurrentStep(1)
//     setAllocations({})
//   }

//   if (unallocatedAmount <= 0) {
//     return null
//   }

//   return (
//     <Dialog open={isOpen} onOpenChange={handleClose}>
//       <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
//         <DialogHeader>
//           <DialogTitle className="text-xl font-semibold">Allocate ${unallocatedAmount.toLocaleString()}</DialogTitle>
//         </DialogHeader>

//         {/* Progress indicator */}
//         <div className="mb-6">
//           <div className="flex items-center justify-between mb-2">
//             <span className="text-sm font-medium">Step {currentStep} of 2</span>
//             <span className="text-sm text-muted-foreground">
//               {currentStep === 1 ? "Suggested Allocation" : "Manual Adjustment"}
//             </span>
//           </div>
//           <Progress value={currentStep * 50} className="h-2" />
//         </div>

//         {/* Step content */}
//         {currentStep === 1 ? (
//           <AllocationStep1
//             unallocatedAmount={unallocatedAmount}
//             suggestedAllocations={{}}
//             onComplete={handleStepComplete}
//           />
//         ) : (
//           <AllocationStep2
//             unallocatedAmount={unallocatedAmount}
//             initialAllocations={allocations}
//             onComplete={handleStepComplete}
//             onBack={handleBack}
//           />
//         )}
//       </DialogContent>
//     </Dialog>
//   )
// }
