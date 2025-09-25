"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api"; // adjust path if needed
import { useConvexUser } from "@/hooks/useConvexUser";

interface AddAccountDialogProps {
    open: boolean;
    onClose: () => void;
}

export function AddAccountDialog({ open, onClose }: AddAccountDialogProps) {
    const [name, setName] = useState("");
    const [bank, setBank] = useState("");
    const [number, setNumber] = useState("");
    const [type, setType] = useState("checking");

    const { convexUser } = useConvexUser();
    const createAccount = useMutation(api.accounts.createAccount);

    const resetForm = () => {
        setName("");
        setBank("");
        setNumber("");
        setType("checking");
    };

    const handleSave = async () => {
        if (!convexUser?._id) return;
        await createAccount({
            userId: convexUser._id,
            name,
            bank,
            number,
            type,
        });
        resetForm();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    resetForm();
                    onClose();
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Account</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" />
                    <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank" />
                    <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Account number" />

                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Add</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
