"use client"

import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react"

export type Granularity = "daily" | "weekly" | "monthly" | "yearly"

interface DashboardContextValue {
  month: number
  year: number
  startDate: number
  endDate: number
  selectedDate: string | null
  granularity: Granularity
  periodOffset: number
  setMonth: (month: number) => void
  setYear: (year: number) => void
  handleMonthChange: (delta: number) => void
  goToToday: () => void
  setSelectedDate: (date: string | null) => void
  setGranularity: (g: Granularity) => void
  setPeriodOffset: (offset: number) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [granularity, setGranularity] = useState<Granularity>("monthly")
  const [periodOffset, setPeriodOffset] = useState(0)

  const { startDate, endDate } = useMemo(() => {
    switch (granularity) {
      case "yearly": {
        const start = new Date(year, 0, 1).getTime()
        const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
        return { startDate: start, endDate: end }
      }
      case "monthly": {
        const start = new Date(year, month, 1).getTime()
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
        return { startDate: start, endDate: end }
      }
      case "weekly": {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const weekStart = periodOffset * 7 + 1
        const weekEnd = Math.min(weekStart + 6, daysInMonth)
        const start = new Date(year, month, weekStart).getTime()
        const end = new Date(year, month, weekEnd, 23, 59, 59, 999).getTime()
        return { startDate: start, endDate: end }
      }
      case "daily": {
        const day = Math.min(periodOffset + 1, new Date(year, month + 1, 0).getDate())
        const start = new Date(year, month, day).getTime()
        const end = new Date(year, month, day, 23, 59, 59, 999).getTime()
        return { startDate: start, endDate: end }
      }
    }
  }, [month, year, granularity, periodOffset])

  const handleMonthChange = useCallback((delta: number) => {
    setMonth((prev) => {
      const newMonth = prev + delta
      if (newMonth < 0) {
        setYear((y) => y - 1)
        return 11
      }
      if (newMonth > 11) {
        setYear((y) => y + 1)
        return 0
      }
      return newMonth
    })
    setSelectedDate(null)
    setPeriodOffset(0)
  }, [])

  const goToToday = useCallback(() => {
    const today = new Date()
    setMonth(today.getMonth())
    setYear(today.getFullYear())
    setSelectedDate(null)
    setPeriodOffset(0)
  }, [])

  const handleSetGranularity = useCallback((g: Granularity) => {
    setGranularity(g)
    setPeriodOffset(0)
  }, [])

  return (
    <DashboardContext.Provider
      value={{
        month,
        year,
        startDate,
        endDate,
        selectedDate,
        granularity,
        periodOffset,
        setMonth,
        setYear,
        handleMonthChange,
        goToToday,
        setSelectedDate,
        setGranularity: handleSetGranularity,
        setPeriodOffset,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider")
  return ctx
}
