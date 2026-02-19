// components/goals/AchievementCard.tsx
import Link from "next/link"
import { Trophy } from "lucide-react"
import { EnhancedImage } from "@/components/enhanced-image"
import { Goal } from "@/types/goals"

interface AchievementCardProps {
    goal: Goal
    formatCurrency: (amount: number) => string
    formatDate: (dateString?: string) => string | null
}

export function AchievementCard({ goal, formatCurrency, formatDate }: AchievementCardProps) {
    const completedDate = goal.updatedAt
        ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(goal.updatedAt))
        : null

    return (
        <Link href={`/goals/${goal._id}`} className="block group">
            <div className="flex items-center gap-4 rounded-xl border bg-card text-card-foreground p-3 hover:shadow-md transition-shadow">
                {/* Thumbnail */}
                <div className="relative h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden">
                    {goal.image_url ? (
                        <EnhancedImage
                            src={goal.image_url}
                            alt={goal.name}
                            width={56}
                            height={56}
                            className="object-cover"
                        />
                    ) : (
                        <div
                            className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-600"
                        >
                            <span className="text-xl">{goal.emoji}</span>
                        </div>
                    )}
                    {/* Trophy overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trophy className="h-4 w-4 text-white" />
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-base">{goal.emoji}</span>
                        <h4 className="font-medium text-sm truncate">{goal.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(goal.total_amount)}
                        </span>
                        {completedDate && (
                            <span className="text-xs text-muted-foreground">
                                {completedDate}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}
