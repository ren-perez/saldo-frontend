import type { DailyTx } from "./types"

export function formatCompact(amount: number): string {
  if (amount === 0) return ""
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`
  return Math.round(amount).toString()
}

export function hasSubscriptions(txs?: DailyTx[]) {
  return txs?.some(tx => tx.category === "Software & Tools" || tx.category === "Media")
}
