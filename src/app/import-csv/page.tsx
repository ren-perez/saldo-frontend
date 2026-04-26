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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    processTransactions,
    validateCsvHeaders,
    type PresetConfig,
    type ValidationError,
    type NormalizedTransaction,
} from "@/utils/etl";
import { PresetDisplay, PresetNotFound } from "@/components/PresetDisplay";
import { ChevronDown, FileText, RotateCcw, Upload, CheckCircle, Check, Landmark } from "lucide-react";
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

function ValidationErrorList({ errors }: { errors: ValidationError[] }) {
    return (
        <div className="p-4 rounded-md border bg-destructive/10">
            <h3 className="text-sm font-medium text-destructive">
                Validation Errors ({errors.length})
            </h3>
            <div className="mt-2 max-h-48 overflow-y-auto">
                {errors.slice(0, 20).map((error, i) => (
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
                {errors.length > 20 && (
                    <div className="text-sm text-muted-foreground mt-2">
                        ... and {errors.length - 20} more errors
                    </div>
                )}
            </div>
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
    const [showResetConfirm, setShowResetConfirm] = useState(false);

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
            ? { userId: convexUser._id, accountId: selectedAccount, limit: 1000 }
            : "skip"
    );

    useEffect(() => {
        if (!convexUser) {
            setIsCheckingSession(false);
            return;
        }
        const sessionId = localStorage.getItem("import_session_id");
        if (sessionId) {
            setCurrentSessionId(sessionId);
            setImportPhase("reviewing");
        }
        setIsCheckingSession(false);
    }, [convexUser]);

    useEffect(() => {
        if (importSession?.accountId && !selectedAccount) {
            setSelectedAccount(importSession.accountId);
        }
    }, [importSession, selectedAccount]);

    const doReset = () => {
        setFile(null);
        setPreviewTransactions([]);
        setValidationErrors([]);
        setProcessingStats(null);
        setCurrentSessionId(null);
        setCompletedImportId(null);
        setImportPhase("upload");
        localStorage.removeItem("import_session_id");
    };

    const handleStartOver = () => {
        if (currentSessionId && importPhase === "reviewing") {
            setShowResetConfirm(true);
        } else {
            doReset();
        }
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

    const parseFile = async (file: File, preset: PresetConfig): Promise<Record<string, unknown>[]> => {
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
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" }));
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
                return;
            }
            const headers = preset.hasHeader ? Object.keys(rows[0]) : [];
            const headerErrors = validateCsvHeaders(headers, preset as PresetConfig);
            if (headerErrors.length > 0) {
                setValidationErrors(headerErrors);
                return;
            }
            const result = processTransactions(rows, preset as PresetConfig);
            setValidationErrors(result.errors);
            setPreviewTransactions(result.transactions.slice(0, 10));
            setProcessingStats(result.stats);
            setImportPhase("preview");
        } catch (error) {
            setValidationErrors([{ row: -1, column: "file", error: (error as Error).message, value: null }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = async () => {
        if (!convexUser || !selectedAccount || !preset || !file) return;

        // Clear any stale session that doesn't match the current one
        const existingSessionId = localStorage.getItem("import_session_id");
        if (existingSessionId && existingSessionId !== currentSessionId) {
            localStorage.removeItem("import_session_id");
        }

        let importId: Id<"imports"> | null = null;
        try {
            setIsProcessing(true);
            const rows = await parseFile(file, preset as PresetConfig);
            if (rows.length === 0) {
                setValidationErrors([{ row: -1, column: "file", error: "No data rows found in file", value: null }]);
                return;
            }
            const headers = preset.hasHeader ? Object.keys(rows[0]) : [];
            const headerErrors = validateCsvHeaders(headers, preset as PresetConfig);
            if (headerErrors.length > 0) {
                setValidationErrors(headerErrors);
                return;
            }
            const result = processTransactions(rows, preset as PresetConfig);
            if (result.errors.length > 0) {
                setValidationErrors(result.errors);
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
            await updateImportStatusMutation({ importId, status: "processing" });

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
                value: null,
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSessionResolved = async () => {
        if (!currentSessionId || !convexUser) return;
        try {
            await resolveImportSession({ sessionId: currentSessionId, userId: convexUser._id });
            if (importSession?.importId) {
                const importId = importSession.importId as Id<"imports">;
                setCompletedImportId(importId);
                await updateImportStatusMutation({ importId, status: "completed" });
            }
            localStorage.removeItem("import_session_id");
            setImportPhase("completed");
            setShowSuccessDialog(true);
        } catch (error) {
            console.error("Failed to resolve session:", error);
        }
    };

    const handleSuccessDialogClose = () => {
        setShowSuccessDialog(false);
        router.push("/transactions");
    };

    const selectedAccountData = accounts?.find(a => a._id === selectedAccount);
    const selectedAccountName = selectedAccountData?.name;
    const selectedAccountBank = selectedAccountData?.bank;
    const selectedAccountType = selectedAccountData?.type;

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-sm text-muted-foreground">Please sign in to continue.</p>
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

                {importPhase !== "completed" && (
                    <>
                        {importPhase !== "upload" && (
                            <div className="flex justify-end mb-4">
                                <Button onClick={handleStartOver} variant="outline" size="sm" className="gap-2">
                                    <RotateCcw className="size-3.5" />
                                    Start Over
                                </Button>
                            </div>
                        )}
                        <StepIndicator currentPhase={importPhase} />
                        {selectedAccountName && importPhase !== "upload" && (
                            <div className="flex justify-center -mt-4 mb-6">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/40 text-xs text-muted-foreground">
                                    <Landmark className="size-3 shrink-0" />
                                    <span className="font-medium text-foreground">{selectedAccountName}</span>
                                    {selectedAccountBank && <span>· {selectedAccountBank}</span>}
                                    {selectedAccountType && <span>· {selectedAccountType}</span>}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Duplicate Review Phase */}
                {importPhase === "reviewing" && importSession && existingTransactions && (
                    <DuplicateReview
                        session={importSession}
                        existingTransactions={existingTransactions}
                        onSessionResolved={handleSessionResolved}
                    />
                )}

                {/* Upload Phase */}
                {importPhase === "upload" && (
                    <div className="space-y-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">Account</label>
                            <Select
                                value={selectedAccount || ""}
                                onValueChange={(v) => setSelectedAccount(v ? v as Id<"accounts"> : null)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose an account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts?.map((account) => (
                                        <SelectItem key={account._id} value={account._id}>
                                            {account.name} ({account.bank})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedAccount && preset && (
                            <Collapsible open={presetOpen} onOpenChange={setPresetOpen}>
                                <CollapsibleTrigger asChild>
                                    <button className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">Preset Mapping</span>
                                            <Badge variant="secondary" className="text-[10px]">{preset.name}</Badge>
                                        </div>
                                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", presetOpen && "rotate-180")} />
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2">
                                    <PresetDisplay preset={preset} mode="detailed" showHeader={false} showAdvanced={true} />
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {selectedAccount && !preset && (
                            <PresetNotFound accountName={selectedAccountName} />
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">File</label>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                                className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                            />
                        </div>

                        {validationErrors.length > 0 && <ValidationErrorList errors={validationErrors} />}

                        <Button
                            onClick={handlePreview}
                            disabled={!file || !preset || isProcessing}
                            className="gap-1.5"
                        >
                            {isProcessing ? "Processing..." : "Preview"}
                        </Button>
                    </div>
                )}

                {/* Preview Phase */}
                {importPhase === "preview" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-lg border bg-muted/40 text-sm">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">File:</span>
                            <span className="font-medium truncate">{file?.name}</span>
                        </div>

                        {processingStats && (
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

                        {validationErrors.length > 0 && <ValidationErrorList errors={validationErrors} />}

                        {previewTransactions.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium mb-3">Transaction Preview (first 10)</h3>
                                <div className="overflow-x-auto border rounded-md border-border">
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-muted">
                                            <tr>
                                                {["Date", "Amount", "Description", "Category", "Type"].map((h) => (
                                                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewTransactions.map((t, i) => (
                                                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                                                    <td className="px-4 py-2.5 text-sm">{t.date}</td>
                                                    <td className="px-4 py-2.5 text-sm">
                                                        <span className={t.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                                            ${t.amount.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm max-w-xs truncate">{t.description}</td>
                                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{t.category || "—"}</td>
                                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{t.transactionType || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {previewTransactions.length > 0 && validationErrors.length === 0 && (
                            <Button onClick={handleImport} disabled={isProcessing} className="gap-1.5">
                                <Upload className="size-3.5" />
                                {isProcessing ? "Importing..." : `Import ${processingStats?.validRows || 0} Transactions`}
                            </Button>
                        )}
                    </div>
                )}

                {/* Reset Confirmation */}
                <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Abandon current import?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You have an unfinished import session with pending duplicate reviews. Starting a new import will abandon it and those transactions will not be imported.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { setShowResetConfirm(false); doReset(); }}>
                                Start Over
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Success Dialog */}
                <Dialog open={showSuccessDialog} onOpenChange={(open) => { if (!open) handleSuccessDialogClose(); }}>
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

                        {completedImportId && (
                            <ImportAllocationStatus
                                importId={completedImportId}
                                formatCurrency={(amount: number) =>
                                    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
                                }
                            />
                        )}

                        <DialogFooter className="gap-2 mt-6">
                            <Button variant="outline" onClick={() => { setShowSuccessDialog(false); doReset(); }}>
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
