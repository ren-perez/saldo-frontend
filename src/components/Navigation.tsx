// src/components/Navigation.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Navigation() {
    const pathname = usePathname();
    
    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/accounts", label: "Accounts", icon: "🏦" },
        { href: "/presets", label: "Presets", icon: "⚙️" },
        { href: "/import-csv", label: "Import CSV", icon: "📤" },
        { href: "/transactions", label: "Transactions", icon: "💰" },
        { href: "/categories", label: "Categories", icon: "🏷️" },
    ];

    return (
        <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-blue-600">
                                Saldo
                            </Link>
                        </div>
                        
                        {/* Navigation Links */}
                        <SignedIn>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                            pathname === item.href
                                                ? "border-blue-500 text-gray-900"
                                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        }`}
                                    >
                                        <span className="mr-2">{item.icon}</span>
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </SignedIn>
                    </div>

                    {/* Auth Section */}
                    <div className="flex items-center">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                                    Sign In
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <UserButton 
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        avatarBox: "h-8 w-8"
                                    }
                                }}
                            />
                        </SignedIn>
                    </div>
                </div>
                
                {/* Mobile menu */}
                <SignedIn>
                    <div className="sm:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`block pl-3 pr-4 py-2 text-base font-medium ${
                                        pathname === item.href
                                            ? "bg-blue-50 border-blue-500 text-blue-700 border-l-4"
                                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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