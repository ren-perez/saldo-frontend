"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { currencyExact } from "@/lib/format"

export type GoalData = {
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

interface GoalCardProps {
  goal: GoalData
}

export function GoalCard({ goal }: GoalCardProps) {
  const pct =
    goal.total_amount > 0
      ? Math.round((goal.current_amount / goal.total_amount) * 100)
      : 0

  const hasImage = Boolean(goal.image_url)

  return (
    <Link href={`/goals/${goal._id}`} className="group block w-80 sm:w-96 flex-shrink-0">
      <div
        className={cn(
          "relative flex h-36 w-full overflow-hidden rounded-2xl shadow-md ring-1 ring-white/10",
          "transition-shadow duration-300 ease-out hover:shadow-xl hover:ring-white/20"
        )}
      >
        {/* Background */}
        {hasImage ? (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <div className="relative flex flex-1 backdrop-blur-md bg-white/10 dark:bg-black/20 min-w-0">
          <div className="flex flex-1 flex-col justify-between gap-2.5 p-4 min-w-0">

            {/* Top */}
            <div className="flex items-start gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0">{goal.emoji}</span>
                  <h3 className="text-sm font-bold leading-tight tracking-tight text-white drop-shadow-md truncate">
                    {goal.name}
                  </h3>
                </div>

                {/* Note with hover tooltip */}
                {goal.note && (
                  <div className="relative mt-0.5 min-w-0">
                    <p className="line-clamp-1 text-xs text-white/90 drop-shadow truncate">
                      {goal.note}
                    </p>
                    {/* Full note tooltip on hover */}
                    {/* <div
                      className={cn(
                        "pointer-events-none absolute left-0 top-full z-20 mt-1.5",
                        "w-56 rounded-lg bg-black/80 px-2.5 py-1.5 text-xs text-white/95 shadow-xl backdrop-blur-sm",
                        "opacity-0 translate-y-1 transition-all duration-200 ease-out",
                        "group-hover:opacity-100 group-hover:translate-y-0"
                      )}
                    >
                      {goal.note}
                    </div> */}
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 h-1 overflow-hidden rounded-full bg-black/20 backdrop-blur-sm ring-1 ring-white/20">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: "white",
                    boxShadow: `0 0 8px ${goal.color}`,
                  }}
                />
              </div>
              <span className="text-sm font-bold tabular-nums text-white drop-shadow-md">
                {pct}%
              </span>
            </div>

            {/* Bottom stats */}
            <div className="flex items-center gap-6 text-white/95 drop-shadow text-xs">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-white/70">
                    Saved
                  </span>
                </div>
                <span className="font-semibold tabular-nums">
                  {currencyExact(goal.current_amount)}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-white/70">
                    Monthly Target
                  </span>
                </div>
                <span className="font-semibold tabular-nums">
                  {currencyExact(goal.monthly_contribution)}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Link>
  )
}