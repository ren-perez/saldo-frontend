// src/app/presets/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { EditPresetDialog } from "@/components/EditPresetDialog";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Upload, Settings2, Trash2, FileText, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

type AmountProcessingTypeA = {
    amount_column: string;
    amount_multiplier: number;
    credit_values: string[];
    debit_values: string[];
    transaction_type_column: string;
};

type AmountProcessingTypeB = {
    credit_column: string;
    credit_multiplier: number;
    debit_column: string;
    debit_multiplier: number;
};

export type AmountProcessing = AmountProcessingTypeA | AmountProcessingTypeB;


function LinkedAccounts({ presetId, accounts }: { presetId: Id<"presets">; accounts: Array<{ _id: Id<"accounts">; name: string; bank: string }> }) {
    const linkedAccounts = useQuery(api.presets.getPresetAccounts, { presetId });

    if (!linkedAccounts) return null;

    const linkedNames = accounts
        .filter((acc) => linkedAccounts.includes(acc._id))
        .map((acc) => acc.name);

    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {linkedNames.length > 0 ? (
                linkedNames.map((name) => (
                    <Badge key={name} variant="secondary" className="text-[10px]">
                        {name}
                    </Badge>
                ))
            ) : (
                <span className="text-xs text-muted-foreground italic">No linked accounts</span>
            )}
        </div>
    );
}

function ImportHistoryTab() {
    const { convexUser } = useConvexUser();
    const imports = useQuery(
        api.imports.getImportHistory,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const activeSessions = useQuery(
        api.imports.getActiveImportSessions,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <Badge variant="default" className="bg-green-600 text-[10px]">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                    </Badge>
                );
            case "failed":
                return (
                    <Badge variant="destructive" className="text-[10px]">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                );
            case "processing":
                return (
                    <Badge variant="secondary" className="text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />
                        Processing
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px]">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {status}
                    </Badge>
                );
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleResumeSession = (sessionId: string) => {
        localStorage.setItem('import_session_id', sessionId);
        window.location.href = '/import-csv';
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Active/Pending Sessions */}
            {activeSessions && activeSessions.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                            <AlertCircle className="h-4 w-4" />
                            {activeSessions.length} pending import{activeSessions.length > 1 ? 's' : ''} awaiting review
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            {activeSessions.map((session) => (
                                <div
                                    key={session._id}
                                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-sm font-medium truncate">{session.fileName}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span>{session.accountName}</span>
                                            <Badge variant="outline" className="text-[10px]">
                                                {session.duplicates.length} duplicates
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleResumeSession(session.sessionId)}
                                        className="bg-orange-600 hover:bg-orange-700 text-xs h-7"
                                    >
                                        Resume
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {!imports || imports.length === 0 ? (
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">No imports yet</p>
                    <p className="text-xs text-muted-foreground mb-4">
                        Import your first CSV file to get started
                    </p>
                    <Button size="sm" asChild>
                        <Link href="/import-csv">Import CSV</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {imports.map((importRecord) => (
                        <Card key={importRecord._id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-sm font-medium truncate">{importRecord.fileName}</span>
                                            {getStatusBadge(importRecord.status)}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(importRecord.uploadedAt), 'MMM d, yyyy HH:mm')}
                                            </span>
                                            <span>{formatFileSize(importRecord.size)}</span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs">
                                            {importRecord.importedCount !== undefined && (
                                                <span>
                                                    <span className="text-muted-foreground">Imported: </span>
                                                    <span className="font-medium text-green-600">{importRecord.importedCount}</span>
                                                </span>
                                            )}
                                            {importRecord.skippedCount !== undefined && importRecord.skippedCount > 0 && (
                                                <span>
                                                    <span className="text-muted-foreground">Skipped: </span>
                                                    <span className="font-medium text-orange-600">{importRecord.skippedCount}</span>
                                                </span>
                                            )}
                                            {importRecord.errorCount !== undefined && importRecord.errorCount > 0 && (
                                                <span>
                                                    <span className="text-muted-foreground">Errors: </span>
                                                    <span className="font-medium text-red-600">{importRecord.errorCount}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="text-xs h-7 shrink-0" asChild>
                                        <Link href={`/imports/${importRecord._id}`}>
                                            Details
                                        </Link>
                                    </Button>
                                </div>
                                {importRecord.error && (
                                    <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                                        {importRecord.error}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

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

    const [editingPreset, setEditingPreset] = useState<{
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
    } | null>(null);

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Sign in required</p>
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

    return (
        <AppLayout>
            <InitUser />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Presets</h1>
                    <p className="text-muted-foreground">Configure how to import your bank statements. Each bank exports data differently.</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="presets">Presets</TabsTrigger>
                            <TabsTrigger value="history">Import History</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" asChild>
                                <Link href="/import-csv">
                                    <Upload className="size-3" />
                                    Import CSV
                                </Link>
                            </Button>
                            {activeTab === "presets" && (
                                <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowCreateDialog(true)}>
                                    <Plus className="size-3" />
                                    New Preset
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Presets Tab */}
                    <TabsContent value="presets">
                        {(!presets || presets.length === 0) ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">&#9881;</div>
                                <p className="text-sm text-muted-foreground mb-1">No presets yet</p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Create your first preset to configure CSV imports
                                </p>
                                <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                                    <Plus className="size-3.5" />
                                    New Preset
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {presets.map((preset) => (
                                    <Card key={preset._id} className="hover:shadow-sm transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-sm font-semibold text-foreground truncate">{preset.name}</h3>
                                                    <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => setEditingPreset(preset)}
                                                    >
                                                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to delete this preset?")) {
                                                                deletePreset({ presetId: preset._id });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Preset Config Details */}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground bg-muted/50 rounded p-2 mb-2">
                                                <span><strong>Delimiter:</strong> &quot;{preset.delimiter}&quot;</span>
                                                <span><strong>Header:</strong> {preset.hasHeader ? "Yes" : "No"}</span>
                                                <span><strong>Date:</strong> {preset.dateColumn}</span>
                                                <span><strong>Amount:</strong> {preset.amountColumns.join(", ")}</span>
                                            </div>

                                            {/* Linked Accounts */}
                                            <LinkedAccounts presetId={preset._id as Id<"presets">} accounts={accounts ?? []} />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Import History Tab */}
                    <TabsContent value="history">
                        <ImportHistoryTab />
                    </TabsContent>
                </Tabs>

                {/* Create Preset Dialog */}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Preset</DialogTitle>
                            <DialogDescription>
                                Add a new import preset for a bank statement format.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreatePreset} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium">Preset Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Capital One Checking"
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
                                <Button type="submit">Create Preset</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
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
            </div>
        </AppLayout>
    );
}
