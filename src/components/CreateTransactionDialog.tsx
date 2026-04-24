"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

interface ExistingTransaction {
    _id: Id<"transactions">;
    accountId: Id<"accounts">;
    amount: number;
    date: number;
    description: string;
    transactionType?: string;
}

interface CreateTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction?: ExistingTransaction;
}

function timestampToDateInput(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CreateTransactionDialog({ open, onOpenChange, transaction }: CreateTransactionDialogProps) {
    const { convexUser } = useConvexUser();
    const accounts = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );
    const createManualTransaction = useMutation(api.transactions.createManualTransaction);
    const updateTransaction = useMutation(api.transactions.updateTransaction);

    const isEdit = !!transaction;
    const today = new Date().toISOString().split("T")[0];

    const [accountId, setAccountId] = useState("");
    const [date, setDate] = useState(today);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [transactionType, setTransactionType] = useState("");

    useEffect(() => {
        if (open) {
            if (transaction) {
                setAccountId(transaction.accountId);
                setDate(timestampToDateInput(transaction.date));
                setAmount(String(transaction.amount));
                setDescription(transaction.description);
                setTransactionType(transaction.transactionType || "");
            } else {
                setAccountId("");
                setDate(today);
                setAmount("");
                setDescription("");
                setTransactionType("");
            }
        }
    }, [open, transaction]);

    const resetForm = () => {
        setAccountId("");
        setDate(today);
        setAmount("");
        setDescription("");
        setTransactionType("");
    };

    const handleSave = async () => {
        if (!convexUser) return;

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount === 0) {
            toast.error("Please enter a valid non-zero amount");
            return;
        }
        if (!description.trim()) {
            toast.error("Description is required");
            return;
        }
        if (!date) {
            toast.error("Date is required");
            return;
        }

        const timestamp = new Date(date + "T00:00:00").getTime();

        try {
            if (isEdit && transaction) {
                const updates: Record<string, unknown> = {};
                if (timestamp !== transaction.date) updates.date = timestamp;
                if (parsedAmount !== transaction.amount) updates.amount = parsedAmount;
                if (description.trim() !== transaction.description) updates.description = description.trim();
                const newType = transactionType || undefined;
                if (newType !== transaction.transactionType) {
                    if (newType) updates.transactionType = newType;
                    else updates.clearTransactionType = true;
                }
                if (Object.keys(updates).length > 0) {
                    await updateTransaction({ transactionId: transaction._id, updates });
                }
                toast.success("Transaction updated");
            } else {
                if (!accountId) {
                    toast.error("Please select an account");
                    return;
                }
                await createManualTransaction({
                    userId: convexUser._id,
                    accountId: accountId as Parameters<typeof createManualTransaction>[0]["accountId"],
                    date: timestamp,
                    amount: parsedAmount,
                    description: description.trim(),
                    transactionType: transactionType || undefined,
                });
                toast.success("Transaction created");
            }
            resetForm();
            onOpenChange(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : isEdit ? "Failed to update transaction" : "Failed to create transaction");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); onOpenChange(isOpen); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Account</Label>
                        {isEdit ? (
                            <div className="h-9 px-3 flex items-center text-sm border rounded-md bg-muted text-muted-foreground">
                                {accounts?.find(a => a._id === accountId)?.name ?? "Unknown account"}
                            </div>
                        ) : (
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts?.map((acc) => (
                                        <SelectItem key={acc._id} value={acc._id}>
                                            {acc.name} {acc.bank ? `— ${acc.bank}` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Date</Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g. -50.00 for expense, 1000.00 for income"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Input
                            type="text"
                            placeholder="Transaction description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Type <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Select value={transactionType || "NONE"} onValueChange={(v) => setTransactionType(v === "NONE" ? "" : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="— None —" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">— None —</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="transfer">Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>{isEdit ? "Save Changes" : "Add Transaction"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
