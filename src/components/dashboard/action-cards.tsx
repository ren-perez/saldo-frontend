"use client"

import Link from "next/link"
import { MoreHorizontal, Wallet, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

interface ActionCardsProps {
  unmatchedIncomeCount: number
  pendingTransferCount: number
  activeGoalCount: number
  pendingDistributionCount?: number
}

export function ActionCards({
  unmatchedIncomeCount,
  pendingTransferCount,
  activeGoalCount: _activeGoalCount,
  pendingDistributionCount: _pendingDistributionCount = 0,
}: ActionCardsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/income" className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <Wallet className="size-4" />
              Income match
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{unmatchedIncomeCount}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/transfers-inbox" className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <ArrowLeftRight className="size-4" />
              Pending transfers
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{pendingTransferCount}</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}