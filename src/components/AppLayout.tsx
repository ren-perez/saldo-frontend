// src/components/AppLayout.tsx
"use client"

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { AppSidebar } from "./AppSidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react"

interface AppLayoutProps {
    children: React.ReactNode
}

function getFormattedDate() {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(new Date())
}

export default function AppLayout({ children }: AppLayoutProps) {
    const [today, setToday] = useState(getFormattedDate)

    useEffect(() => {
        const now = new Date()
        const msUntilMidnight =
            new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
            now.getTime()

        const timer = setTimeout(() => {
            setToday(getFormattedDate())
        }, msUntilMidnight)

        return () => clearTimeout(timer)
    }, [today])

    return (
        <>
            <SignedIn>
                <AppSidebar />
                <SidebarInset>
                    {/* <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4"> */}
                    <header className="sticky top-0 z-50 w-full flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                        {/* <SidebarTrigger className="-ml-1" /> */}
                        <SidebarTrigger className="ml-3 mr-2" />
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex flex-1 items-center justify-between">
                            <h1 className="text-lg font-semibold pl-4">Saldo</h1>
                            <div className="text-sm text-gray-500 font-medium pr-6">
                                {today}
                            </div>
                        </div>
                    </header>
                    <main className="flex flex-1 flex-col gap-4 p-4">
                        {children}
                    </main>
                </SidebarInset>
            </SignedIn>
            <SignedOut>
                <SidebarInset>
                    <div className="min-h-screen flex items-center justify-center bg-background">
                        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8">
                            <div className="text-center">
                                <h1 className="text-3xl font-bold text-foreground mb-4">
                                    Saldo
                                </h1>
                                <p className="text-muted-foreground mb-8">
                                    Import and manage your bank transactions with ease...
                                </p>
                                <SignInButton mode="modal">
                                    <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors">
                                        Get Started - Sign In
                                    </button>
                                </SignInButton>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Secure authentication powered by Clerk
                                </p>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SignedOut>

        </>
    )
}