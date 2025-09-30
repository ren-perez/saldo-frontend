"use client"

import { useState } from "react"
// import { MonthlyOverviewCard } from "@/components/planner/monthly-overview-card"
// import { WeeklyPlanCard } from "@/components/planner/weekly-plan-card"
// import { WeekDetailModal } from "@/components/planner/week-detail-modal"
// import { mockWeeklyPlans } from "@/lib/mock-data"

export default function PlannerPage() {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  const handleWeekClick = (week: number) => {
    setSelectedWeek(week)
  }

  const handleCloseModal = () => {
    setSelectedWeek(null)
  }

//   const selectedWeekData = selectedWeek ? mockWeeklyPlans.find((w) => w.week === selectedWeek) : null

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground text-balance">Monthly Plan – September 2025</h1>
        <p className="text-muted-foreground mt-2 text-pretty">
          Test 3 category modes: Spending (track vs spend), Commitment (reserve → release), Goal (save until target)
        </p>
      </div>

      {/* Grid Layout as specified in requirements */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Monthly Overview - Takes up 2 columns on medium screens, 1 on large */}
        <div className="md:col-span-2 lg:col-span-1 lg:row-span-2">
          {/* <MonthlyOverviewCard /> */}
        </div>

        {/* {mockWeeklyPlans.map((weekPlan) => (
          <WeeklyPlanCard
            key={weekPlan.week}
            week={weekPlan.week}
            planned={weekPlan.planned}
            actual={weekPlan.actual}
            remaining={weekPlan.remaining}
            onClick={() => handleWeekClick(weekPlan.week)}
          />
        ))} */}
      </div> 

      {/* Week Detail Modal */}
      {/* {selectedWeekData && (
        <WeekDetailModal isOpen={!!selectedWeek} onClose={handleCloseModal} weekData={selectedWeekData} />
      )} */}
    </div>
  )
}
