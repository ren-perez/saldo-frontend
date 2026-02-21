"use client"

import Link from "next/link"
import { ArrowRight, Wallet, ArrowLeftRight, Target } from "lucide-react"

interface ActionCardsProps {
  unmatchedIncomeCount: number
  pendingTransferCount: number
  activeGoalCount: number
  pendingDistributionCount?: number
}

export function ActionCards({
  unmatchedIncomeCount,
  pendingTransferCount,
  activeGoalCount,
  pendingDistributionCount = 0,
}: ActionCardsProps) {
  const actions = [
    {
      id: "income-match",
      title: `${unmatchedIncomeCount} income to match`,
      href: "/income",
      icon: Wallet,
      accent: "bg-blue-500/15 text-blue-500",
      show: true,
    },
    {
      id: "pending-transfers",
      title: `${pendingTransferCount} pending transfers`,
      href: "/transfers-inbox",
      icon: ArrowLeftRight,
      accent: "bg-blue-500/15 text-blue-500",
      show: true,
    },
  ].filter((a) => a.show)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className="group flex items-center gap-2.5 rounded-lg border border-blue-600/30 bg-blue-600/10 px-3.5 py-2 transition-colors hover:border-foreground/40 hover:bg-foreground/20 sm:w-auto"
        >
          {/* Icon wrapper */}
          <div
            className={`
              flex size-7 shrink-0 items-center justify-center rounded-md
              ${action.accent}
              transition-colors
              group-hover:bg-foreground/60
              group-hover:text-background
            `}
          >
            <action.icon className="size-3.5" />
          </div>

          {/* Title */}
          <span className="text-sm font-medium text-foreground/85">
            {action.title}
          </span>

          {/* Arrow */}
          <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:text-foreground sm:ml-0" />
        </Link>
      ))}
    </div>
  )
}