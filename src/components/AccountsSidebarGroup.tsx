"use client"

import Link from "next/link"
import { Loader2, AlertCircle } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useConvexUser } from "@/hooks/useConvexUser"
import { useState } from "react"

export function AccountsSidebarGroup() {
    const { convexUser } = useConvexUser()
    const accounts = useQuery(
        convexUser ? api.accounts.listAccounts : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    )
    const [open, setOpen] = useState(false)

    // Format currency for display
    const currencyLocales: Record<string, string> = {
        USD: 'en-US',
        EUR: 'de-DE',
        PEN: 'es-PE',
        // add others as needed
    };

    const formatCurrency = (amount: number, currency: string): string => {
        const locale =
            currencyLocales[currency.toUpperCase()] || "en-US"

        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency.toUpperCase(),
            minimumFractionDigits: 2,
        }).format(amount)
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Accounts</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {!accounts ? (
                        <SidebarMenuItem>
                            <SidebarMenuButton disabled>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Loading accounts...</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ) : accounts instanceof Error ? (
                        <SidebarMenuItem>
                            <SidebarMenuButton disabled>
                                <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                                <span className="text-red-500">{accounts.message}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ) : accounts.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {/* Total balance */}
                            <div className="px-2 py-1 flex justify-between items-center font-semibold">
                                <div className="text-gray-800 dark:text-gray-100/90">
                                    BALANCE
                                </div>
                                <span className="text-lg text-green-600 dark:text-green-400">
                                    {formatCurrency(
                                        accounts.reduce((acc, a) => acc + (a.balance ?? 0), 0),
                                        "USD"
                                    )}
                                </span>
                            </div>

                            {/* Group by type */}
                            {["checking", "savings", "credit"].map((type) => {
                                const group = accounts.filter((a) => a.type === type)
                                if (group.length === 0) return null

                                return (
                                    <div key={type}>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex justify-between">
                                            <span>{type}</span>
                                            <span>
                                                {formatCurrency(
                                                    group.reduce((sum, a) => sum + (a.balance ?? 0), 0),
                                                    "USD"
                                                )}
                                            </span>
                                        </div>

                                        {group.map((account) => (
                                            <SidebarMenuItem key={account._id}>
                                                <SidebarMenuButton asChild>
                                                    <Link
                                                        href={`/accounts/${account._id}`}
                                                        className="flex items-center justify-between w-full"
                                                    >
                                                        <div className="flex items-center flex-1 min-w-0">
                                                            <span className="text-sm font-medium truncate">
                                                                {account.name}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-medium ml-2">
                                                            {formatCurrency(account.balance ?? 0, "USD")}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    ) : null}
                </SidebarMenu>

                {/* Add Account button */}
                <SidebarMenuItem className="list-none">
                    <SidebarMenuButton
                        onClick={() => setOpen(true)}
                        className="w-auto inline-flex items-center rounded-md border border-input bg-secondary mt-4 px-3 py-1.5 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80 cursor-pointer"
                    >
                        + Add Account
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
