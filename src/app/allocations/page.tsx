"use client"

import { useState } from "react"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { AllocationsView } from "@/components/allocation/allocations-view"

export default function AllocationsPage() {
  const [open, setOpen] = useState(true)
  return (
    <AppLayout>
      <InitUser />
      <AllocationsView open={open} onOpenChange={setOpen} />
    </AppLayout>
  )
}
