// src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server"
import { UserButton } from "@clerk/nextjs"
import InitUser from "@/components/InitUser"

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        Please <a href="/sign-in" className="underline">sign in</a>.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <InitUser /> {/* <-- client mutation runs here */}
      <UserButton afterSignOutUrl="/" />
      <h1 className="text-2xl font-bold mt-4">Welcome to your dashboard 🎉</h1>
      <p className="text-gray-500">Empty state for now</p>
    </div>
  )
}
