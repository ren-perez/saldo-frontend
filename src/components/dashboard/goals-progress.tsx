"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { GoalCard, type GoalData } from "../GoalCard"

interface GoalsProgressProps {
  goals: GoalData[]
}

export function GoalsProgress({ goals }: GoalsProgressProps) {
  const activeGoals = goals.filter((g) => !g.is_completed)
  const totalTarget = activeGoals.reduce((s, g) => s + g.total_amount, 0)
  const totalCurrent = activeGoals.reduce((s, g) => s + g.current_amount, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  const formatCompactCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-foreground shrink-0 leading-none">Goals</h2>

        {/* Overall progress bar */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatCompactCurrency(totalCurrent)} / {formatCompactCurrency(totalTarget)} goal
          </span>

          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${overallPct}%` }}
            />
          </div>

          <span className="text-xs font-semibold text-foreground whitespace-nowrap tabular-nums">
            {overallPct}%
          </span>

        </div>

        {/* View all */}
        <Button variant="ghost" size="sm" className="h-7 gap-1 shrink-0" asChild>
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
            {activeGoals.map((goal) => (
              <CarouselItem
                key={goal._id}
                // Fixed width — no responsive basis. The card itself is w-72.
                // CarouselItem needs to match so there's no extra stretch.
                className="pl-4 basis-auto"
              >
                <GoalCard goal={goal} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  )
}