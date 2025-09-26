// components/goals/GoalDialog.tsx
"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "../ui/textarea"
import { Separator } from "../ui/separator"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { toast } from "sonner"
import {
    // DollarSign, 
    Calendar, AlertCircle
} from "lucide-react"
import type { Goal } from "@/types/goals"
import type { Id } from "../../../convex/_generated/dataModel"
import Image from "next/image"


// interface Goal {
//     id: number
//     name: string
//     note?: string
//     total_amount: number
//     monthly_contribution: number
//     due_date: string
//     color: string
//     emoji: string
//     priority: number
//     priority_label: string
//     tracking_type: string
//     calculation_type: string
//     linked_account: {
//         id: number
//         name: string
//         account_type: string
//         balance?: number
//     } | null
//     image?: string
// }

// interface GoalFormData {
//     name: string
//     note: string
//     total_amount: string
//     due_date: string
//     monthly_contribution: string
//     calculation_type: string
//     tracking_type: string
//     linked_account_id: Id<"accounts"> | null
//     color: string
//     emoji: string
//     priority: number
//     image: File | null
//     imageChanged: boolean
// }


interface GoalDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreateGoal: (goal: Goal) => void
    onUpdateGoal: (goal: Goal) => void
    editingGoal?: Goal | null
    mode: 'create' | 'edit'
}

export function GoalDialog({
    open,
    onOpenChange,
    onCreateGoal,
    onUpdateGoal,
    editingGoal,
    mode,
}: GoalDialogProps) {
    const { convexUser } = useConvexUser()
    const [formData, setFormData] = useState({
        name: "",
        note: "",
        total_amount: "",
        due_date: "",
        monthly_contribution: "",
        calculation_type: "DUE_DATE",
        tracking_type: "MANUAL",
        linked_account_id: null as Id<"accounts"> | null,
        color: "#3b82f6",
        emoji: "",
        priority: 3,
        image: null as File | null,
        imageChanged: false,
    })

    const noteRef = useRef<HTMLTextAreaElement>(null)

    // Load accounts and priority options using Convex
    const accounts = useQuery(
        convexUser ? api.goals.getGoalAccounts : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    ) || []
    const priorityOptions = useQuery(api.goals.getGoalPriorityOptions) || []

    // Mutations
    const createGoalMutation = useMutation(api.goals.createGoal)
    const updateGoalMutation = useMutation(api.goals.updateGoal)

    // Get selected account details
    // const selectedAccount = accounts.find((account) => account.id === formData.linked_account_id)
    const selectedAccount = accounts.find(
        (account) => account.id.toString() === formData.linked_account_id
    )

    // Quick date options (in months from now)
    const quickDateOptions = [
        { label: "3 months", months: 3 },
        { label: "6 months", months: 6 },
        { label: "1 year", months: 12 },
    ]

    // Quick contribution amounts
    const quickContributionAmounts = [100, 500, 1000]


    // Add this debugging code at the start of your GoalDialog component
    useEffect(() => {
        console.log('=== GoalDialog Debug ===');
        console.log('priorityOptions:', priorityOptions);
        console.log('accounts:', accounts);

        // Check for NaN values
        priorityOptions?.forEach((option, index) => {
            if (Number.isNaN(option.value)) {
                console.error(`Priority option at index ${index} has NaN value:`, option);
            }
        });

        accounts?.forEach((account, index) => {
            if (Number.isNaN(account.id)) {
                console.error(`Account at index ${index} has NaN id:`, account);
            }
        });
    }, [priorityOptions, accounts]);



    useEffect(() => {
        if (open && mode === "edit" && editingGoal && !editingGoal.note) {
            setTimeout(() => {
                noteRef.current?.focus()
            }, 100)
        }
    }, [open, mode, editingGoal])

    // Reset form when dialog opens/closes or when editing goal changes
    useEffect(() => {
        if (open && mode === "edit" && editingGoal) {
            setFormData({
                name: editingGoal.name,
                note: editingGoal.note || "",
                total_amount: editingGoal.total_amount.toString(),
                due_date: editingGoal.due_date || "",
                monthly_contribution: editingGoal.monthly_contribution.toString(),
                calculation_type: editingGoal.calculation_type || "DUE_DATE",
                tracking_type: editingGoal.tracking_type || "MANUAL",
                linked_account_id: editingGoal.linked_account?.id || null,
                color: editingGoal.color || "#3b82f6",
                emoji: editingGoal.emoji || "🎯",
                priority: editingGoal.priority || 3,
                image: null,
                imageChanged: false,
            })
        } else if (open && mode === "create") {
            setFormData({
                name: "",
                note: "",
                total_amount: "",
                due_date: "",
                monthly_contribution: "",
                calculation_type: "DUE_DATE",
                tracking_type: "MANUAL",
                linked_account_id: null,
                color: "#3b82f6",
                emoji: "🎯",
                priority: 3,
                image: null,
                imageChanged: false,
            })
        }
    }, [open, mode, editingGoal])

    // Auto-calculate based on user input
    useEffect(() => {
        if (formData.calculation_type === 'DUE_DATE' && formData.due_date && formData.total_amount) {
            const monthsToGoal = calculateMonthsDifference(new Date(), new Date(formData.due_date))
            if (monthsToGoal > 0) {
                const monthlyContribution = parseFloat(formData.total_amount) / monthsToGoal
                setFormData(prev => ({ ...prev, monthly_contribution: monthlyContribution.toFixed(2) }))
            }
        } else if (formData.calculation_type === 'MONTHLY_CONTRIBUTION' && formData.monthly_contribution && formData.total_amount) {
            const monthsNeeded = parseFloat(formData.total_amount) / parseFloat(formData.monthly_contribution)
            if (monthsNeeded > 0) {
                const dueDate = new Date()
                dueDate.setMonth(dueDate.getMonth() + Math.ceil(monthsNeeded))
                setFormData(prev => ({ ...prev, due_date: dueDate.toISOString().split('T')[0] }))
            }
        }
    }, [formData.due_date, formData.monthly_contribution, formData.total_amount, formData.calculation_type])

    function calculateMonthsDifference(startDate: Date, endDate: Date): number {
        const startYear = startDate.getFullYear()
        const startMonth = startDate.getMonth()
        const endYear = endDate.getFullYear()
        const endMonth = endDate.getMonth()

        return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth));
    }

    const handleQuickDateSelect = (months: number) => {
        const dueDate = new Date()
        dueDate.setMonth(dueDate.getMonth() + months)
        handleInputChange("due_date", dueDate.toISOString().split("T")[0])
    }

    const handleQuickContributionSelect = (amount: number) => {
        const totalAmount = parseFloat(formData.total_amount)
        if (totalAmount && amount > totalAmount) {
            toast.error(`Monthly contribution cannot exceed total amount ($${totalAmount.toFixed(2)})`)
            return
        }
        handleInputChange("monthly_contribution", amount.toString())
    }

    const validateMonthlyContribution = (value: string) => {
        const contribution = parseFloat(value)
        const totalAmount = parseFloat(formData.total_amount)

        if (isNaN(contribution) || isNaN(totalAmount)) {
            return true
        }

        if (totalAmount && contribution > totalAmount) {
            toast.error(`Monthly contribution cannot exceed total amount ($${totalAmount.toFixed(2)})`)
            return false
        }
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!convexUser) {
            toast.error("User not authenticated")
            return
        }

        if (!formData.name || !formData.total_amount) {
            toast.error("Please fill in all required fields")
            return
        }

        if (formData.calculation_type === 'DUE_DATE' && !formData.due_date) {
            toast.error("Due date is required when calculating from due date")
            return
        }

        if (formData.calculation_type === 'MONTHLY_CONTRIBUTION' && !formData.monthly_contribution) {
            toast.error("Monthly contribution is required when calculating from monthly contribution")
            return
        }

        if (formData.monthly_contribution && !validateMonthlyContribution(formData.monthly_contribution)) {
            return
        }

        try {
            const submitData = {
                userId: convexUser._id,
                name: formData.name,
                note: formData.note,
                total_amount: formData.total_amount,
                monthly_contribution: formData.monthly_contribution,
                due_date: formData.due_date,
                calculation_type: formData.calculation_type,
                tracking_type: formData.tracking_type,
                linked_account_id: formData.linked_account_id,
                color: formData.color,
                emoji: formData.emoji,
                priority: formData.priority,
                image: formData.image,
                imageChanged: formData.imageChanged,
            }

            if (mode === "edit" && editingGoal) {
                const result = await updateGoalMutation({
                    ...submitData,
                    goalId: editingGoal.id,
                })
                onUpdateGoal(result as Goal)
                toast.success("Goal updated successfully")
            } else {
                const result = await createGoalMutation(submitData)
                onCreateGoal(result as Goal)
                toast.success("Goal created successfully")
            }
            onOpenChange(false)
        } catch (error) {
            console.error('Error saving goal:', error)
            toast.error("Failed to save goal. Please try again.")
        }
    }

    const handleInputChange = (field: string, value: string | number | null) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleMonthlyContributionChange = (value: string) => {
        if (value && !validateMonthlyContribution(value)) {
            return
        }
        handleInputChange("monthly_contribution", value)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setFormData((prev) => ({
            ...prev,
            image: file,
            imageChanged: true
        }))
    }

    const handleImageRemove = () => {
        setFormData((prev) => ({
            ...prev,
            image: null,
            imageChanged: true
        }))
    }

    const formatBalance = (balance?: number): string => {
        if (balance === null || balance === undefined) return "0.00"
        const numBalance = typeof balance === 'number' ? balance : parseFloat(balance)
        return isNaN(numBalance) ? "0.00" : numBalance.toFixed(2)
    }

    const isEditing = mode === 'edit'
    const isLoading = false // Convex mutations don't have isPending like TanStack Query

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                    <DialogTitle>
                        {isEditing ? 'Edit Goal' : 'Create New Goal'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update your financial goal details and track your progress.'
                            : 'Set up a new financial goal to track your progress and stay motivated.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Goal Name *</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Emergency Fund, Dream Vacation"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="emoji">Emoji</Label>
                            <Input
                                id="emoji"
                                placeholder="🎯"
                                value={formData.emoji}
                                onChange={(e) => handleInputChange("emoji", e.target.value)}
                                maxLength={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="color">Color</Label>
                            <Input
                                id="color"
                                type="color"
                                value={formData.color}
                                onChange={(e) => handleInputChange("color", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={formData.priority.toString()}
                                onValueChange={(value) => handleInputChange("priority", parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {priorityOptions.map((option, index) => (
                                        <SelectItem
                                            key={`priority-${option.value || index}`}
                                            value={option.value?.toString() || index.toString()}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">

                        <div className="space-y-2">
                            <Label htmlFor="image">
                                {isEditing ? 'Update Image' : 'Image'}
                            </Label>
                            {isEditing && editingGoal?.image && !formData.imageChanged && (
                                <div className="flex items-center gap-2 p-2 border rounded">
                                    <Image
                                        src={editingGoal.image}
                                        alt="Current goal image"
                                        className="w-12 h-12 object-cover rounded"
                                    />
                                    {/* <img
                                        src={editingGoal.image}
                                        alt="Current goal image"
                                        className="w-12 h-12 object-cover rounded"
                                    /> */}
                                    <span className="text-sm text-muted-foreground">Current image</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleImageRemove}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            )}
                        </div>
                        <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        {formData.imageChanged && formData.image === null && (
                            <p className="text-sm text-muted-foreground">Image will be removed</p>
                        )}
                        {formData.image && (
                            <p className="text-sm text-muted-foreground">New image selected: {formData.image.name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="note">Note</Label>
                        <Textarea
                            ref={noteRef}
                            id="note"
                            placeholder="Optional note about the goal"
                            value={formData.note}
                            onChange={(e) => handleInputChange("note", e.target.value)}
                        />
                    </div>

                    <Separator className="my-8" />

                    <div className="space-y-2">
                        <Label htmlFor="total_amount">Total Amount *</Label>
                        <Input
                            id="total_amount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.total_amount}
                            onChange={(e) => handleInputChange("total_amount", e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Calculation Method</Label>
                        <RadioGroup
                            value={formData.calculation_type}
                            onValueChange={(value) => handleInputChange("calculation_type", value)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="DUE_DATE" id="due_date" />
                                <Label htmlFor="due_date">Set due date (calculate monthly contribution)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="MONTHLY_CONTRIBUTION" id="monthly_contribution" />
                                <Label htmlFor="monthly_contribution">Set monthly contribution (calculate due date)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {formData.calculation_type === 'DUE_DATE' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Quick Date Selection</Label>
                                <div className="flex flex-wrap gap-2">
                                    {quickDateOptions.map((option) => (
                                        <Button
                                            key={option.months}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleQuickDateSelect(option.months)}
                                            className="flex items-center gap-1"
                                        >
                                            <Calendar className="h-3 w-3" />
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="due_date">Due Date *</Label>
                                <Input
                                    id="due_date"
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => handleInputChange("due_date", e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {formData.calculation_type === 'MONTHLY_CONTRIBUTION' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Quick Amount Selection</Label>
                                <div className="flex flex-wrap gap-2">
                                    {quickContributionAmounts.map((amount) => {
                                        const totalAmount = parseFloat(formData.total_amount)
                                        const isDisabled = !formData.total_amount || isNaN(totalAmount) || amount > totalAmount

                                        return (
                                            <Button
                                                key={amount}
                                                type="button"
                                                variant={isDisabled ? "secondary" : "outline"}
                                                size="sm"
                                                onClick={() => handleQuickContributionSelect(amount)}
                                                disabled={isDisabled}
                                                className="flex items-center gap-1"
                                            >
                                                $ {amount}
                                                {isDisabled && <AlertCircle className="h-3 w-3 ml-1" />}
                                            </Button>
                                        )
                                    })}
                                </div>
                                {formData.total_amount && !isNaN(parseFloat(formData.total_amount)) && (
                                    <p className="text-xs text-muted-foreground">
                                        Maximum contribution: ${parseFloat(formData.total_amount).toFixed(2)}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="monthly_contribution">Monthly Contribution *</Label>
                                <Input
                                    id="monthly_contribution"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={formData.total_amount || undefined}
                                    placeholder="0.00"
                                    value={formData.monthly_contribution}
                                    onChange={(e) => handleMonthlyContributionChange(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {formData.calculation_type === 'DUE_DATE' && formData.monthly_contribution && (
                        <div className="space-y-2">
                            <Label htmlFor="calculated_contribution">Calculated Monthly Contribution</Label>
                            <Input
                                id="calculated_contribution"
                                type="number"
                                value={formData.monthly_contribution}
                                readOnly
                                className="bg-muted"
                            />
                        </div>
                    )}

                    {formData.calculation_type === 'MONTHLY_CONTRIBUTION' && formData.due_date && (
                        <div className="space-y-2">
                            <Label htmlFor="calculated_date">Calculated Due Date</Label>
                            <Input
                                id="calculated_date"
                                type="date"
                                value={formData.due_date}
                                readOnly
                                className="bg-muted"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="tracking_type">Tracking Type</Label>
                        <Select
                            value={
                                formData.tracking_type === "MANUAL"
                                    ? "MANUAL"
                                    : formData.linked_account_id?.toString() || "MANUAL"
                            }
                            onValueChange={(value) => {
                                if (value === "MANUAL") {
                                    setFormData((prev) => ({
                                        ...prev,
                                        tracking_type: "MANUAL",
                                        linked_account_id: null,
                                    }))
                                } else {
                                    setFormData((prev) => ({
                                        ...prev,
                                        tracking_type: "LINKED_ACCOUNT",
                                        linked_account_id: value as Id<"accounts">,
                                    }))
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select tracking type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MANUAL">Manual Tracking</SelectItem>
                                {accounts.map((account, index) => (
                                    <SelectItem
                                        key={`account-${account.id || index}`}
                                        value={account.id?.toString() || index.toString()}
                                    >
                                        {account.name} ({account.account_type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedAccount && (
                        <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{selectedAccount.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedAccount.account_type}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Current Balance</p>
                                    <p className="font-semibold text-lg">${formatBalance(selectedAccount.balance)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-8">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : (isEditing ? 'Update Goal' : 'Create Goal')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}