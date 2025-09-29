// src/components/EditPresetDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
    amountProcessing: Record<string, unknown>;
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

    const [activeTab, setActiveTab] = useState("basic");

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
        setActiveTab("basic");
    }, [preset]);

    const updateField = <K extends keyof Preset>(key: K, value: Preset[K]) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    const commonDelimiters = [
        { value: ",", label: "Comma (,)" },
        { value: ";", label: "Semicolon (;)" },
        { value: "\t", label: "Tab" },
        { value: "|", label: "Pipe (|)" }
    ];

    const commonDateFormats = [
        { value: "%m/%d/%Y", label: "MM/DD/YYYY (12/31/2024)" },
        { value: "%d/%m/%Y", label: "DD/MM/YYYY (31/12/2024)" },
        { value: "%Y-%m-%d", label: "YYYY-MM-DD (2024-12-31)" },
        { value: "%m-%d-%Y", label: "MM-DD-YYYY (12-31-2024)" },
        { value: "%d-%m-%Y", label: "DD-MM-YYYY (31-12-2024)" },
        { value: "%m/%d/%y", label: "MM/DD/YY (12/31/24)" }
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">⚙️</span>
                        Edit Preset: {formState.name || "Unnamed"}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="columns">Columns</TabsTrigger>
                        <TabsTrigger value="formatting">Formatting</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                        <TabsContent value="basic" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Preset Information</CardTitle>
                                    <CardDescription>Basic details about this CSV import preset</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Preset Name *</Label>
                                        <Input
                                            id="name"
                                            value={formState.name}
                                            onChange={(e) => updateField("name", e.target.value)}
                                            placeholder="e.g., Chase Credit Card"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={formState.description}
                                            onChange={(e) => updateField("description", e.target.value)}
                                            placeholder="Brief description of this CSV format"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">CSV Structure</CardTitle>
                                    <CardDescription>How your CSV file is organized</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="delimiter">Field Delimiter</Label>
                                        <div className="flex gap-2">
                                            {commonDelimiters.map((delim) => (
                                                <Button
                                                    key={delim.value}
                                                    type="button"
                                                    variant={formState.delimiter === delim.value ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => updateField("delimiter", delim.value)}
                                                >
                                                    {delim.label}
                                                </Button>
                                            ))}
                                        </div>
                                        <Input
                                            id="delimiter"
                                            value={formState.delimiter}
                                            onChange={(e) => updateField("delimiter", e.target.value)}
                                            placeholder="Custom delimiter"
                                            className="mt-2"
                                        />
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="hasHeader"
                                            checked={formState.hasHeader}
                                            onCheckedChange={(checked) => updateField("hasHeader", !!checked)}
                                        />
                                        <Label htmlFor="hasHeader">File has header row</Label>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="skipRows">Skip rows from top</Label>
                                        <Input
                                            id="skipRows"
                                            type="number"
                                            min="0"
                                            value={formState.skipRows}
                                            onChange={(e) => updateField("skipRows", Number(e.target.value))}
                                            className="w-24"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Number of rows to skip before reading data
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="columns" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Required Columns</CardTitle>
                                    <CardDescription>Map your CSV columns to transaction data</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="dateColumn">Date Column *</Label>
                                            <Input
                                                id="dateColumn"
                                                value={formState.dateColumn}
                                                onChange={(e) => updateField("dateColumn", e.target.value)}
                                                placeholder="e.g., Transaction Date"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="descriptionColumn">Description Column *</Label>
                                            <Input
                                                id="descriptionColumn"
                                                value={formState.descriptionColumn}
                                                onChange={(e) => updateField("descriptionColumn", e.target.value)}
                                                placeholder="e.g., Description"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="amountColumns">Amount Columns *</Label>
                                        <Input
                                            id="amountColumns"
                                            value={formState.amountColumns.join(", ")}
                                            onChange={(e) => updateField("amountColumns", e.target.value.split(",").map(s => s.trim()))}
                                            placeholder="e.g., Amount, Credit, Debit"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Comma-separated list of amount column names
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Optional Columns</CardTitle>
                                    <CardDescription>Additional data columns (leave empty if not available)</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="accountColumn">Account Column</Label>
                                            <Input
                                                id="accountColumn"
                                                value={formState.accountColumn}
                                                onChange={(e) => updateField("accountColumn", e.target.value)}
                                                placeholder="e.g., Account Number"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="transactionTypeColumn">Transaction Type Column</Label>
                                            <Input
                                                id="transactionTypeColumn"
                                                value={formState.transactionTypeColumn}
                                                onChange={(e) => updateField("transactionTypeColumn", e.target.value)}
                                                placeholder="e.g., Type, Debit/Credit"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="categoryColumn">Category Column</Label>
                                            <Input
                                                id="categoryColumn"
                                                value={formState.categoryColumn}
                                                onChange={(e) => updateField("categoryColumn", e.target.value)}
                                                placeholder="e.g., Category"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="categoryGroupColumn">Category Group Column</Label>
                                            <Input
                                                id="categoryGroupColumn"
                                                value={formState.categoryGroupColumn}
                                                onChange={(e) => updateField("categoryGroupColumn", e.target.value)}
                                                placeholder="e.g., Category Group"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="formatting" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Date Formatting</CardTitle>
                                    <CardDescription>How dates are formatted in your CSV</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dateFormat">Date Format</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {commonDateFormats.map((format) => (
                                                <Button
                                                    key={format.value}
                                                    type="button"
                                                    variant={formState.dateFormat === format.value ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => updateField("dateFormat", format.value)}
                                                    className="justify-start text-left"
                                                >
                                                    {format.label}
                                                </Button>
                                            ))}
                                        </div>
                                        <Input
                                            id="dateFormat"
                                            value={formState.dateFormat}
                                            onChange={(e) => updateField("dateFormat", e.target.value)}
                                            placeholder="Custom format (e.g., %Y-%m-%d)"
                                            className="mt-2"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Amount Processing</CardTitle>
                                    <CardDescription>How to handle amount values</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amountMultiplier">Amount Multiplier</Label>
                                        <div className="flex items-center gap-4">
                                            <Input
                                                id="amountMultiplier"
                                                type="number"
                                                step="0.01"
                                                value={formState.amountMultiplier}
                                                onChange={(e) => updateField("amountMultiplier", Number(e.target.value))}
                                                className="w-32"
                                            />
                                            <div className="flex gap-2">
                                                <Badge variant={formState.amountMultiplier === 1 ? "default" : "outline"}>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-auto p-0"
                                                        onClick={() => updateField("amountMultiplier", 1)}
                                                    >
                                                        1 (normal)
                                                    </Button>
                                                </Badge>
                                                <Badge variant={formState.amountMultiplier === -1 ? "default" : "outline"}>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-auto p-0"
                                                        onClick={() => updateField("amountMultiplier", -1)}
                                                    >
                                                        -1 (flip sign)
                                                    </Button>
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Multiply all amounts by this value (use -1 to flip positive/negative)
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="advanced" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Advanced Processing</CardTitle>
                                    <CardDescription>Complex amount processing rules</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amountProcessing">Amount Processing Rules (JSON)</Label>
                                        <textarea
                                            id="amountProcessing"
                                            className="w-full h-32 p-3 border rounded-md font-mono text-sm bg-muted"
                                            value={JSON.stringify(formState.amountProcessing, null, 2)}
                                            onChange={(e) => {
                                                try {
                                                    updateField("amountProcessing", JSON.parse(e.target.value));
                                                } catch (error) {
                                                    // Keep the invalid JSON in the textarea but don't update state
                                                }
                                            }}
                                            placeholder='{\n  "credit_values": ["Credit", "CR"],\n  "debit_values": ["Debit", "DR"]\n}'
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Define how to process different transaction types and amounts
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                    </div>
                </Tabs>

                <div className="text-sm text-muted-foreground">
                    * Required fields
                </div>

                <Separator className="my-4" />

                <DialogFooter className="flex justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                await onSave(formState);
                                onClose();
                            }}
                            disabled={!formState.name || !formState.dateColumn || !formState.descriptionColumn || formState.amountColumns.length === 0}
                        >
                            Save Preset
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}