export type DailyTx = { description: string; amount: number; category?: string }
export type DailyStats = { income: number; expenses: number; goals: number; txs?: DailyTx[] }
export type PlannedIncome = { _id: string; expected_date: string; expected_amount: number; label: string }
export type DayCell = { dayNum: number; dateKey: string; stats: DailyStats }

export const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export const monthShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export const MIN_LABEL_PCT = 24

export const SUBSCRIPTIONS = [
  { name: "Spotify", cadence: "Monthly", amount: 9.99 },
  { name: "Claude.ai", cadence: "Monthly", amount: 20.00 },
  { name: "ChatGPT", cadence: "Monthly", amount: 20.00 },
  { name: "Netflix", cadence: "Monthly", amount: 17.99 },
  { name: "iCloud+", cadence: "Monthly", amount: 2.99 },
  { name: "Amazon Prime", cadence: "Yearly", amount: 139.00 },
]
