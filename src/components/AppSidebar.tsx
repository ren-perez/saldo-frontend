"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo } from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import { UserButton } from "@clerk/nextjs"
import { ThemeToggle } from "./theme-toggle"
import { useConvexUser } from "@/hooks/useConvexUser"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import {
    Home,
    Landmark,
    Target,
    CreditCard,
    Tag,
    DollarSign,
    FileSpreadsheet,
} from "lucide-react"

const planningItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/income", label: "Income", icon: DollarSign },
    { href: "/goals", label: "Goals", icon: Target },
]

const trackingItems = [
    { href: "/accounts", label: "Accounts", icon: Landmark },
    { href: "/transactions", label: "Transactions", icon: CreditCard },
    { href: "/categories", label: "Categories", icon: Tag },
    { href: "/presets", label: "Presets", icon: FileSpreadsheet },
]

export function AppSidebar() {
    const pathname = usePathname()
    const { setOpenMobile, isMobile } = useSidebar()
    const { convexUser } = useConvexUser()

    const plans = useQuery(
        api.incomePlans.listIncomePlans,
        convexUser ? { userId: convexUser._id } : "skip"
    )
    const plannedIncomeCount = useMemo(
        () => (plans ?? []).filter((p) => p.status === "planned").length,
        [plans]
    )

    // Close mobile sidebar when pathname changes
    useEffect(() => {
        if (isMobile) {
            setOpenMobile(false)
        }
    }, [pathname, isMobile, setOpenMobile])

    return (
        <Sidebar collapsible="icon"
            className="border-none bg-transparent"
            variant="floating">
            <SidebarHeader className="border-none">
                <div className="flex items-center justify-between group-data-[collapsible=icon]:px-1 px-2 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Financial-themed SVG icon - clickable and properly sized */}
                        <Link href="/" className="flex-shrink-0">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="text-primary hover:opacity-80 transition-opacity group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6"
                            >
                                <defs>
                                    <linearGradient id="financialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                    stroke="url(#financialGradient)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </Link>
                        <Link href="/" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity group-data-[collapsible=icon]:hidden truncate">
                            Saldo
                        </Link>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="flex-1 overflow-y-auto">
                <SidebarGroup>
                    <SidebarGroupLabel>Planning</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-1">
                            {planningItems.map((item) => {
                                const IconComponent = item.icon
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.href}
                                            tooltip={item.label}
                                        >
                                            <Link href={item.href}>
                                                <IconComponent className="w-4 h-4" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                        {item.href === "/income" && plannedIncomeCount > 0 && (
                                            <SidebarMenuBadge>{plannedIncomeCount}</SidebarMenuBadge>
                                        )}
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Tracking</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-1">
                            {trackingItems.map((item) => {
                                const IconComponent = item.icon
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.href}
                                            tooltip={item.label}
                                        >
                                            <Link href={item.href}>
                                                <IconComponent className="w-4 h-4" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t mt-auto">
                {/* Expanded state footer */}
                <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: "h-8 w-8",
                            },
                        }}
                    />
                    <ThemeToggle />
                </div>

                {/* Collapsed state footer - vertical stack */}
                <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-3">
                    <ThemeToggle />
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: "h-8 w-8",
                            },
                        }}
                    />
                </div>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}