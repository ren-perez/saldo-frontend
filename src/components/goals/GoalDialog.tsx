// components/goals/GoalDialog.tsx
"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "../ui/textarea"
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { toast } from "sonner"
import {
    Calendar, AlertCircle,
    Loader2, HandCoins, CreditCard, Tag,
    ChevronRight, ChevronLeft, Check,
    Sparkles, ImageIcon
} from "lucide-react"
import type { Goal } from "@/types/goals"
import type { Id } from "../../../convex/_generated/dataModel"
import Image from "next/image"
import imageCompression from "browser-image-compression"
import { cn } from "@/lib/utils"
import { Separator } from "../ui/separator"


type ImageState =
    | { type: "original"; url: string }
    | { type: "new"; file: File; url: string }
    | { type: "removed" }

interface GoalDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreateGoal: (goal: Goal) => void
    onUpdateGoal: (goal: Goal) => void
    editingGoal?: Goal | null
    mode: 'create' | 'edit'
}

const GOAL_COLORS = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
    "#e11d48", "#84cc16", "#0ea5e9", "#a855f7", "#d946ef",
]

function getRandomColor(): string {
    return GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)]
}

function extractDominantColor(imageUrl: string): Promise<string> {
    return new Promise((resolve) => {
        const img = document.createElement("img")
        img.crossOrigin = "anonymous"
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")
                if (!ctx) { resolve(getRandomColor()); return }

                // Sample from center region for better results
                const sampleSize = 50
                canvas.width = sampleSize
                canvas.height = sampleSize
                ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

                const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data
                let r = 0, g = 0, b = 0, count = 0

                for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
                    // Skip very dark and very light pixels
                    const pr = data[i], pg = data[i + 1], pb = data[i + 2]
                    const brightness = (pr + pg + pb) / 3
                    if (brightness > 30 && brightness < 230) {
                        r += pr; g += pg; b += pb; count++
                    }
                }

                if (count === 0) { resolve(getRandomColor()); return }

                r = Math.round(r / count)
                g = Math.round(g / count)
                b = Math.round(b / count)

                // Boost saturation slightly for a more vibrant color
                const max = Math.max(r, g, b)
                const min = Math.min(r, g, b)
                const mid = (max + min) / 2
                if (mid > 0) {
                    const factor = 1.3
                    r = Math.min(255, Math.round(mid + (r - mid) * factor))
                    g = Math.min(255, Math.round(mid + (g - mid) * factor))
                    b = Math.min(255, Math.round(mid + (b - mid) * factor))
                }

                const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
                resolve(hex)
            } catch {
                resolve(getRandomColor())
            }
        }
        img.onerror = () => resolve(getRandomColor())
        img.src = imageUrl
    })
}

const STEPS = [
    { id: "basics", label: "Basics", icon: Sparkles },
    { id: "tracking", label: "Tracking", icon: CreditCard },
    { id: "amount", label: "Planning", icon: Calendar },
] as const

type StepId = typeof STEPS[number]["id"]

export function GoalDialog({
    open,
    onOpenChange,
    onCreateGoal,
    onUpdateGoal,
    editingGoal,
    mode,
}: GoalDialogProps) {
    const { convexUser } = useConvexUser()
    const [currentStep, setCurrentStep] = useState<StepId>("basics")
    const [formData, setFormData] = useState({
        name: "",
        note: "",
        total_amount: "",
        due_date: "",
        monthly_contribution: "",
        calculation_type: "DUE_DATE",
        tracking_type: "MANUAL",
        linked_account_id: null as Id<"accounts"> | null,
        linked_category_id: null as Id<"categories"> | null,
        color: "#3b82f6",
        emoji: "",
        priority: 3,
        image: null as File | null,
        imageChanged: false,
    })

    const [, setPreviewUrl] = useState<string | null>(null)
    const [, setPreviousImageUrl] = useState<string | null>(editingGoal?.image_url || null)
    const [imageState, setImageState] = useState<ImageState | null>(
        editingGoal?.image_url ? { type: "original", url: editingGoal.image_url } : null
    )
    const [isCompressing, setIsCompressing] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const noteRef = useRef<HTMLTextAreaElement>(null)

    // Load accounts, categories, and priority options using Convex
    const accounts = useQuery(
        convexUser ? api.goals.getGoalAccounts : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    ) || []
    const categories = useQuery(
        convexUser ? api.categories.getCategoriesWithGroups : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    ) || []
    const priorityOptions = useQuery(api.goals.getGoalPriorityOptions) || []

    // Mutations
    const createGoalMutation = useMutation(api.goals.createGoal)
    const updateGoalMutation = useMutation(api.goals.updateGoal)
    const getGoalImageUploadUrl = useAction(api.importActions.getGoalImageUploadUrl);

    // Get selected account details
    const selectedAccount = accounts.find(
        (account) => account._id.toString() === formData.linked_account_id
    )

    // Quick date options (in months from now)
    const quickDateOptions = [
        { label: "3 months", months: 3 },
        { label: "6 months", months: 6 },
        { label: "1 year", months: 12 },
    ]

    // Quick contribution amounts
    const quickContributionAmounts = [100, 500, 1000]


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
            setCurrentStep("basics")
            setFormData({
                name: editingGoal.name,
                note: editingGoal.note || "",
                total_amount: editingGoal.total_amount.toString(),
                due_date: editingGoal.due_date || "",
                monthly_contribution: editingGoal.monthly_contribution.toString(),
                calculation_type: editingGoal.calculation_type || "DUE_DATE",
                tracking_type: editingGoal.tracking_type || "MANUAL",
                linked_account_id: editingGoal.linked_account?._id || null,
                linked_category_id: editingGoal.linked_category?._id || null,
                color: editingGoal.color || "#3b82f6",
                emoji: editingGoal.emoji || "🎯",
                priority: editingGoal.priority || 3,
                image: null,
                imageChanged: false,
            })
            setPreviousImageUrl(editingGoal.image_url || null)
            setPreviewUrl(editingGoal.image_url || null)
            setImageState(
                editingGoal.image_url
                    ? { type: "original", url: editingGoal.image_url }
                    : null
            )
        } else if (open && mode === "create") {
            setCurrentStep("basics")
            setFormData({
                name: "",
                note: "",
                total_amount: "",
                due_date: "",
                monthly_contribution: "",
                calculation_type: "DUE_DATE",
                tracking_type: "MANUAL",
                linked_account_id: null,
                linked_category_id: null,
                color: getRandomColor(),
                emoji: "🎯",
                priority: 3,
                image: null,
                imageChanged: false,
            })
            setPreviewUrl(null)
            setImageState(null)
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

    const compressImage = async (file: File): Promise<File> => {
        // If file is already small, skip compression
        if (file.size < 0.5 * 1024 * 1024) {
            return file
        }

        const options = {
            maxSizeMB: 0.5, // Maximum file size in MB
            maxWidthOrHeight: 1920, // Maximum width or height
            useWebWorker: true,
            fileType: 'image/webp', // Convert to WebP for better compression
        }

        try {
            const compressedFile = await imageCompression(file, options)

            // Create a new File object with .webp extension
            const fileName = file.name.replace(/\.[^/.]+$/, '.webp')
            return new File([compressedFile], fileName, { type: 'image/webp' })
        } catch (error) {
            console.error('Error compressing image:', error)
            throw error
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!convexUser) {
            toast.error("User not authenticated");
            return;
        }

        if (!formData.name || !formData.total_amount) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsUploading(true);

        try {
            let imageUrl: string | undefined
            let goalId: Id<"goals">

            if (mode === "edit" && editingGoal) {
                goalId = editingGoal._id
            } else {
                toast.loading("Creating goal...", { id: "goal-save" });
                const newGoal = await createGoalMutation({
                    userId: convexUser._id,
                    name: formData.name,
                    note: formData.note,
                    total_amount: formData.total_amount,
                    monthly_contribution: formData.monthly_contribution,
                    due_date: formData.due_date,
                    calculation_type: formData.calculation_type,
                    tracking_type: formData.tracking_type,
                    linked_account_id: formData.linked_account_id,
                    linked_category_id: formData.linked_category_id,
                    color: formData.color,
                    emoji: formData.emoji,
                    priority: formData.priority,
                    image_url: undefined,
                });
                goalId = newGoal._id as Id<"goals">
            }

            // Handle image upload
            if (imageState?.type === "new") {
                toast.loading("Uploading image...", { id: "goal-save" });

                const compressedFile = await compressImage(imageState.file)

                const { uploadUrl, fileKey } = await getGoalImageUploadUrl({
                    userId: convexUser._id,
                    goalId: goalId,
                    fileName: compressedFile.name,
                    contentType: compressedFile.type,
                })

                await fetch(uploadUrl, {
                    method: "PUT",
                    body: compressedFile,
                    headers: { "Content-Type": compressedFile.type },
                })

                imageUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileKey}?v=${Date.now()}`

                toast.loading("Finalizing...", { id: "goal-save" });

                const updatedGoal = await updateGoalMutation({
                    goalId: goalId,
                    userId: convexUser._id,
                    name: formData.name,
                    note: formData.note,
                    total_amount: formData.total_amount,
                    monthly_contribution: formData.monthly_contribution,
                    due_date: formData.due_date,
                    calculation_type: formData.calculation_type,
                    tracking_type: formData.tracking_type,
                    linked_account_id: formData.linked_account_id,
                    linked_category_id: formData.linked_category_id,
                    color: formData.color,
                    emoji: formData.emoji,
                    priority: formData.priority,
                    image_url: imageUrl,
                });

                if (mode === "create") {
                    onCreateGoal(updatedGoal as Goal);
                } else {
                    onUpdateGoal(updatedGoal as Goal);
                }
            } else if (imageState?.type === "removed") {
                toast.loading("Updating goal...", { id: "goal-save" });

                const updatedGoal = await updateGoalMutation({
                    goalId: goalId,
                    userId: convexUser._id,
                    name: formData.name,
                    note: formData.note,
                    total_amount: formData.total_amount,
                    monthly_contribution: formData.monthly_contribution,
                    due_date: formData.due_date,
                    calculation_type: formData.calculation_type,
                    tracking_type: formData.tracking_type,
                    linked_account_id: formData.linked_account_id,
                    linked_category_id: formData.linked_category_id,
                    color: formData.color,
                    emoji: formData.emoji,
                    priority: formData.priority,
                    image_url: "",
                });

                onUpdateGoal(updatedGoal as Goal);
            } else if (mode === "edit") {
                toast.loading("Updating goal...", { id: "goal-save" });

                const updatedGoal = await updateGoalMutation({
                    goalId: goalId,
                    userId: convexUser._id,
                    name: formData.name,
                    note: formData.note,
                    total_amount: formData.total_amount,
                    monthly_contribution: formData.monthly_contribution,
                    due_date: formData.due_date,
                    calculation_type: formData.calculation_type,
                    tracking_type: formData.tracking_type,
                    linked_account_id: formData.linked_account_id,
                    linked_category_id: formData.linked_category_id,
                    color: formData.color,
                    emoji: formData.emoji,
                    priority: formData.priority,
                    image_url: imageState?.type === "original" ? imageState.url : undefined,
                });

                onUpdateGoal(updatedGoal as Goal);
            } else {
                // Create mode without image
                const newGoal = await createGoalMutation({
                    userId: convexUser._id,
                    name: formData.name,
                    note: formData.note,
                    total_amount: formData.total_amount,
                    monthly_contribution: formData.monthly_contribution,
                    due_date: formData.due_date,
                    calculation_type: formData.calculation_type,
                    tracking_type: formData.tracking_type,
                    linked_account_id: formData.linked_account_id,
                    linked_category_id: formData.linked_category_id,
                    color: formData.color,
                    emoji: formData.emoji,
                    priority: formData.priority,
                    image_url: undefined,
                });

                onCreateGoal(newGoal as Goal);
            }

            toast.success(mode === "edit" ? "Goal updated successfully" : "Goal created successfully", { id: "goal-save" });
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving goal:", error);
            toast.error("Failed to save goal. Please try again.", { id: "goal-save" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleInputChange = (field: string, value: string | number | null) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleMonthlyContributionChange = (value: string) => {
        if (value && !validateMonthlyContribution(value)) {
            return
        }
        handleInputChange("monthly_contribution", value)
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        setIsCompressing(true)

        try {
            // Compress the image
            const compressedFile = await compressImage(file)

            // Show size reduction info
            const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2)
            const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2)
            toast.success(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`)

            const url = URL.createObjectURL(compressedFile)
            setImageState({ type: "new", file: compressedFile, url })

            // Extract dominant color from the image
            const dominantColor = await extractDominantColor(url)
            setFormData(prev => ({ ...prev, color: dominantColor }))
        } catch (error) {
            console.error('Error processing image:', error)
            toast.error('Failed to process image. Please try again.')
        } finally {
            setIsCompressing(false)
        }

        e.target.value = ""
    }


    const handleImageRemove = useCallback(() => {
        if (!imageState) return

        if (imageState.type === "new") {
            // Remove new image, revert to original if exists
            setImageState(
                editingGoal?.image_url
                    ? { type: "original", url: editingGoal.image_url }
                    : null
            )
            // Assign a new random color since image is gone
            if (!editingGoal?.image_url) {
                setFormData(prev => ({ ...prev, color: getRandomColor() }))
            }
        } else if (imageState.type === "original") {
            // Mark original image for removal
            setImageState({ type: "removed" })
            setFormData(prev => ({ ...prev, color: getRandomColor() }))
        }
    }, [imageState, editingGoal?.image_url])

    const formatBalance = (balance?: number): string => {
        if (balance === null || balance === undefined) return "0.00"
        const numBalance = typeof balance === 'number' ? balance : parseFloat(balance)
        return isNaN(numBalance) ? "0.00" : numBalance.toFixed(2)
    }

    const isEditing = mode === 'edit'

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)
    const isFirstStep = currentStepIndex === 0
    const isLastStep = currentStepIndex === STEPS.length - 1

    const goNext = () => {
        if (!isLastStep) setCurrentStep(STEPS[currentStepIndex + 1].id)
    }
    const goBack = () => {
        if (!isFirstStep) setCurrentStep(STEPS[currentStepIndex - 1].id)
    }

    const canProceedFromBasics = formData.name.trim().length > 0
    const canProceedFromTracking = formData.tracking_type === "MANUAL"
        || (formData.tracking_type === "LINKED_ACCOUNT" && formData.linked_account_id)
        || (formData.tracking_type === "EXPENSE_CATEGORY" && formData.linked_category_id)
    const canSubmit = canProceedFromBasics && canProceedFromTracking && formData.total_amount

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col gap-0">
                <DialogHeader className="flex-shrink-0 pb-8">
                    <DialogTitle>
                        {isEditing ? 'Edit Goal' : 'Create New Goal'}
                    </DialogTitle>
                    {/* <DialogDescription>
                        {isEditing
                            ? 'Update your financial goal details.'
                            : 'Set up a new financial goal step by step.'
                        }
                    </DialogDescription> */}
                </DialogHeader>

                {/* Step indicators */}
                <div className="flex justify-center items-center gap-2 flex-shrink-0 lg:mx-20 py-1 bg-muted rounded-md">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon
                        const isActive = step.id === currentStep
                        const isCompleted = index < currentStepIndex
                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => setCurrentStep(step.id)}
                                disabled={
                                    (currentStep === "basics" && !canProceedFromBasics) ||
                                    (currentStep === "tracking" && !canProceedFromTracking)
                                }
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : isCompleted
                                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                                            : "text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="h-3 w-3" />
                                ) : (
                                    <Icon className="h-3 w-3" />
                                )}
                                {step.label}
                            </button>
                        )
                    })}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden pt-6">
                    <div className="flex-1 overflow-y-auto px-1 pb-2">
                        {/* Step 1: Basics */}
                        {currentStep === "basics" && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Goal Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Emergency Fund, Dream Vacation"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange("name", e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
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

                                {/* Image */}
                                <div className="space-y-2">
                                    <Label htmlFor="image" className="flex items-center gap-1.5">
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        {mode === "edit" ? 'Update Image' : 'Cover Image'}
                                    </Label>

                                    {imageState && imageState.type !== "removed" && (
                                        <div className="flex items-center gap-2 p-2 border rounded">
                                            <Image
                                                src={imageState.url}
                                                alt="Goal image preview"
                                                className="w-12 h-12 object-cover rounded"
                                                width={48}
                                                height={48}
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm text-muted-foreground">
                                                    {imageState.type === "new" ? "New image selected" : "Current image"}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div
                                                        className="w-3 h-3 rounded-full border"
                                                        style={{ backgroundColor: formData.color }}
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        Color extracted from image
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleImageRemove}
                                                disabled={isUploading}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    )}

                                    {imageState?.type === "removed" && (
                                        <p className="text-sm text-muted-foreground">
                                            Image will be removed
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="image"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            disabled={isCompressing || isUploading}
                                        />
                                        {isCompressing && (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
                                    </div>

                                    {isCompressing && (
                                        <p className="text-xs text-muted-foreground">
                                            Compressing image...
                                        </p>
                                    )}

                                    {!imageState && (
                                        <p className="text-xs text-muted-foreground">
                                            A color will be automatically picked from the image. No image? A random color is assigned.
                                        </p>
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
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Tracking */}
                        {currentStep === "tracking" && (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <Label>How do you want to track progress?</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            type="button"
                                            variant={formData.tracking_type === 'MANUAL' ? 'default' : 'outline'}
                                            className="h-auto p-3 flex flex-col items-center gap-2"
                                            onClick={() => setFormData((prev) => ({
                                                ...prev,
                                                tracking_type: "MANUAL",
                                                linked_account_id: null,
                                                linked_category_id: null,
                                            }))}
                                        >
                                            <HandCoins className="h-5 w-5" />
                                            <span className="text-xs">Manual</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formData.tracking_type === 'LINKED_ACCOUNT' ? 'default' : 'outline'}
                                            className="h-auto p-3 flex flex-col items-center gap-2"
                                            onClick={() => setFormData((prev) => ({
                                                ...prev,
                                                tracking_type: "LINKED_ACCOUNT",
                                                linked_category_id: null,
                                            }))}
                                        >
                                            <CreditCard className="h-5 w-5" />
                                            <span className="text-xs">From Account</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formData.tracking_type === 'EXPENSE_CATEGORY' ? 'default' : 'outline'}
                                            className="h-auto p-3 flex flex-col items-center gap-2"
                                            onClick={() => setFormData((prev) => ({
                                                ...prev,
                                                tracking_type: "EXPENSE_CATEGORY",
                                                linked_account_id: null,
                                            }))}
                                        >
                                            <Tag className="h-5 w-5" />
                                            <span className="text-xs">Expense-Linked</span>
                                        </Button>
                                    </div>
                                </div>

                                {formData.tracking_type === "LINKED_ACCOUNT" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="linked_account">Select Account *</Label>
                                        <Select
                                            value={formData.linked_account_id || ""}
                                            onValueChange={(value) => handleInputChange("linked_account_id", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose an account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.map((account, index) => (
                                                    <SelectItem
                                                        key={`account-${account._id}-${index}`}
                                                        value={account._id}
                                                    >
                                                        {account.name} ({account.account_type})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Goal progress will track the balance of this account
                                        </p>
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
                                    </div>
                                )}

                                {formData.tracking_type === "EXPENSE_CATEGORY" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="linked_category">Select Category *</Label>
                                        <Select
                                            value={formData.linked_category_id || ""}
                                            onValueChange={(value) => handleInputChange("linked_category_id", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat._id} value={cat._id}>
                                                        {cat.groupName ? `${cat.groupName} → ${cat.name}` : cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            All past and future expenses in this category will count toward this goal automatically.
                                        </p>
                                    </div>
                                )}

                                {formData.tracking_type === "MANUAL" && (
                                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                                        <HandCoins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        You&apos;ll manually add contributions to track progress toward this goal.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Amount & Timeline */}
                        {currentStep === "amount" && (
                            <div className="space-y-4">
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
                                        autoFocus
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
                                            <Label htmlFor="due_date" className="font-normal">Set due date (calculate monthly contribution)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="MONTHLY_CONTRIBUTION" id="monthly_contribution" />
                                            <Label htmlFor="monthly_contribution" className="font-normal">Set monthly contribution (calculate due date)</Label>
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
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.calculation_type === 'DUE_DATE' && formData.monthly_contribution && (
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Calculated Monthly Contribution</p>
                                        <p className="text-lg font-semibold">${formData.monthly_contribution}</p>
                                    </div>
                                )}

                                {formData.calculation_type === 'MONTHLY_CONTRIBUTION' && formData.due_date && (
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Calculated Due Date</p>
                                        <p className="text-lg font-semibold">
                                            {new Date(formData.due_date + "T00:00:00").toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <Separator className="my-4" />

                    {/* Navigation footer */}
                    <div className="flex items-center justify-between pt-2 flex-shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={isFirstStep ? () => onOpenChange(false) : goBack}
                            disabled={isUploading}
                            size="sm"
                        >
                            {isFirstStep ? (
                                "Cancel"
                            ) : (
                                <>
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Back
                                </>
                            )}
                        </Button>

                        <div className="flex items-center gap-1.5">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-1.5 rounded-full transition-all",
                                        i === currentStepIndex
                                            ? "w-6 bg-primary"
                                            : i < currentStepIndex
                                                ? "w-1.5 bg-primary/50"
                                                : "w-1.5 bg-muted-foreground/30"
                                    )}
                                />
                            ))}
                        </div>

                        {isLastStep ? (
                            <Button
                                type="submit"
                                disabled={isUploading || isCompressing || !canSubmit}
                                size="sm"
                            >
                                {isUploading
                                    ? (imageState?.type === "new" ? "Uploading..." : "Saving...")
                                    : (isEditing ? 'Update Goal' : 'Create Goal')
                                }
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={goNext}
                                disabled={
                                    (currentStep === "basics" && !canProceedFromBasics) ||
                                    (currentStep === "tracking" && !canProceedFromTracking)
                                }
                                size="sm"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
