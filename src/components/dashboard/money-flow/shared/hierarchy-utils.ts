export function cleanFlowId(s: string): string {
  return String(s).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
}

export function buildFlowKey(...parts: string[]): string {
  return parts.map(cleanFlowId).join("-")
}

export function formatAmt(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1000) return "$" + (abs / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return "$" + Math.round(abs).toLocaleString()
}

export function compactCurrency(v: number): string {
  if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1) + "M"
  if (v >= 1_000) return "$" + (v / 1_000).toFixed(1) + "k"
  return "$" + Math.round(v)
}
