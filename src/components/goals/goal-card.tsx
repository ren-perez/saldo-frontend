// components/goals/goal-card.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const GoalCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="goal-card"
        className={cn(
            "bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm overflow-hidden hover:shadow-lg transition-shadow",
            className
        )}
        {...props}
    />
))
GoalCard.displayName = "GoalCard"

const GoalCardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-0", className)} {...props} />
))
GoalCardHeader.displayName = "GoalCardHeader"

const GoalCardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 flex-1", className)} {...props} />
))
GoalCardContent.displayName = "GoalCardContent"

const GoalCardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
GoalCardFooter.displayName = "GoalCardFooter"

export { GoalCard, GoalCardHeader, GoalCardContent, GoalCardFooter }