"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle, Search } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ManualMatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ManualMatchDialog({ open, onOpenChange }: ManualMatchDialogProps) {
    const { convexUser } = useConvexUser();
    const unpairedData = useQuery(
        api.transfers.listUnpairedTransactions,
        convexUser ? { userId: convexUser._id } : "skip"
    );
    const pairTransfers = useMutation(api.transfers.pairTransfers);

    const [selectedOutgoing, setSelectedOutgoing] = useState<Id<"transactions"> | null>(null);
    const [selectedIncoming, setSelectedIncoming] = useState<Id<"transactions"> | null>(null);
    const [outgoingSearch, setOutgoingSearch] = useState("");
    const [incomingSearch, setIncomingSearch] = useState("");

    const outgoing = useMemo(() =>
        (unpairedData ?? [])
            .filter(({ transaction }) => transaction.amount < 0)
            .filter(({ transaction, account }) => {
                if (!outgoingSearch) return true;
                const q = outgoingSearch.toLowerCase();
                return (
                    transaction.description.toLowerCase().includes(q) ||
                    account.name.toLowerCase().includes(q)
                );
            }),
        [unpairedData, outgoingSearch]
    );

    const incoming = useMemo(() =>
        (unpairedData ?? [])
            .filter(({ transaction }) => transaction.amount > 0)
            .filter(({ transaction, account }) => {
                if (!incomingSearch) return true;
                const q = incomingSearch.toLowerCase();
                return (
                    transaction.description.toLowerCase().includes(q) ||
                    account.name.toLowerCase().includes(q)
                );
            }),
        [unpairedData, incomingSearch]
    );

    const reset = () => {
        setSelectedOutgoing(null);
        setSelectedIncoming(null);
        setOutgoingSearch("");
        setIncomingSearch("");
    };

    const handlePair = async () => {
        if (!convexUser || !selectedOutgoing || !selectedIncoming) return;
        try {
            await pairTransfers({
                userId: convexUser._id,
                outgoingTransactionId: selectedOutgoing,
                incomingTransactionId: selectedIncoming,
            });
            toast.success("Transfer paired successfully");
            reset();
            onOpenChange(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to pair transfers");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) reset(); onOpenChange(isOpen); }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manual Transfer Match</DialogTitle>
                    <DialogDescription>
                        Select one outgoing and one incoming transaction to pair as a transfer.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4">
                    {/* Outgoing column */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-sm font-semibold">Outgoing</span>
                            <span className="text-xs text-muted-foreground ml-auto">{outgoing.length} transactions</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                className="pl-7 h-8 text-sm"
                                placeholder="Search..."
                                value={outgoingSearch}
                                onChange={(e) => setOutgoingSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                            {outgoing.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-6">No outgoing transactions</p>
                            )}
                            {outgoing.map(({ transaction, account }) => (
                                <button
                                    key={transaction._id}
                                    onClick={() => setSelectedOutgoing(
                                        selectedOutgoing === transaction._id ? null : transaction._id
                                    )}
                                    className={cn(
                                        "text-left rounded-lg border p-2.5 transition-colors text-sm",
                                        "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40",
                                        "hover:border-red-400 dark:hover:border-red-600",
                                        selectedOutgoing === transaction._id &&
                                            "ring-2 ring-red-500 border-red-500"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-semibold text-red-600 dark:text-red-400 text-xs">
                                            −${Math.abs(transaction.amount).toFixed(2)}
                                        </span>
                                        {selectedOutgoing === transaction._id && (
                                            <CheckCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="font-medium text-foreground/90 line-clamp-1 text-xs leading-tight">
                                        {transaction.description}
                                    </p>
                                    <p className="text-muted-foreground text-xs mt-0.5 truncate">{account.name}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {new Date(transaction.date).toLocaleDateString()}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Incoming column */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-sm font-semibold">Incoming</span>
                            <span className="text-xs text-muted-foreground ml-auto">{incoming.length} transactions</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                className="pl-7 h-8 text-sm"
                                placeholder="Search..."
                                value={incomingSearch}
                                onChange={(e) => setIncomingSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                            {incoming.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-6">No incoming transactions</p>
                            )}
                            {incoming.map(({ transaction, account }) => (
                                <button
                                    key={transaction._id}
                                    onClick={() => setSelectedIncoming(
                                        selectedIncoming === transaction._id ? null : transaction._id
                                    )}
                                    className={cn(
                                        "text-left rounded-lg border p-2.5 transition-colors text-sm",
                                        "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40",
                                        "hover:border-green-400 dark:hover:border-green-600",
                                        selectedIncoming === transaction._id &&
                                            "ring-2 ring-green-500 border-green-500"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-semibold text-green-600 dark:text-green-400 text-xs">
                                            +${transaction.amount.toFixed(2)}
                                        </span>
                                        {selectedIncoming === transaction._id && (
                                            <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="font-medium text-foreground/90 line-clamp-1 text-xs leading-tight">
                                        {transaction.description}
                                    </p>
                                    <p className="text-muted-foreground text-xs mt-0.5 truncate">{account.name}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {new Date(transaction.date).toLocaleDateString()}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePair}
                        disabled={!selectedOutgoing || !selectedIncoming}
                    >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Pair Transfer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
