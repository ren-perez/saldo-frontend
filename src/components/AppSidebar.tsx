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
    Settings,
    History,
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

const chatItems = [
    { href: "/history", label: "Chat History", icon: History },
    { href: "/settings", label: "Chat Settings", icon: Settings },
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

    useEffect(() => {
        if (isMobile) setOpenMobile(false)
    }, [pathname, isMobile, setOpenMobile])

    return (
        <Sidebar 
            collapsible="icon"
            variant="floating"
            className="group-data-[variant=floating]:border-sidebar-border"
        >
            <SidebarHeader>
                <div className="flex items-center gap-3 px-2 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                    <Link href="/" className="flex items-center gap-3 transition-transform active:scale-95">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
                            Saldo
                        </span>
                    </Link>
                </div>
            </SidebarHeader>

            <SidebarContent className="gap-4 px-2">
                {/* Planning Group */}
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Planning
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            {planningItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.href}
                                        tooltip={item.label}
                                        className="h-10 transition-all duration-200 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md"
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="size-[18px]" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                    {item.href === "/income" && plannedIncomeCount > 0 && (
                                        <SidebarMenuBadge className="bg-primary/15 text-primary font-bold group-data-[active=true]:bg-primary-foreground/20 group-data-[active=true]:text-primary-foreground">
                                            {plannedIncomeCount}
                                        </SidebarMenuBadge>
                                    )}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Tracking Group */}
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Tracking
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            {trackingItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.href}
                                        tooltip={item.label}
                                        className="h-10 transition-all duration-200 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="size-[18px]" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Chat & Config Group */}
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Assistant
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            {chatItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.href}
                                        tooltip={item.label}
                                        className="h-10 transition-all duration-200 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="size-[18px]" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/50 p-3">
                <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col">
                    <div className="flex items-center gap-3 group-data-[collapsible=icon]:contents">
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "size-8 rounded-lg ring-1 ring-sidebar-border",
                                },
                            }}
                        />
                        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                            <span className="text-xs font-semibold text-foreground truncate max-w-[100px]">
                                {convexUser?.name || "Account"}
                            </span>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}