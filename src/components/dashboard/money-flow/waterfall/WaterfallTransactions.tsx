"use client"

import { currencyExact } from "@/lib/format"
import type { FlowTransaction } from "../shared/types"

const DEPTH_PX = 12

interface WaterfallTransactionsProps {
  transactions: FlowTransaction[]
  depth: number
  type: "income" | "expense"
}

export function WaterfallTransactions({ transactions, depth, type }: WaterfallTransactionsProps) {
  if (transactions.length === 0) return null

  return (
    <div style={{ paddingLeft: depth * DEPTH_PX }}>
      {transactions.map((tx, i) => (
        <div
          key={i}
          className="flex items-baseline gap-2 py-1.5 px-1 border-b border-border/20 last:border-0"
        >
          <span className="text-[10px] text-muted-foreground/60 shrink-0 w-[72px] tabular-nums">{tx.date}</span>
          <span className="flex-1 text-[11px] text-muted-foreground truncate">{tx.description}</span>
          <span
            className={
              "text-[11px] font-medium tabular-nums shrink-0 " +
              (type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/80")
            }
          >
            {type === "income" ? "+" : ""}{currencyExact(Math.abs(tx.amount))}
          </span>
        </div>
      ))}
    </div>
  )
}
