// src/components/EditPresetDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Preset {
    _id: string;
    name: string;
    description: string;
    delimiter: string;
    hasHeader: boolean;
    skipRows: number;
    accountColumn?: string;
    amountMultiplier: number;
    categoryColumn?: string;
    categoryGroupColumn?: string;
    dateColumn: string;
    dateFormat: string;
    descriptionColumn: string;
    amountColumns: string[];
    amountProcessing: Record<string, any>;
    transactionTypeColumn?: string;
}

interface EditPresetDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (updates: Preset) => Promise<void>;
    preset: Preset | null;
}

export function EditPresetDialog({ open, onClose, onSave, preset }: EditPresetDialogProps) {
    const [formState, setFormState] = useState<Preset>({
        _id: "",
        name: "",
        description: "",
        delimiter: ",",
        hasHeader: true,
        skipRows: 0,
        accountColumn: "",
        amountMultiplier: 1,
        categoryColumn: "",
        categoryGroupColumn: "",
        dateColumn: "",
        dateFormat: "",
        descriptionColumn: "",
        amountColumns: [""],
        amountProcessing: {},
        transactionTypeColumn: "",
    });

    // Populate form when preset changes
    useEffect(() => {
        if (preset) {
            setFormState({
                _id: preset._id,
                name: preset.name || "",
                description: preset.description || "",
                delimiter: preset.delimiter || ",",
                hasHeader: preset.hasHeader ?? true,
                skipRows: preset.skipRows ?? 0,
                accountColumn: preset.accountColumn || "",
                amountMultiplier: preset.amountMultiplier ?? 1,
                categoryColumn: preset.categoryColumn || "",
                categoryGroupColumn: preset.categoryGroupColumn || "",
                dateColumn: preset.dateColumn || "",
                dateFormat: preset.dateFormat || "",
                descriptionColumn: preset.descriptionColumn || "",
                amountColumns: preset.amountColumns.length ? preset.amountColumns : [""],
                amountProcessing: preset.amountProcessing || {},
                transactionTypeColumn: preset.transactionTypeColumn || "",
            });
        } else {
            setFormState(prev => ({ ...prev, _id: "", amountColumns: [""] }));
        }
    }, [preset]);

    const updateField = <K extends keyof Preset>(key: K, value: Preset[K]) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Preset</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <Input
                        value={formState.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Preset name"
                    />
                    <Input
                        value={formState.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Description"
                    />
                    <Input
                        value={formState.delimiter}
                        onChange={(e) => updateField("delimiter", e.target.value)}
                        placeholder="Delimiter"
                    />
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            checked={formState.hasHeader}
                            onCheckedChange={(checked) => updateField("hasHeader", !!checked)}
                        />
                        <span>Has Header</span>
                    </div>
                    <Input
                        type="number"
                        value={formState.skipRows}
                        onChange={(e) => updateField("skipRows", Number(e.target.value))}
                        placeholder="Skip rows"
                    />
                    <Input
                        value={formState.accountColumn}
                        onChange={(e) => updateField("accountColumn", e.target.value)}
                        placeholder="Account column"
                    />
                    <Input
                        type="number"
                        value={formState.amountMultiplier}
                        onChange={(e) => updateField("amountMultiplier", Number(e.target.value))}
                        placeholder="Amount multiplier"
                    />
                    <Input
                        value={formState.categoryColumn}
                        onChange={(e) => updateField("categoryColumn", e.target.value)}
                        placeholder="Category column"
                    />
                    <Input
                        value={formState.categoryGroupColumn}
                        onChange={(e) => updateField("categoryGroupColumn", e.target.value)}
                        placeholder="Category group column"
                    />
                    <Input
                        value={formState.dateColumn}
                        onChange={(e) => updateField("dateColumn", e.target.value)}
                        placeholder="Date column"
                    />
                    <Input
                        value={formState.dateFormat}
                        onChange={(e) => updateField("dateFormat", e.target.value)}
                        placeholder="Date format"
                    />
                    <Input
                        value={formState.descriptionColumn}
                        onChange={(e) => updateField("descriptionColumn", e.target.value)}
                        placeholder="Description column"
                    />
                    <Input
                        value={formState.transactionTypeColumn}
                        onChange={(e) => updateField("transactionTypeColumn", e.target.value)}
                        placeholder="Transaction type column"
                    />
                    <div>
                        <label className="block mb-1">Amount columns (comma separated)</label>
                        <Input
                            value={formState.amountColumns.join(",")}
                            onChange={(e) => updateField("amountColumns", e.target.value.split(","))}
                            placeholder="Amount columns"
                        />
                    </div>
                    {/* For amountProcessing, you might use a JSON editor or textarea */}
                    <div>
                        <label className="block mb-1">Amount processing (JSON)</label>
                        <textarea
                            className="w-full border rounded p-2"
                            value={JSON.stringify(formState.amountProcessing, null, 2)}
                            onChange={(e) => {
                                try {
                                    updateField("amountProcessing", JSON.parse(e.target.value));
                                } catch { }
                            }}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            await onSave(formState);
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
