"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

interface CreateTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateTransactionDialog({ open, onOpenChange }: CreateTransactionDialogProps) {
    const { convexUser } = useConvexUser();
    const accounts = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );
    const createManualTransaction = useMutation(api.transactions.createManualTransaction);

    const today = new Date().toISOString().split("T")[0];
    const [accountId, setAccountId] = useState("");
    const [date, setDate] = useState(today);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [transactionType, setTransactionType] = useState("");

    const resetForm = () => {
        setAccountId("");
        setDate(today);
        setAmount("");
        setDescription("");
        setTransactionType("");
    };

    const handleSave = async () => {
        if (!convexUser) return;
        if (!accountId || !date || !amount || !description.trim()) {
            toast.error("Please fill in all required fields");
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount === 0) {
            toast.error("Please enter a valid non-zero amount");
            return;
        }

        const timestamp = new Date(date + "T00:00:00").getTime();

        try {
            await createManualTransaction({
                userId: convexUser._id,
                accountId: accountId as Parameters<typeof createManualTransaction>[0]["accountId"],
                date: timestamp,
                amount: parsedAmount,
                description: description.trim(),
                transactionType: transactionType || undefined,
            });
            toast.success("Transaction created");
            resetForm();
            onOpenChange(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create transaction");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); onOpenChange(isOpen); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Account</Label>
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
                        <Select value={transactionType} onValueChange={setTransactionType}>
                            <SelectTrigger>
                                <SelectValue placeholder="— None —" />
                            </SelectTrigger>
                            <SelectContent>
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
                    <Button onClick={handleSave}>Add Transaction</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
