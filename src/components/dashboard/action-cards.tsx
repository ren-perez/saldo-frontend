"use client"

import Link from "next/link"
import { ArrowRight, Wallet, ArrowLeftRight, Target } from "lucide-react"

interface ActionCardsProps {
  unmatchedIncomeCount: number
  pendingTransferCount: number
  activeGoalCount: number
}

export function ActionCards({ unmatchedIncomeCount, pendingTransferCount, activeGoalCount }: ActionCardsProps) {
  const actions = [
    {
      title: `${unmatchedIncomeCount} income to match`,
      href: "/income",
      icon: Wallet,
      accent: "bg-primary/10 text-primary",
    },
    {
      title: `${pendingTransferCount} pending transactions`,
      href: "/transfers-inbox",
      icon: ArrowLeftRight,
      accent: "bg-warning/10 text-warning-foreground",
    },
    {
      title: `${activeGoalCount} goals on track`,
      href: "/goals",
      icon: Target,
      accent: "bg-success/10 text-success",
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 transition-colors hover:border-primary/30 hover:bg-accent"
        >
          <div className={`flex size-7 shrink-0 items-center justify-center rounded-md ${action.accent}`}>
            <action.icon className="size-3.5" />
          </div>
          <span className="text-sm font-medium text-foreground">{action.title}</span>
          <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      ))}
    </div>
  )
}
