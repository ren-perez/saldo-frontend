// src/components/AppLayout.tsx
"use client";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Navigation from "./Navigation";

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <SignedIn>
                <Navigation />
                <main className="py-6">
                    {children}
                </main>
            </SignedIn>
            <SignedOut>
                {children}
            </SignedOut>
        </div>
    );
}