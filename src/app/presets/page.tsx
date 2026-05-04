// src/app/presets/page.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import Papa from "papaparse";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Upload, Settings2, Clock, FileUp, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { inferPresetFromCSV, type InferenceResult } from "@/lib/presetInference";
import { cn } from "@/lib/utils";

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

type CreateDialogState = "idle" | "inferring" | "preview" | "success";

export default function PresetsPage() {
    const router = useRouter();
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

    // Smart create dialog state
    const [createDialogState, setCreateDialogState] = useState<CreateDialogState>("idle");
    const [inferredConfig, setInferredConfig] = useState<InferenceResult | null>(null);
    const [createdPresetId, setCreatedPresetId] = useState<Id<"presets"> | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetCreateDialog = useCallback(() => {
        setName("");
        setDescription("");
        setInferredConfig(null);
        setCreatedPresetId(null);
        setCreateDialogState("idle");
        setShowCreateDialog(false);
    }, []);

    const handleFileForInference = useCallback(async (file: File) => {
        if (!file.name.match(/\.(csv|txt)$/i)) return;
        setCreateDialogState("inferring");

        const rawText = await file.text();
        const firstLine = rawText.split("\n")[0] ?? "";

        Papa.parse<Record<string, string>>(rawText, {
            header: true,
            preview: 5,
            complete: async (results) => {
                const headers = results.meta.fields ?? [];
                const sampleRows = (results.data as Record<string, string>[]).slice(0, 3);
                try {
                    const result = await inferPresetFromCSV(headers, sampleRows, firstLine);
                    setInferredConfig(result);
                    setCreateDialogState("preview");
                } catch {
                    setCreateDialogState("idle");
                }
            },
            error: () => setCreateDialogState("idle"),
        });
    }, []);

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
        if (!convexUser) return;

        const config = inferredConfig?.config;
        const presetId = await createPreset({
            userId: convexUser._id,
            name,
            description,
            delimiter: config?.delimiter ?? ",",
            hasHeader: config?.hasHeader ?? true,
            skipRows: config?.skipRows ?? 0,
            accountColumn: config?.accountColumn ?? undefined,
            amountMultiplier: config?.amountMultiplier ?? 1,
            categoryColumn: config?.categoryColumn ?? undefined,
            categoryGroupColumn: config?.categoryGroupColumn ?? undefined,
            dateColumn: config?.dateColumn ?? "Date",
            dateFormat: config?.dateFormat ?? "%Y-%m-%d",
            descriptionColumn: config?.descriptionColumn ?? "Description",
            amountColumns: config?.amountColumns?.length ? config.amountColumns : ["Amount"],
            amountProcessing: config?.amountProcessing ?? { amount_column: "Amount", amount_multiplier: 1 },
            transactionTypeColumn: config?.transactionTypeColumn ?? undefined,
            transferPairIdColumn: config?.transferPairIdColumn ?? undefined,
        });

        setCreatedPresetId(presetId as Id<"presets">);
        setCreateDialogState("success");
    };

    const handleDelete = (presetId: Id<"presets">) => {
        if (confirm("Delete this preset?")) {
            deletePreset({ presetId, userId: convexUser._id });
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
            <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetCreateDialog(); }}>
                <DialogContent className="sm:max-w-md">
                    {createDialogState === "success" ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                    <CheckCircle2 className="size-5" /> Preset created
                                </DialogTitle>
                                <DialogDescription>
                                    <span className="font-medium text-foreground">{name}</span> is ready to use.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-4 gap-2">
                                <Button variant="outline" onClick={resetCreateDialog}>Done</Button>
                                <Button
                                    onClick={() => {
                                        resetCreateDialog();
                                        if (createdPresetId) router.push(`/import-csv?presetId=${createdPresetId}`);
                                    }}
                                    className="gap-2"
                                >
                                    <Upload className="size-4" /> Start import
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>New preset</DialogTitle>
                                <DialogDescription>
                                    Drop a sample CSV to auto-detect the column mapping.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreatePreset} className="flex flex-col gap-4 mt-2">
                                <div className="flex flex-col gap-3">
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
                                        />
                                    </div>
                                </div>

                                {/* File drop zone */}
                                <div
                                    className={cn(
                                        "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
                                        isDraggingOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30",
                                        createDialogState === "inferring" && "pointer-events-none opacity-60"
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                    onDragLeave={() => setIsDraggingOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDraggingOver(false);
                                        const file = e.dataTransfer.files[0];
                                        if (file) handleFileForInference(file);
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.txt"
                                        className="hidden"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileForInference(f); }}
                                    />
                                    {createDialogState === "inferring" ? (
                                        <>
                                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Detecting column mapping…</p>
                                        </>
                                    ) : createDialogState === "preview" && inferredConfig ? (
                                        <>
                                            <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">Schema detected</p>
                                                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                                                    {[
                                                        inferredConfig.config.dateColumn && `Date: ${inferredConfig.config.dateColumn}`,
                                                        inferredConfig.config.descriptionColumn && `Desc: ${inferredConfig.config.descriptionColumn}`,
                                                        inferredConfig.config.amountColumns[0] && `Amount: ${inferredConfig.config.amountColumns[0]}`,
                                                        inferredConfig.config.accountColumn && `Account: ${inferredConfig.config.accountColumn}`,
                                                        inferredConfig.config.categoryColumn && `Category: ${inferredConfig.config.categoryColumn}`,
                                                        inferredConfig.config.transferPairIdColumn && `Transfer ID: ${inferredConfig.config.transferPairIdColumn}`,
                                                    ].filter(Boolean).map((label) => (
                                                        <Badge key={label as string} variant="secondary" className="text-[10px]">{label as string}</Badge>
                                                    ))}
                                                </div>
                                                {inferredConfig.usedAI && (
                                                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
                                                        <Sparkles className="size-3" />
                                                        AI-assisted{inferredConfig.tokenCount ? ` · ${inferredConfig.tokenCount} tokens` : ""}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Drop another file to re-detect</p>
                                        </>
                                    ) : (
                                        <>
                                            <FileUp className="size-6 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Drop a CSV file here</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={resetCreateDialog}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={!name || createDialogState === "inferring"}>
                                        Create preset
                                    </Button>
                                </DialogFooter>
                            </form>
                        </>
                    )}
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
                        await updatePreset({ presetId: _id as Id<"presets">, userId: convexUser._id, updates: rest });
                        setEditingPreset(null);
                    }}
                />
            )}
        </AppLayout>
    );
}
