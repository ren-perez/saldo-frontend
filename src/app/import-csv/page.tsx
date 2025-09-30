// src/app/import-csv/page.tsx
"use client";
import { useState, useEffect } from "react";
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
import {
    processTransactions,
    validateCsvHeaders,
    type PresetConfig,
    type ValidationError,
    type NormalizedTransaction,
} from "@/utils/etl";
import { PresetDisplay, PresetNotFound } from "@/components/PresetDisplay";

export default function CsvImporterPage() {
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
    const resolveDuplicates = useMutation(api.transactions.resolveDuplicates);
    const resolveImportSession = useMutation(api.transactions.resolveImportSession); // ✅ Added
    // const uploadFileToR2 = useMutation(api.imports.uploadFileToR2);
    const getUploadUrl = useAction(api.importActions.getUploadUrl);
    const registerImportMutation = useMutation(api.imports.registerImport);
    const updateImportStatusMutation = useMutation(api.imports.updateImportStatus);

    // ✅ Fixed: Use transactions API instead of imports API
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
        // Warn user if there's an active session
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

    // const handleImport = async () => {
    //     if (!convexUser || !selectedAccount || !preset || !file) return;

    //     let importId: Id<"imports"> | null = null;

    //     try {
    //         setIsProcessing(true);

    //         // Parse and validate
    //         const rows = await parseFile(file, preset as PresetConfig);
    //         if (rows.length === 0) {
    //             setValidationErrors([{ row: -1, column: "file", error: "No data rows found in file", value: null }]);
    //             setIsProcessing(false);
    //             return;
    //         }

    //         const headers = preset.hasHeader ? Object.keys(rows[0]) : [];
    //         const headerErrors = validateCsvHeaders(headers, preset as PresetConfig);
    //         if (headerErrors.length > 0) {
    //             setValidationErrors(headerErrors);
    //             setIsProcessing(false);
    //             return;
    //         }

    //         const result = processTransactions(rows, preset as PresetConfig);
    //         if (result.errors.length > 0) {
    //             setValidationErrors(result.errors);
    //             setIsProcessing(false);
    //             return;
    //         }

    //         // Upload file to R2
    //         const fileData = await file.arrayBuffer();
    //         const uploadResult = await uploadFileToR2({
    //             userId: convexUser._id,
    //             fileName: file.name,
    //             contentType: file.type || "application/octet-stream",
    //             fileData: fileData,
    //         });

    //         // Register import
    //         const registerResult = await registerImportMutation({
    //             userId: convexUser._id,
    //             accountId: selectedAccount,
    //             fileKey: uploadResult.fileKey,
    //             fileName: file.name,
    //             contentType: file.type || "application/octet-stream",
    //             size: file.size,
    //         });

    //         importId = registerResult.importId;

    //         // Update status to processing
    //         await updateImportStatusMutation({
    //             importId: importId,
    //             status: "processing",
    //         });

    //         // Generate session ID
    //         const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    //         // Map transactions for Convex
    //         const transactionsForConvex = result.transactions.map((t, index) => ({
    //             date: new Date(t.date).getTime(),
    //             amount: t.amount,
    //             description: t.description,
    //             category: t.category,
    //             transactionType: t.transactionType,
    //             rawData: { ...t, originalRowIndex: index },
    //         }));

    //         // Import transactions
    //         const importResult = await importTransactions({
    //             userId: convexUser._id,
    //             accountId: selectedAccount,
    //             transactions: transactionsForConvex,
    //             sessionId,
    //             importId: importId,
    //         });

    //         // Handle result
    //         if (importResult.hasDuplicates) {
    //             localStorage.setItem("import_session_id", sessionId);
    //             setCurrentSessionId(sessionId);
    //             setImportPhase("reviewing");
    //         } else {
    //             await updateImportStatusMutation({
    //                 importId: importId,
    //                 status: "completed",
    //             });
    //             setImportPhase("completed");
    //             alert(`Successfully imported ${importResult.inserted} transactions!`);
    //         }

    //         setIsProcessing(false);
    //     } catch (error) {
    //         console.error("Import error:", error);

    //         if (importId) {
    //             try {
    //                 await updateImportStatusMutation({
    //                     importId: importId,
    //                     status: "failed",
    //                     error: (error as Error).message,
    //                 });
    //             } catch (updateError) {
    //                 console.error("Failed to update import status:", updateError);
    //             }
    //         }

    //         setValidationErrors([{
    //             row: -1,
    //             column: "file",
    //             error: `Import failed: ${(error as Error).message}`,
    //             value: null
    //         }]);
    //         setIsProcessing(false);
    //     }
    // };

    // ✅ Fixed: Simplified handler with no parameters

    const handleImport = async () => {
        if (!convexUser || !selectedAccount || !preset || !file) return;

        // Check if there's an active session before starting a new import
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

            // Clear the old session
            localStorage.removeItem('import_session_id');
        }

        let importId: Id<"imports"> | null = null;

        try {
            setIsProcessing(true);

            // ✅ Step 1: Parse and validate
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

            // ✅ Step 2: Ask Convex for a presigned URL
            const { uploadUrl, fileKey } = await getUploadUrl({
                userId: convexUser._id,
                fileName: file.name,
                contentType: file.type || "application/octet-stream",
            });

            // ✅ Step 3: Upload directly to R2 from client
            await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            });

            // ✅ Step 4: Register import metadata in Convex
            const registerResult = await registerImportMutation({
                userId: convexUser._id,
                accountId: selectedAccount,
                fileKey,
                fileName: file.name,
                contentType: file.type || "application/octet-stream",
                size: file.size,
            });

            importId = registerResult.importId;

            // ✅ Step 5: Update status
            await updateImportStatusMutation({
                importId,
                status: "processing",
            });

            // ✅ Step 6: Create session + import transactions
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
                alert(`Successfully imported ${importResult.inserted} transactions!`);
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

            // Get the importId from the session before completing
            if (importSession?.importId) {
                const importId = importSession.importId as Id<"imports">;
                setCompletedImportId(importId);

                // Update import status to completed
                await updateImportStatusMutation({
                    importId,
                    status: "completed"
                });
            }

            localStorage.removeItem('import_session_id');
            setImportPhase("completed");
            alert("Import completed successfully!");
        } catch (error) {
            console.error("Failed to resolve session:", error);
            alert("Failed to complete import");
        }
    };

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
            <div className="w-full min-w-0 mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-4xl">
                <div className="py-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold">Import Transactions</h1>
                        {importPhase !== "upload" && (
                            <Button onClick={resetImportState} variant="outline" size="sm">
                                Start New Import
                            </Button>
                        )}
                    </div>

                    {/* Duplicate Review Phase */}
                    {importPhase === "reviewing" && importSession && existingTransactions && (
                        <DuplicateReview
                            session={importSession}
                            existingTransactions={existingTransactions}
                            onSessionResolved={handleSessionResolved}
                        />
                    )}

                    {/* Completion Message */}
                    {importPhase === "completed" && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-md border bg-green-50 dark:bg-green-950/20">
                            <h2 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
                                ✅ Import Completed Successfully!
                            </h2>
                            <p className="text-green-600 dark:text-green-400">
                                All transactions have been processed and imported to your account.
                            </p>
                        </div>

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

                            <div className="flex gap-4">
                                <Button onClick={resetImportState}>
                                    Import Another File
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Upload/Preview Phase */}
                    {importPhase !== "reviewing" && importPhase !== "completed" && (
                        <div className="space-y-6">
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

                            {/* Preset Display */}
                            {selectedAccount && preset && (
                                <div>
                                    <PresetDisplay
                                        preset={preset}
                                        mode="detailed"
                                        showHeader={true}
                                        showAdvanced={true}
                                    />
                                </div>
                            )}

                            {selectedAccount && !preset && (
                                <PresetNotFound
                                    accountName={accounts?.find(a => a._id === selectedAccount)?.name}
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

                        {/* Preview Button */}
                        <Button
                            onClick={handlePreview}
                            disabled={!file || !preset || isProcessing}
                            className="mb-6"
                        >
                            {isProcessing ? "Processing..." : "Preview CSV"}
                        </Button>

                        {/* Processing Stats */}
                        {processingStats && (
                            <div className="mb-6 p-4 rounded-md border bg-muted">
                                <h3 className="text-lg font-medium">Processing Summary</h3>
                                <div className="mt-2 text-sm text-muted-foreground">
                                    <div>Total rows processed: {processingStats.totalRows || 0}</div>
                                    <div>Valid transactions: {processingStats.validRows || 0}</div>
                                    {(processingStats.errorRows || 0) > 0 && (
                                        <div>Rows with errors: {processingStats.errorRows || 0}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div className="mb-6 p-4 rounded-md border bg-destructive/10">
                                <h3 className="text-lg font-medium text-destructive">
                                    Validation Errors ({validationErrors.length}):
                                </h3>
                                <div className="mt-2 max-h-64 overflow-y-auto">
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
                            <div className="mb-6">
                                <h3 className="text-lg font-medium mb-4">
                                    Normalized Transaction Preview (first 10):
                                </h3>
                                <div className="overflow-x-auto border rounded-md border-border">
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Category</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewTransactions.map((transaction, i) => (
                                                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted"}>
                                                    <td className="px-4 py-3 text-sm">{transaction.date}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={transaction.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                                            ${transaction.amount.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm max-w-xs truncate">{transaction.description}</td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">{transaction.category || "-"}</td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">{transaction.transactionType || "-"}</td>
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
                                className="mb-6"
                            >
                                {isProcessing ? "Importing..." : `Import All ${processingStats?.validRows || 0} Transactions`}
                            </Button>
                        )}

                            {/* Instructions */}
                            <div className="p-6 rounded-md border bg-muted">
                                <h3 className="text-lg font-medium mb-4">Instructions:</h3>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div>1. Select the account you want to import transactions for</div>
                                    <div>2. Make sure the account has a preset linked to it</div>
                                    <div>3. Choose your CSV file</div>
                                    <div>4. Click &quot;Preview CSV&quot; to validate and normalize the data</div>
                                    <div>5. Review the normalized transactions preview</div>
                                    <div>6. If validation passes, click &quot;Import All Transactions&quot;</div>
                                    <div>7. Review any duplicate transactions if found</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}