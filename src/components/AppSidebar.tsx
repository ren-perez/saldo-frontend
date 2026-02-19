"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import { UserButton } from "@clerk/nextjs"
import { ThemeToggle } from "./theme-toggle"
import {
    Home,
    Landmark,
    Target,
    CreditCard,
    Tag,
    DollarSign,
    FileSpreadsheet,
} from "lucide-react"

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    // { href: "/review", label: "Review", icon: Lightbulb },
    { href: "/income", label: "Income", icon: DollarSign },
    { href: "/goals", label: "Goals", icon: Target },
    // { href: "/goals/history", label: "Contribution History", icon: History },
    // { href: "/goals/analytics", label: "Goal Analytics", icon: BarChart3 },
    // { href: "/allocations", label: "Allocations", icon: PieChart },

    { href: "/accounts", label: "Accounts", icon: Landmark },
    { href: "/transactions", label: "Transactions", icon: CreditCard },
    { href: "/categories", label: "Categories", icon: Tag },
    { href: "/presets", label: "Presets", icon: FileSpreadsheet },
    // { href: "/import-csv", label: "Import CSV", icon: Upload },
    // { href: "/imports", label: "Import History", icon: FileText },
]

export function AppSidebar() {
    const pathname = usePathname()
    const { setOpenMobile, isMobile } = useSidebar()

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
                            {navItems.map((item) => {
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

                {/* <AccountsSidebarGroup /> */}
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