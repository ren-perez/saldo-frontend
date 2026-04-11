"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, MessageSquare, Zap, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

type Message = {
    _id: string;
    direction: string;
    messageType: string;
    text: string;
    telegramChatId: string;
    telegramMessageId?: string;
    createdAt: number;
};

type Action = {
    _id: string;
    actionType: string;
    status: string;
    inputJson?: unknown;
    resultJson?: unknown;
    errorText?: string;
    createdAt: number;
    completedAt?: number;
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    if (status === "completed") return "default";
    if (status === "failed") return "destructive";
    if (status === "pending") return "secondary";
    return "outline";
}

function actionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        pair_account: "Pair account",
        unlinked_user_message: "Unlinked user",
        help_command: "Help (/start)",
        echo_reply: "Echo reply",
        unsupported_message_type: "Unsupported type",
    };
    return labels[type] ?? type;
}

function MessageRow({ msg }: { msg: Message }) {
    const isInbound = msg.direction === "inbound";
    return (
        <div className="flex gap-3 py-3 border-b last:border-0">
            <div className="shrink-0 mt-0.5">
                {isInbound ? (
                    <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                ) : (
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground capitalize">
                        {msg.direction}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.createdAt), "MMM d, HH:mm:ss")}
                    </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {msg.text}
                </p>
            </div>
        </div>
    );
}

function ActionRow({ action }: { action: Action }) {
    return (
        <div className="flex gap-3 py-3 border-b last:border-0">
            <div className="shrink-0">
                <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                        {actionTypeLabel(action.actionType)}
                    </span>
                    <Badge variant={statusVariant(action.status)} className="text-xs h-5">
                        {action.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(action.createdAt), "MMM d, HH:mm:ss")}
                    </span>
                </div>
                {action.errorText && (
                    <p className="text-xs text-destructive mt-0.5">{action.errorText}</p>
                )}
                {!!action.inputJson && (
                    <pre className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1 overflow-x-auto">
                        {JSON.stringify(action.inputJson, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}

export default function HistoryPage() {
    const { convexUser } = useConvexUser();

    const messages = useQuery(
        convexUser ? api.chatHistory.getMessageHistory : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const actions = useQuery(
        convexUser ? api.chatHistory.getActionHistory : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    );

    return (
        <AppLayout>
            <InitUser />
            <div className="flex flex-col gap-6 py-6 px-6 max-w-3xl">
                <div className="flex items-center gap-3">
                    <History className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Chat History</h1>
                </div>

                {!convexUser && (
                    <p className="text-muted-foreground">Sign in to view your history.</p>
                )}

                {convexUser && (
                    <Tabs defaultValue="messages">
                        <TabsList>
                            <TabsTrigger value="messages" className="gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Messages
                                {messages && (
                                    <span className="text-xs text-muted-foreground">
                                        ({messages.length})
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="actions" className="gap-2">
                                <Zap className="h-4 w-4" />
                                Actions
                                {actions && (
                                    <span className="text-xs text-muted-foreground">
                                        ({actions.length})
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="messages" className="mt-4">
                            <Card>
                                <CardContent className="p-0">
                                    {messages === undefined && (
                                        <p className="text-sm text-muted-foreground p-4">Loading...</p>
                                    )}
                                    {messages?.length === 0 && (
                                        <div className="text-center py-12">
                                            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                                            <p className="text-sm text-muted-foreground">
                                                No messages yet. Send something to the Telegram bot to get started.
                                            </p>
                                        </div>
                                    )}
                                    {messages && messages.length > 0 && (
                                        <div className="px-4">
                                            {(messages as unknown as Message[]).map((msg) => (
                                                <MessageRow key={msg._id} msg={msg} />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="actions" className="mt-4">
                            <Card>
                                <CardContent className="p-0">
                                    {actions === undefined && (
                                        <p className="text-sm text-muted-foreground p-4">Loading...</p>
                                    )}
                                    {actions?.length === 0 && (
                                        <div className="text-center py-12">
                                            <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                                            <p className="text-sm text-muted-foreground">
                                                No actions recorded yet.
                                            </p>
                                        </div>
                                    )}
                                    {actions && actions.length > 0 && (
                                        <div className="px-4">
                                            {(actions as unknown as Action[]).map((action) => (
                                                <ActionRow key={action._id} action={action} />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </AppLayout>
    );
}
