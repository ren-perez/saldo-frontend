// src/components/EditAccountDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface EditAccountDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (updates: { name: string; bank: string; number: string; type: string }) => Promise<void>;
    account: {
        _id: string;
        name: string;
        bank: string;
        number?: string;
        type: string;
        createdAt: string;
    } | null;
}

export function EditAccountDialog({ open, onClose, onSave, account }: EditAccountDialogProps) {
    // Initialize state with safe defaults
    const [name, setName] = useState("");
    const [bank, setBank] = useState("");
    const [number, setNumber] = useState("");
    const [type, setType] = useState("checking");

    // Populate fields when account changes
    useEffect(() => {
        if (account) {
            setName(account.name || "");
            setBank(account.bank || "");
            setNumber(account.number || "");
            setType(account.type || "checking");
        } else {
            // Reset fields if account is null
            setName("");
            setBank("");
            setNumber("");
            setType("checking");
        }
    }, [account]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Account</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Account name"
                    />
                    <Input
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                        placeholder="Bank"
                    />
                    <Input
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Account number"
                    />

                    <Select value={type || "checking"} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            await onSave({ name, bank, number, type });
                            onClose();
                        }}
                    >
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
