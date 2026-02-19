"use client"

import Link from "next/link"
import { ArrowRight, Calendar, Plus, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
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

export function GoalsProgress({ goals }: GoalsProgressProps) {
  const activeGoals = goals.filter((g) => !g.is_completed)
  const totalTarget = activeGoals.reduce((s, g) => s + g.total_amount, 0)
  const totalCurrent = activeGoals.reduce((s, g) => s + g.current_amount, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  // helper to format thousands like $1.7k
  const formatCompactCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Header */}

      <div className="flex justify-between items-center gap-6">
        <h2 className="text-base font-semibold text-foreground">Goals</h2>
        {/* Left: Saved */}
        <div className="hidden sm:inline text-sm text-muted-foreground whitespace-nowrap">
          {formatCompactCurrency(totalCurrent)} saved
        </div>

        {/* Center: Progress bar + % */}
        <div className="hidden flex-1 sm:flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {overallPct}%
          </span>
        </div>

        {/* Right: Total */}
        <div className="hidden sm:inline text-sm text-muted-foreground whitespace-nowrap">
          {formatCompactCurrency(totalTarget)} total
        </div>

        {/* Far Right: Action */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1"
          asChild
        >
          <Link href="/goals">
            View all
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>


      {/* Goal Cards Carousel */}
      {activeGoals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No goals yet. Create one to get started!
        </p>
      ) : (
        <Carousel
          opts={{ align: "start", dragFree: true }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {activeGoals.map((goal) => {
              const pct =
                goal.total_amount > 0
                  ? Math.round((goal.current_amount / goal.total_amount) * 100)
                  : 0
              const daysUntil = goal.due_date
                ? Math.ceil(
                  (new Date(goal.due_date).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
                )
                : null
              const hasImage = Boolean(goal.image_url)

              return (
                <CarouselItem
                  key={goal._id}
                  // 1 card on mobile, 2 on sm, 3 on lg
                  className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
                >
                  <Link href={`/goals/${goal._id}`} className="group block">
                    <div
                      className={cn(
                        "relative flex h-36 overflow-hidden rounded-2xl shadow-md ring-1 ring-white/10",
                        "transition-shadow duration-300 ease-out hover:shadow-xl hover:ring-white/20"
                      )}
                    >
                      {/* Background */}
                      {hasImage ? (
                        <div className="absolute inset-0">
                          <img
                            src={goal.image_url}
                            alt={goal.name}
                            className="h-full w-full object-cover"
                            style={{
                              filter: "blur(40px) brightness(0.8)",
                              transform: "scale(1.1)",
                            }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(135deg, ${goal.color}60 0%, ${goal.color}30 100%)`,
                              mixBlendMode: "multiply",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(135deg, ${goal.color}40 0%, ${goal.color}20 100%)`,
                          }}
                        />
                      )}

                      {/* Left image strip */}
                      {hasImage && (
                        <div className="relative w-32 flex-shrink-0 overflow-hidden">
                          <img
                            src={goal.image_url}
                            alt={goal.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 z-10 bg-black/0 transition-colors duration-300 group-hover:bg-black/10 pointer-events-none" />

                      {/* Content */}
                      <div className="relative flex flex-1 backdrop-blur-md bg-white/10 dark:bg-black/20">
                        <div className="flex flex-1 flex-col justify-between gap-2.5 p-4">
                          {/* Top */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div
                                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-lg shadow backdrop-blur-sm"
                                style={{
                                  backgroundColor: `${goal.color}30`,
                                  color: "white",
                                  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                                }}
                              >
                                {goal.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold leading-tight tracking-tight text-white drop-shadow-md">
                                  {goal.name}
                                </h3>
                                {goal.note && (
                                  <p className="mt-0.5 line-clamp-1 text-xs text-white/90 drop-shadow">
                                    {goal.note}
                                  </p>
                                )}
                              </div>
                            </div>
                            {goal.priority_label && (
                              <Badge
                                className={cn(
                                  "shrink-0 rounded-lg border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm",
                                  goal.priority === 1 && "border-red-300/50 bg-red-500/30"
                                )}
                              >
                                {goal.priority_label}
                              </Badge>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-3">
                            <div className="relative flex-1 h-2 overflow-hidden rounded-full bg-black/20 backdrop-blur-sm ring-1 ring-white/20">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: "white",
                                  boxShadow: `0 0 8px ${goal.color}`,
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold tabular-nums text-white drop-shadow-md">
                                {pct}%
                              </span>
                              {pct >= 75 && (
                                <TrendingUp className="size-3.5 text-white drop-shadow" />
                              )}
                            </div>
                          </div>

                          {/* Bottom stats */}
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-4 text-white/95 drop-shadow">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-medium uppercase tracking-wider text-white/70">
                                  Saved
                                </span>
                                <span className="font-semibold tabular-nums">
                                  {currencyExact(goal.current_amount)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-medium uppercase tracking-wider text-white/70">
                                  Monthly
                                </span>
                                <span className="font-semibold tabular-nums">
                                  {currencyExact(goal.monthly_contribution)}
                                </span>
                              </div>
                            </div>

                            {daysUntil !== null && (
                              <div
                                className={cn(
                                  "flex items-center gap-1 rounded-lg bg-white/20 backdrop-blur-sm px-2 py-1 text-[10px] font-semibold text-white drop-shadow",
                                  daysUntil <= 30 && "bg-orange-500/40"
                                )}
                              >
                                <Calendar className="size-3" />
                                {daysUntil <= 30
                                  ? daysUntil <= 0
                                    ? "Due"
                                    : `${daysUntil}d`
                                  : new Date(goal.due_date!).toLocaleDateString("en-US", {
                                    month: "short",
                                  })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              )
            })}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  )
}