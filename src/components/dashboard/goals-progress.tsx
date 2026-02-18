"use client"

import Link from "next/link"
import { ArrowRight, Plus, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { currencyExact } from "@/lib/format"

type GoalData = {
  _id: string
  name: string
  total_amount: number
  current_amount: number
  monthly_contribution: number
  due_date: string
  color: string
  emoji: string
  note?: string
  priority: number
  priority_label: string
  is_completed: boolean
  image_url?: string
}

interface GoalsProgressProps {
  goals: GoalData[]
}

const priorityStyles: Record<string, { badge: string; ring: string }> = {
  High: { badge: "bg-primary text-primary-foreground", ring: "border-primary/30" },
  Medium: { badge: "bg-secondary text-secondary-foreground", ring: "border-border" },
  Low: { badge: "bg-muted text-muted-foreground", ring: "border-border" },
}

export function GoalsProgress({ goals }: GoalsProgressProps) {
  const activeGoals = goals.filter((g) => !g.is_completed)
  const totalTarget = activeGoals.reduce((s, g) => s + g.total_amount, 0)
  const totalCurrent = activeGoals.reduce((s, g) => s + g.current_amount, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Goals Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">Goals</h2>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3 text-primary" />
              {overallPct}% overall
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 gap-1.5" asChild>
            <Link href="/goals">
              <Plus className="size-3" />
              New Goal
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1" asChild>
            <Link href="/goals">
              View all
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{currencyExact(totalCurrent)} saved</span>
          <span>{currencyExact(totalTarget)} total target</span>
        </div>
      </div>

      {/* Goal Cards */}
      {activeGoals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No goals yet. Create one to get started!</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {activeGoals.slice(0, 3).map((goal) => {
            const pct = goal.total_amount > 0 ? Math.round((goal.current_amount / goal.total_amount) * 100) : 0
            const remaining = goal.total_amount - goal.current_amount
            const styles = priorityStyles[goal.priority_label] ?? priorityStyles.Medium

            return (
              <Link key={goal._id} href={`/goals/${goal._id}`} className="group">
                <Card className={`h-full border ${styles.ring} transition-all hover:shadow-sm hover:border-primary/20`}>
                  <CardContent className="flex flex-col gap-3 p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      {goal.image_url ? (
                        <img src={goal.image_url} alt={goal.name} className="size-10 rounded-full object-cover" />
                      ) : (
                        <div
                          className="size-10 rounded-full flex items-center justify-center text-xl"
                          style={{ backgroundColor: goal.color, color: "#fff" }}
                        >
                          {goal.emoji}
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-0.5">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {goal.emoji} {goal.name}
                        </h3>
                        {goal.note && (
                          <p className="text-muted-foreground leading-relaxed line-clamp-1">{goal.note}</p>
                        )}
                      </div>

                      <Badge className={`shrink-0 ${styles.badge}`}>
                        {goal.priority_label}
                      </Badge>
                    </div>

                    {/* Progress */}
                    <div className="flex flex-col gap-1">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: goal.color,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
                        <span className="text-muted-foreground tabular-nums">
                          {currencyExact(remaining)} to go
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Saved</span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {currencyExact(goal.current_amount)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-muted-foreground">Monthly target</span>
                        <span className="font-medium tabular-nums text-muted-foreground">
                          {currencyExact(goal.monthly_contribution)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
