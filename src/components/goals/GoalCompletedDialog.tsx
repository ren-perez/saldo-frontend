// components/goals/GoalCompletedDialog.tsx
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Goal } from "@/types/goals"

interface GoalCompletedDialogProps {
    goal: Goal
    open: boolean
    onOpenChange: (open: boolean) => void
    formatCurrency: (amount: number) => string
}

export function GoalCompletedDialog({
    goal,
    open,
    onOpenChange,
    formatCurrency
}: GoalCompletedDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm border-none shadow-2xl overflow-hidden p-0">
                <DialogTitle className="sr-only">Goal Achieved</DialogTitle>
                {/* Sparkle background */}
                <div className="relative flex flex-col items-center text-center px-8 pt-12 pb-8">
                    {/* Floating sparkles — CSS animated */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                        {[...Array(12)].map((_, i) => (
                            <span
                                key={i}
                                className="absolute block rounded-full opacity-0 animate-[sparkle_2.4s_ease-in-out_infinite]"
                                style={{
                                    width: `${4 + (i % 3) * 3}px`,
                                    height: `${4 + (i % 3) * 3}px`,
                                    left: `${8 + (i * 7.5) % 85}%`,
                                    top: `${10 + ((i * 13) % 70)}%`,
                                    animationDelay: `${i * 0.2}s`,
                                    background: i % 2 === 0
                                        ? 'oklch(0.75 0.15 85)' // gold
                                        : 'oklch(0.8 0.12 160)' // teal
                                }}
                            />
                        ))}
                    </div>

                    {/* Emoji */}
                    <div className="relative text-6xl mb-6 animate-[pop_0.5s_ease-out]">
                        {goal.emoji}
                    </div>

                    {/* Heading */}
                    <h2 className="text-2xl font-bold tracking-tight mb-2">
                        Goal Achieved
                    </h2>

                    {/* Message */}
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-[260px]">
                        You did it. Every step counted, and here you are.
                    </p>

                    {/* Goal info */}
                    <div className="w-full rounded-lg bg-muted/50 dark:bg-muted/30 py-3 px-4 mb-8 space-y-1">
                        <p className="font-semibold text-base">{goal.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {formatCurrency(goal.total_amount)}
                        </p>
                    </div>

                    <Button
                        onClick={() => onOpenChange(false)}
                        className="w-full"
                        size="lg"
                    >
                        Done
                    </Button>
                </div>

                {/* Keyframe styles */}
                <style>{`
                    @keyframes sparkle {
                        0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
                        30% { opacity: 0.9; transform: scale(1) translateY(-8px); }
                        70% { opacity: 0.5; transform: scale(0.8) translateY(-16px); }
                    }
                    @keyframes pop {
                        0% { transform: scale(0.3); opacity: 0; }
                        60% { transform: scale(1.15); opacity: 1; }
                        100% { transform: scale(1); }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    )
}
