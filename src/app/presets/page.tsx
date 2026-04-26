// src/app/presets/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { EditPresetDialog } from "@/components/EditPresetDialog";
import { PresetsTab, AmountProcessing } from "@/components/presets/PresetsTab";
import { ImportHistoryTab } from "@/components/presets/ImportHistoryTab";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Upload, Settings2, Clock } from "lucide-react";
import Link from "next/link";

type EditingPreset = {
    _id: Id<"presets">;
    name: string;
    description: string;
    delimiter: string;
    hasHeader: boolean;
    skipRows: number;
    amountMultiplier: number;
    dateColumn: string;
    dateFormat: string;
    descriptionColumn: string;
    amountColumns: string[];
    categoryColumn?: string;
    accountColumn?: string;
    amountProcessing: AmountProcessing;
    [key: string]: unknown;
};

export default function PresetsPage() {
    const { convexUser } = useConvexUser();

    const presets = useQuery(
        api.presets.listPresets,
        convexUser ? { userId: convexUser._id } : "skip"
    );
    const accounts = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const createPreset = useMutation(api.presets.createPreset);
    const deletePreset = useMutation(api.presets.deletePreset);
    const updatePreset = useMutation(api.presets.updatePreset);

    const [activeTab, setActiveTab] = useState("presets");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [editingPreset, setEditingPreset] = useState<EditingPreset | null>(null);

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-sm text-muted-foreground">Sign in required</p>
                </div>
            </AppLayout>
        );
    }

    const handleCreatePreset = async (e: React.FormEvent) => {
        e.preventDefault();
        await createPreset({
            userId: convexUser._id,
            name,
            description,
            delimiter: ",",
            hasHeader: true,
            skipRows: 0,
            accountColumn: "Account Number",
            amountMultiplier: 1,
            dateColumn: "Transaction Date",
            dateFormat: "%m/%d/%y",
            descriptionColumn: "Transaction Description",
            amountColumns: ["Transaction Amount"],
            amountProcessing: { debit_values: ["Debit"], credit_values: ["Credit"] },
        });
        setName("");
        setDescription("");
        setShowCreateDialog(false);
    };

    const handleDelete = (presetId: Id<"presets">) => {
        if (confirm("Delete this preset?")) {
            deletePreset({ presetId });
        }
    };

    return (
        <AppLayout>
            <InitUser />
            <div className="container flex flex-col">
                <div className="flex flex-col gap-6 p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">

                        {/* Toolbar */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <TabsList className="w-full sm:w-auto">
                                <TabsTrigger value="presets" className="gap-1.5 flex-1 sm:flex-none">
                                    <Settings2 className="size-3.5" /> Presets
                                </TabsTrigger>
                                <TabsTrigger value="history" className="gap-1.5 flex-1 sm:flex-none">
                                    <Clock className="size-3.5" /> Import history
                                </TabsTrigger>
                            </TabsList>
                            <div className="flex items-center gap-2">
                                {activeTab === "presets" && (
                                    <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => setShowCreateDialog(true)}>
                                        <Plus className="size-4" /> Add preset
                                    </Button>
                                )}
                                <Button className="gap-2 flex-1 sm:flex-none" asChild>
                                    <Link href="/import-csv">
                                        <Upload className="size-4" /> Import CSV
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <TabsContent value="presets">
                            <PresetsTab
                                presets={presets}
                                accounts={accounts}
                                onEdit={(preset) => setEditingPreset(preset as EditingPreset)}
                                onDelete={handleDelete}
                                onCreateClick={() => setShowCreateDialog(true)}
                            />
                        </TabsContent>

                        <TabsContent value="history">
                            <ImportHistoryTab />
                        </TabsContent>

                    </Tabs>
                </div>
            </div>

            {/* Create preset dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New preset</DialogTitle>
                        <DialogDescription>
                            Add a new import preset for a bank statement format.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreatePreset} className="flex flex-col gap-4 mt-2">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">Preset name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Capital One Checking"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of this format"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create preset</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit preset dialog */}
            {editingPreset && (
                <EditPresetDialog
                    open={!!editingPreset}
                    preset={editingPreset}
                    onClose={() => setEditingPreset(null)}
                    onSave={async (updates) => {
                        const { _id, ...rest } = updates;
                        await updatePreset({ presetId: _id as Id<"presets">, updates: rest });
                        setEditingPreset(null);
                    }}
                />
            )}
        </AppLayout>
    );
}
