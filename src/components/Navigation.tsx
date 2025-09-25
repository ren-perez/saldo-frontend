// src/components/Navigation.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";

export default function Navigation() {
    const pathname = usePathname();

    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/accounts", label: "Accounts", icon: "🏦" },
        { href: "/presets", label: "Presets", icon: "⚙️" },
        { href: "/import-csv", label: "Import CSV", icon: "📤" },
        { href: "/transactions", label: "Transactions", icon: "💰" },
        { href: "/categories", label: "Categories", icon: "🏷️" },
        { href: "/reflection", label: "Reflection", icon: "🔍" },
    ];

    return (
        <nav className="bg-background shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left Side */}
                    <div className="flex">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-primary">
                                Saldo
                            </Link>
                        </div>

                        {/* Desktop Navigation Links */}
                        <SignedIn>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${pathname === item.href
                                                ? "border-primary text-foreground"
                                                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                                            }`}
                                    >
                                        <span className="mr-2">{item.icon}</span>
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </SignedIn>
                    </div>

                    {/* Right Side - Auth */}
                    <div className="flex items-center space-x-4">
                        <ThemeToggle />
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                    Sign In
                                </button>
                            </SignInButton>
                        </SignedOut>

                        <SignedIn>
                            <UserButton
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        avatarBox: "h-8 w-8",
                                    },
                                }}
                            />
                        </SignedIn>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <SignedIn>
                    <div className="sm:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`block pl-3 pr-4 py-2 text-base font-medium border-l-4 transition-colors ${pathname === item.href
                                            ? "bg-accent text-primary border-primary"
                                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-accent"
                                        }`}
                                >
                                    <span className="mr-2">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </SignedIn>
            </div>
        </nav>
    );
}