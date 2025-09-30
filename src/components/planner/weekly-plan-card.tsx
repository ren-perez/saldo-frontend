"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "lucide-react"

interface WeeklyPlanCardProps {
  week: number
  planned: number
  actual: number
  remaining: number
  onClick?: () => void
}

export function WeeklyPlanCard({ week, planned, actual, remaining, onClick }: WeeklyPlanCardProps) {
  const progressPercentage = planned > 0 ? (actual / planned) * 100 : 0
  const isOverBudget = actual > planned

  return (
    <Card
      className={`h-full transition-all duration-200 ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">Week {week}</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Planned:</span>
            <span className="font-medium">${planned.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Actual:</span>
            <span className={`font-medium ${isOverBudget ? "text-destructive" : ""}`}>${actual.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Remaining:</span>
            <span className={`font-medium ${remaining < 0 ? "text-destructive" : "text-emerald-600"}`}>
              ${Math.abs(remaining).toLocaleString()}
              {remaining < 0 && " over"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Progress
            value={Math.min(progressPercentage, 100)}
            className={`h-2 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className={isOverBudget ? "text-destructive font-medium" : ""}>{progressPercentage.toFixed(0)}%</span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
