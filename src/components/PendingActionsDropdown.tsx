"use client"

import Link from "next/link"
import { Bell, Wallet, ArrowLeftRight } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function PendingActionsDropdown() {
  const { convexUser } = useConvexUser()

  const incomeSummary = useQuery(
    convexUser ? api.incomePlans.getIncomeSummary : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const potentialTransfers = useQuery(
    convexUser ? api.transfers.getPotentialTransfers : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )

  const unmatchedIncomeCount = incomeSummary?.thisMonth.plannedCount ?? 0
  const pendingTransferCount = potentialTransfers?.length ?? 0

  const actions = [
    {
      id: "income-match",
      label: `${unmatchedIncomeCount} income to match`,
      href: "/income",
      icon: Wallet,
      count: unmatchedIncomeCount,
    },
    {
      id: "pending-transfers",
      label: `${pendingTransferCount} pending transfers`,
      href: "/transfers-inbox",
      icon: ArrowLeftRight,
      count: pendingTransferCount,
    },
  ]

  const totalCount = actions.reduce((sum, a) => sum + a.count, 0)
  const hasActions = totalCount > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label="Pending actions"
        >
          <Bell className="size-4" />
          {hasActions && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-semibold text-white leading-none">
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Pending actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {hasActions ? (
          actions
            .filter((a) => a.count > 0)
            .map((action) => (
              <DropdownMenuItem key={action.id} asChild>
                <Link href={action.href} className="flex items-center gap-2.5 cursor-pointer">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-500">
                    <action.icon className="size-3" />
                  </div>
                  <span className="text-sm">{action.label}</span>
                </Link>
              </DropdownMenuItem>
            ))
        ) : (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            All caught up
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
