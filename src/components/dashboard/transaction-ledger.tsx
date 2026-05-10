"use client"

import { currencyExact } from "@/lib/format"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TransactionLedger({ txs }: { txs: any[] }) {
  void txs
  const cleanDescription = (desc: string) => {
    return desc
      .replace(/^(Debit Card Purchase - |Digital Card Purchase - )/i, "")
      .replace(/^Withdrawal from /i, "")
      .replace(/^Zelle money sent to /i, "Zelle → ")
      .replace(/^Zelle money received from /i, "Zelle ← ")
  }

  return (
    <div className="flex flex-col bg-muted/20 rounded-lg p-2 gap-1">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {txs.map((tx: any, i: number) => (
        <div key={i} className="flex items-baseline gap-3 py-1.5 border-b border-border/40 last:border-0">
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-8">{tx.date}</span>
          <span className="flex-1 text-[11px] text-foreground leading-tight truncate">
            {cleanDescription(tx.description)}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {tx.account}
          </span>
          <span className="text-[11px] font-medium tabular-nums shrink-0 text-right min-w-[60px]">
            {currencyExact(tx.amount)}
          </span>
        </div>
      ))}
    </div>
  )
}
