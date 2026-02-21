// src/app/import-csv/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import DuplicateReview from "@/components/DuplicateReview";
import { ImportAllocationStatus } from "@/components/goals/ImportAllocationStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    processTransactions,
    validateCsvHeaders,
    type PresetConfig,
    type ValidationError,
    type NormalizedTransaction,
} from "@/utils/etl";
import { PresetDisplay, PresetNotFound } from "@/components/PresetDisplay";
import { Info, ChevronDown, FileText, RotateCcw, Upload, CheckCircle, Check, Import, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
    { key: "upload", label: "Setup" },
    { key: "preview", label: "Preview" },
    { key: "reviewing", label: "Import" },
] as const;

function StepIndicator({ currentPhase }: { currentPhase: string }) {
    const phaseOrder = ["upload", "preview", "reviewing", "completed"];
    const currentIndex = phaseOrder.indexOf(currentPhase);

    return (
        <div className="flex items-center gap-0 w-full max-w-md mx-auto mb-8">
            {STEPS.map((step, i) => {
                const stepIndex = phaseOrder.indexOf(step.key);
                const isCompleted = currentIndex > stepIndex || currentPhase === "completed";
                const isCurrent = currentIndex === stepIndex;

                return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={cn(
                                    "flex items-center justify-center size-8 rounded-full border-2 text-xs font-semibold transition-colors",
                                    isCompleted
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : isCurrent
                                            ? "border-primary text-primary bg-primary/10"
                                            : "border-muted-foreground/30 text-muted-foreground/50"
                                )}
                            >
                                {isCompleted ? <Check className="size-4" /> : i + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-[11px] font-medium",
                                    isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground/50"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    "h-0.5 flex-1 mx-2 rounded-full transition-colors -mt-5",
                                    currentIndex > stepIndex ? "bg-primary" : "bg-muted-foreground/20"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function CsvImporterPage() {
    const router = useRouter();
    const { convexUser } = useConvexUser();
    const [selectedAccount, setSelectedAccount] = useState<Id<"accounts"> | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewTransactions, setPreviewTransactions] = useState<NormalizedTransaction[]>([]);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [processingStats, setProcessingStats] = useState<{
        totalRows: number;
        validRows: number;
        errorRows: number;
        warningRows: number;
    } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [completedImportId, setCompletedImportId] = useState<Id<"imports"> | null>(null);
    const [importPhase, setImportPhase] = useState<"upload" | "preview" | "reviewing" | "completed">("upload");
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [presetOpen, setPresetOpen] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    // Queries & Mutations
    const accounts = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const preset = useQuery(
        api.accounts.getAccountPreset,
        selectedAccount ? { accountId: selectedAccount } : "skip"
    );

    const importTransactions = useMutation(api.transactions.importTransactions);
    const resolveImportSession = useMutation(api.transactions.resolveImportSession);
    const getUploadUrl = useAction(api.importActions.getUploadUrl);
    const registerImportMutation = useMutation(api.imports.registerImport);
    const updateImportStatusMutation = useMutation(api.imports.updateImportStatus);

    const importSession = useQuery(
        api.transactions.loadImportSession,
        currentSessionId && convexUser
            ? { sessionId: currentSessionId, userId: convexUser._id }
            : "skip"
    );

    const existingTransactions = useQuery(
        api.transactions.listTransactions,
        importSession && selectedAccount && convexUser
            ? {
                userId: convexUser._id,
                accountId: selectedAccount,
                limit: 1000
            }
            : "skip"
    );

    // Check for existing session on load
    useEffect(() => {
        if (!convexUser) {
            setIsCheckingSession(false);
            return;
        }

        const sessionId = localStorage.getItem('import_session_id');
        if (sessionId) {
            setCurrentSessionId(sessionId);
            setImportPhase("reviewing");
        }
        setIsCheckingSession(false);
    }, [convexUser]);

    // Set selectedAccount when session loads
    useEffect(() => {
        if (importSession && importSession.accountId && !selectedAccount) {
            setSelectedAccount(importSession.accountId);
        }
    }, [importSession, selectedAccount]);

    const resetImportState = () => {
        if (currentSessionId && importPhase === "reviewing") {
            const confirmed = window.confirm(
                "You have an unfinished import session with pending duplicate reviews. " +
                "Starting a new import will abandon the current session and those transactions will not be imported. " +
                "Are you sure you want to continue?"
            );

            if (!confirmed) {
                return;
            }
        }

        setFile(null);
        setPreviewTransactions([]);
        setValidationErrors([]);
        setProcessingStats(null);
        setCurrentSessionId(null);
        setCompletedImportId(null);
        setImportPhase("upload");
        localStorage.removeItem('import_session_id');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setPreviewTransactions([]);
            setValidationErrors([]);
            setProcessingStats(null);
            setImportPhase("upload");
        }
    };

    const parseFile = async (
        file: File,
        preset: PresetConfig
    ): Promise<Record<string, unknown>[]> => {
        const extension = file.name.split(".").pop()?.toLowerCase();

        return new Promise((resolve, reject) => {
            if (extension === "csv") {
                Papa.parse(file, {
                    header: preset.hasHeader,
                    delimiter: preset.delimiter,
                    skipEmptyLines: true,
                    complete: (results) => resolve(results.data as Record<string, unknown>[]),
                    error: (error) => reject(new Error(`CSV parsing error: ${error.message}`)),
                });
            } else if (extension === "xlsx" || extension === "xls") {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: "array" });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
                        resolve(rows);
                    } catch (err) {
                        reject(new Error(`XLSX parsing error: ${(err as Error).message}`));
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                reject(new Error("Unsupported file type. Please use CSV, XLSX, or XLS files."));
            }
        });
    };

    const handlePreview = async () => {
        if (!file || !preset) return;

        try {
            setIsProcessing(true);

            const rows = await parseFile(file, preset as PresetConfig);
            if (rows.length === 0) {
                setValidationErrors([{ row: -1, column: "file", error: "No data rows found in file", value: null }]);
                setIsProcessing(false);
                return;
            }

            const headers = preset.hasHeader ? Object.keys(rows[0]) : [];
            const headerErrors = validateCsvHeaders(headers, preset as PresetConfig);
            if (headerErrors.length > 0) {
                setValidationErrors(headerErrors);
                setIsProcessing(false);
                return;
            }

            const result = processTransactions(rows, preset as PresetConfig);
            setValidationErrors(result.errors);
            setPreviewTransactions(result.transactions.slice(0, 10));
            setProcessingStats(result.stats);
            setImportPhase("preview");
            setIsProcessing(false);
        } catch (error) {
            setValidationErrors([{ row: -1, column: "file", error: (error as Error).message, value: null }]);
            setIsProcessing(false);
        }
    };

    const handleImport = async () => {
        if (!convexUser || !selectedAccount || !preset || !file) return;

        const existingSessionId = localStorage.getItem('import_session_id');
        if (existingSessionId && existingSessionId !== currentSessionId) {
            const confirmed = window.confirm(
                "Another import session is already in progress. " +
                "Starting a new import will abandon that session and those transactions may not be imported. " +
                "Are you sure you want to continue?"
            );

            if (!confirmed) {
                return;
            }

            localStorage.removeItem('import_session_id');
        }

        let importId: Id<"imports"> | null = null;

        try {
            setIsProcessing(true);

            const rows = await parseFile(file, preset as PresetConfig);
            if (rows.length === 0) {
                setValidationErrors([{ row: -1, column: "file", error: "No data rows found in file", value: null }]);
                setIsProcessing(false);
                return;
            }

            const headers = preset.hasHeader ? Object.keys(rows[0]) : [];
            const headerErrors = validateCsvHeaders(headers, preset as PresetConfig);
            if (headerErrors.length > 0) {
                setValidationErrors(headerErrors);
                setIsProcessing(false);
                return;
            }

            const result = processTransactions(rows, preset as PresetConfig);
            if (result.errors.length > 0) {
                setValidationErrors(result.errors);
                setIsProcessing(false);
                return;
            }

            const { uploadUrl, fileKey } = await getUploadUrl({
                userId: convexUser._id,
                fileName: file.name,
                contentType: file.type || "application/octet-stream",
            });

            await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            });

            const registerResult = await registerImportMutation({
                userId: convexUser._id,
                accountId: selectedAccount,
                fileKey,
                fileName: file.name,
                contentType: file.type || "application/octet-stream",
                size: file.size,
            });

            importId = registerResult.importId;

            await updateImportStatusMutation({
                importId,
                status: "processing",
            });

            const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const transactionsForConvex = result.transactions.map((t, index) => ({
                date: new Date(t.date).getTime(),
                amount: t.amount,
                description: t.description,
                category: t.category,
                transactionType: t.transactionType,
                rawData: { ...t, originalRowIndex: index },
            }));

            const importResult = await importTransactions({
                userId: convexUser._id,
                accountId: selectedAccount,
                transactions: transactionsForConvex,
                sessionId,
                importId,
            });

            if (importResult.hasDuplicates) {
                localStorage.setItem("import_session_id", sessionId);
                setCurrentSessionId(sessionId);
                setImportPhase("reviewing");
            } else {
                await updateImportStatusMutation({ importId, status: "completed" });
                setCompletedImportId(importId);
                setImportPhase("completed");
                setShowSuccessDialog(true);
            }

            setIsProcessing(false);
        } catch (error) {
            console.error("Import error:", error);

            if (importId) {
                await updateImportStatusMutation({
                    importId,
                    status: "failed",
                    error: (error as Error).message,
                });
            }

            setValidationErrors([{
                row: -1,
                column: "file",
                error: `Import failed: ${(error as Error).message}`,
                value: null
            }]);
            setIsProcessing(false);
        }
    };

    const handleSessionResolved = async () => {
        if (!currentSessionId || !convexUser) return;

        try {
            await resolveImportSession({
                sessionId: currentSessionId,
                userId: convexUser._id,
            });

            if (importSession?.importId) {
                const importId = importSession.importId as Id<"imports">;
                setCompletedImportId(importId);

                await updateImportStatusMutation({
                    importId,
                    status: "completed"
                });
            }

            localStorage.removeItem('import_session_id');
            setImportPhase("completed");
            setShowSuccessDialog(true);
        } catch (error) {
            console.error("Failed to resolve session:", error);
            alert("Failed to complete import");
        }
    };

    const handleSuccessDialogClose = () => {
        setShowSuccessDialog(false);
        router.push("/transactions");
    };

    const selectedAccountName = accounts?.find(a => a._id === selectedAccount)?.name;
    const selectedAccountBank = accounts?.find(a => a._id === selectedAccount)?.bank;

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Please sign in to view transactions.</div>
                </div>
            </AppLayout>
        );
    }

    if (isCheckingSession) {
        return (
            <AppLayout>
                <InitUser />
                <div className="flex items-center justify-center h-64">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground border-t-transparent" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <InitUser />
            <div className="container mx-auto py-6 px-6">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
                        <Import className="h-8 w-8 text-primary" />
                        Import Transactions
                    </h1>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                                <div className="space-y-1 text-xs">
                                    <p>1. Select the account to import transactions for</p>
                                    <p>2. Make sure the account has a preset linked</p>
                                    <p>3. Choose your CSV/XLSX file</p>
                                    <p>4. Preview and validate the data</p>
                                    <p>5. Confirm and import all transactions</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* ── CTAs ── */}
                <div className="mb-8 flex items-center gap-2 justify-end">
                    {importPhase !== "upload" && importPhase !== "completed" && (
                        <Button
                            onClick={resetImportState}
                            variant="outline"
                            className="ml-auto gap-2"
                        >
                            <RotateCcw className="size-4" />
                            Start Over
                        </Button>
                    )}
                </div>

                {/* Step Indicator */}
                {importPhase !== "completed" && (
                    <StepIndicator currentPhase={importPhase} />
                )}

                {/* Duplicate Review Phase */}
                {importPhase === "reviewing" && importSession && existingTransactions && (
                    <DuplicateReview
                        session={importSession}
                        existingTransactions={existingTransactions}
                        onSessionResolved={handleSessionResolved}
                    />
                )}

                {/* Upload Phase - Step 1: Account + Preset + File */}
                {importPhase === "upload" && (
                    <div className="space-y-5">
                        {/* Account Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Select Account</label>
                            <select
                                value={selectedAccount || ""}
                                onChange={(e) => setSelectedAccount(e.target.value ? e.target.value as Id<"accounts"> : null)}
                                className="w-full p-2 border rounded-md bg-background text-foreground border-border"
                            >
                                <option value="">Choose an account...</option>
                                {accounts?.map((account) => (
                                    <option key={account._id} value={account._id}>
                                        {account.name} ({account.bank})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Preset Display as Collapsible */}
                        {selectedAccount && preset && (
                            <Collapsible open={presetOpen} onOpenChange={setPresetOpen}>
                                <CollapsibleTrigger asChild>
                                    <button className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">Preset Mapping</span>
                                            <Badge variant="secondary" className="text-[10px]">{preset.name}</Badge>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${presetOpen ? "rotate-180" : ""}`} />
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2">
                                    <PresetDisplay
                                        preset={preset}
                                        mode="detailed"
                                        showHeader={false}
                                        showAdvanced={true}
                                    />
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {selectedAccount && !preset && (
                            <PresetNotFound
                                accountName={selectedAccountName}
                            />
                        )}

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Select CSV or XLSX File</label>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                                className="w-full p-2 border rounded-md bg-background text-foreground border-border"
                            />
                        </div>

                        {/* Validation Errors (shown in upload phase too) */}
                        {validationErrors.length > 0 && (
                            <div className="p-4 rounded-md border bg-destructive/10">
                                <h3 className="text-sm font-medium text-destructive">
                                    Validation Errors ({validationErrors.length}):
                                </h3>
                                <div className="mt-2 max-h-48 overflow-y-auto">
                                    {validationErrors.slice(0, 20).map((error, i) => (
                                        <div key={i} className="text-sm text-destructive py-1">
                                            {error.row > 0 ? `Row ${error.row}: ` : ""}
                                            {error.column && `[${error.column}] `}
                                            {error.error}
                                            {error.value !== null && error.value !== undefined && (
                                                <span className="font-mono bg-destructive/20 px-1 ml-2">
                                                    &quot;{String(error.value)}&quot;
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {validationErrors.length > 20 && (
                                        <div className="text-sm text-muted-foreground mt-2">
                                            ... and {validationErrors.length - 20} more errors
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Preview Button */}
                        <Button
                            onClick={handlePreview}
                            disabled={!file || !preset || isProcessing}
                            className="gap-1.5"
                        >
                            {isProcessing ? "Processing..." : "Preview CSV"}
                        </Button>
                    </div>
                )}

                {/* Preview Phase - Step 2: Preview Table + Confirm */}
                {importPhase === "preview" && (
                    <div className="space-y-6">
                        {/* Context bar: account + file info */}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-3 px-4 rounded-lg border bg-muted/50">
                            <div className="flex flex-col gap-3 sm:flex-row sm:gap-8 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">Account:</span>
                                    <span className="font-medium">{selectedAccountName}</span>
                                    {selectedAccountBank && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {selectedAccountBank}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">File:</span>
                                    <span className="font-medium">{file?.name}</span>
                                </div>
                            </div>

                            {/* <div className="text-right">
                                <Button
                                    variant="outline"
                                    className="gap-2 text-muted-foreground self-start lg:self-auto"
                                    onClick={resetImportState}
                                >
                                    <RotateCcw className="size-3" />
                                    Reset
                                </Button>
                            </div> */}
                        </div>

                        {/* Processing Stats */}
                        {processingStats && (
                            // <div className="p-4 rounded-md border bg-muted">
                            <div>
                                <h3 className="text-sm font-medium">Processing Summary</h3>
                                <div className="mt-1.5 flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>Total rows: <span className="font-medium text-foreground">{processingStats.totalRows || 0}</span></span>
                                    <span>Valid: <span className="font-medium text-green-600/90">{processingStats.validRows || 0}</span></span>
                                    {(processingStats.errorRows || 0) > 0 && (
                                        <span>Errors: <span className="font-medium text-red-600/90">{processingStats.errorRows || 0}</span></span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div className="p-4 rounded-md border bg-destructive/10">
                                <h3 className="text-sm font-medium text-destructive">
                                    Validation Errors ({validationErrors.length}):
                                </h3>
                                <div className="mt-2 max-h-48 overflow-y-auto">
                                    {validationErrors.slice(0, 20).map((error, i) => (
                                        <div key={i} className="text-sm text-destructive py-1">
                                            {error.row > 0 ? `Row ${error.row}: ` : ""}
                                            {error.column && `[${error.column}] `}
                                            {error.error}
                                            {error.value !== null && error.value !== undefined && (
                                                <span className="font-mono bg-destructive/20 px-1 ml-2">
                                                    &quot;{String(error.value)}&quot;
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {validationErrors.length > 20 && (
                                        <div className="text-sm text-muted-foreground mt-2">
                                            ... and {validationErrors.length - 20} more errors
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Preview Table */}
                        {previewTransactions.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium mb-3">
                                    Transaction Preview (first 10):
                                </h3>
                                <div className="overflow-x-auto border rounded-md border-border">
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">Category</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewTransactions.map((transaction, i) => (
                                                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                                                    <td className="px-4 py-2.5 text-sm">{transaction.date}</td>
                                                    <td className="px-4 py-2.5 text-sm">
                                                        <span className={transaction.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                                            ${transaction.amount.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm max-w-xs truncate">{transaction.description}</td>
                                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{transaction.category || "-"}</td>
                                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{transaction.transactionType || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Import Button */}
                        {previewTransactions.length > 0 && validationErrors.length === 0 && (
                            <Button
                                onClick={handleImport}
                                disabled={isProcessing}
                                className="gap-1.5"
                            >
                                <Upload className="size-3.5" />
                                {isProcessing ? "Importing..." : `Upload ${processingStats?.validRows || 0} Transactions`}
                            </Button>
                        )}
                    </div>
                )}

                {/* Success Dialog */}
                <Dialog open={showSuccessDialog} onOpenChange={(open) => {
                    if (!open) handleSuccessDialogClose();
                }}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                <CheckCircle className="h-5 w-5" />
                                Import Completed
                            </DialogTitle>
                            <DialogDescription>
                                All transactions have been processed and imported to your account.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Import Allocation Status */}
                        {completedImportId && (
                            <ImportAllocationStatus
                                importId={completedImportId}
                                formatCurrency={(amount: number) =>
                                    new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD'
                                    }).format(amount)
                                }
                            />
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => {
                                setShowSuccessDialog(false);
                                resetImportState();
                            }}>
                                Import Another File
                            </Button>
                            <Button onClick={handleSuccessDialogClose}>
                                Go to Transactions
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
