// src/app/income/page.tsx
"use client"

import { AllocationsView } from "@/components/allocation/allocations-view"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IncomeTimeline } from "@/components/wealth/income-timeline"

export default function IncomePage() {
  return (
    <AppLayout>
      <InitUser />
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Income</h1>
          <p className="text-muted-foreground">Track your income sources and manage allocation rules</p>
        </div>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="allocations">Allocation Rules</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <IncomeTimeline />
          </TabsContent>
          <TabsContent value="allocations" className="mt-4">
            <AllocationsView />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
