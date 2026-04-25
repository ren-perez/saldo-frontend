"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Link2, Link2Off, RefreshCw, CheckCircle2, Clock } from "lucide-react";

function formatTimeLeft(expiresAt: number): string {
    const ms = expiresAt - Date.now();
    if (ms <= 0) return "expired";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function TelegramConnectSection() {
    const { convexUser } = useConvexUser();
    const [timeLeft, setTimeLeft] = useState("");

    const connection = useQuery(
        convexUser ? api.telegram.getConnectionStatus : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const pendingCode = useQuery(
        convexUser ? api.telegram.getPendingCode : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const generateCode = useMutation(api.telegram.generatePairingCode);
    const unlink = useMutation(api.telegram.unlinkTelegram);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);

    // Countdown timer
    useEffect(() => {
        if (!pendingCode) return;
        setTimeLeft(formatTimeLeft(pendingCode.expiresAt));
        const interval = setInterval(() => {
            setTimeLeft(formatTimeLeft(pendingCode.expiresAt));
        }, 1000);
        return () => clearInterval(interval);
    }, [pendingCode]);

    if (!convexUser) return null;

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

    async function handleGenerate() {
        if (!convexUser) return;
        setIsGenerating(true);
        try {
            await generateCode({ userId: convexUser._id });
        } finally {
            setIsGenerating(false);
        }
    }

    async function handleUnlink() {
        if (!convexUser) return;
        setIsUnlinking(true);
        try {
            await unlink({ userId: convexUser._id });
        } finally {
            setIsUnlinking(false);
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    Telegram
                </CardTitle>
                <CardDescription>
                    Link your Telegram account to manage finances from the bot.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* ── Connected ── */}
                {connection && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                    Connected
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                    {connection.telegramFirstName
                                        ? `${connection.telegramFirstName}${connection.telegramLastName ? ` ${connection.telegramLastName}` : ""}`
                                        : connection.telegramUsername
                                            ? `@${connection.telegramUsername}`
                                            : `ID ${connection.telegramUserId}`}
                                    {connection.telegramUsername && connection.telegramFirstName
                                        ? ` (@${connection.telegramUsername})`
                                        : ""}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUnlink}
                            disabled={isUnlinking}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 w-fit"
                        >
                            <Link2Off className="h-4 w-4 mr-2" />
                            {isUnlinking ? "Disconnecting..." : "Disconnect Telegram"}
                        </Button>
                    </div>
                )}

                {/* ── Code active ── */}
                {!connection && pendingCode && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>Code expires in {timeLeft === "expired" ? "a moment" : timeLeft}</span>
                        </div>
                        <div className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/30">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Your pairing code
                            </p>
                            <p className="text-3xl font-mono font-bold tracking-widest text-foreground">
                                {pendingCode.code}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            <p className="font-medium">How to link:</p>
                            <ol className="list-decimal list-inside flex flex-col gap-1 text-muted-foreground">
                                <li>
                                    {botUsername
                                        ? <span>Open <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@{botUsername}</a> on Telegram</span>
                                        : "Open the Saldo bot on Telegram"}
                                </li>
                                <li>Send <code className="bg-muted px-1 py-0.5 rounded text-xs">/start</code> if you haven&apos;t already</li>
                                <li>
                                    Send{" "}
                                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                        /link {pendingCode.code}
                                    </code>
                                </li>
                            </ol>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-fit text-muted-foreground"
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                            {isGenerating ? "Generating..." : "Generate new code"}
                        </Button>
                    </div>
                )}

                {/* ── Not connected, no code ── */}
                {!connection && !pendingCode && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                            Not connected. Generate a code to link your Telegram account.
                        </p>
                        <Button
                            size="sm"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-fit"
                        >
                            <Link2 className="h-4 w-4 mr-2" />
                            {isGenerating ? "Generating..." : "Connect Telegram"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
    return (
        <AppLayout>
            <InitUser />
            <div className="flex flex-col gap-6 py-6 px-6 max-w-2xl">
                <div className="flex flex-col gap-4">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Integrations
                    </h2>
                    <TelegramConnectSection />
                </div>
            </div>
        </AppLayout>
    );
}
