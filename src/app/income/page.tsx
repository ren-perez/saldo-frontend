"use client"

import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { IncomeView } from "@/components/wealth/income-view"

export default function IncomePage() {
  return (
    <AppLayout>
      <InitUser />
      <div className="w-full min-w-0 mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
        <IncomeView />
      </div>
    </AppLayout>
  )
}
