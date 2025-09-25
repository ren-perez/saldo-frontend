// src/app/import-csv/page.tsx
"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import DuplicateReview from "@/components/DuplicateReview";
import { Button } from "@/components/ui/button";
import {
  processTransactions,
  validatePreset,
  validateCsvHeaders,
  type PresetConfig,
  type ValidationError,
  type NormalizedTransaction,
} from "@/utils/etl";

export default function CsvImporterPage() {
  const { convexUser } = useConvexUser();
  // const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Id<"accounts"> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewTransactions, setPreviewTransactions] = useState<
    NormalizedTransaction[]
  >([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [processingStats, setProcessingStats] = useState<{
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [importPhase, setImportPhase] = useState<
    "upload" | "preview" | "reviewing" | "completed"
  >("upload");

  const accounts = useQuery(
    api.accounts.listAccounts,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // const preset = useQuery(
  //   api.accounts.getAccountPreset,
  //   selectedAccount ? { accountId: selectedAccount as string } : "skip"
  // );
  const preset = useQuery(
    api.accounts.getAccountPreset,
    selectedAccount ? { accountId: selectedAccount } : "skip"
  );

  const importTransactions = useMutation(api.transactions.importTransactions);

  // Load import session if we have a sessionId
  const importSession = useQuery(
    api.transactions.loadImportSession,
    currentSessionId && convexUser
      ? { sessionId: currentSessionId, userId: convexUser._id }
      : "skip"
  );

  // Get existing transactions for duplicate review (only load when needed)
  // const existingTransactions = useQuery(
  //   api.transactions.listTransactions,
  //   importSession && selectedAccount && convexUser
  //     ? {
  //       userId: convexUser._id,
  //       accountId: selectedAccount as string,
  //       limit: 1000 // Get more for duplicate matching
  //     }
  //     : "skip"
  // );
  const existingTransactions = useQuery(
    api.transactions.listTransactions,
    importSession && selectedAccount && convexUser
      ? {
        userId: convexUser._id,
        accountId: selectedAccount as Id<"accounts">, // ✅ Correct cast
        limit: 1000
      }
      : "skip"
  );

  // Check for existing session on load
  useEffect(() => {
    const sessionId = localStorage.getItem('import_session_id');
    if (sessionId && convexUser) {
      setCurrentSessionId(sessionId);
      setImportPhase("reviewing");
    }
  }, [convexUser]);

  const resetImportState = () => {
    setFile(null);
    setPreviewTransactions([]);
    setValidationErrors([]);
    setProcessingStats(null);
    setCurrentSessionId(null);
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

  const handlePreview = () => {
    if (!file || !preset) return;
    setIsProcessing(true);

    const presetErrors = validatePreset(preset as PresetConfig);
    if (presetErrors.length > 0) {
      setValidationErrors(presetErrors);
      setIsProcessing(false);
      return;
    }

    Papa.parse(file, {
      header: preset.hasHeader,
      delimiter: preset.delimiter,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, unknown>[];

        if (rows.length === 0) {
          setValidationErrors([
            {
              row: -1,
              column: "file",
              error: "No data rows found in CSV",
              value: null,
            },
          ]);
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
      },
      error: (error) => {
        setValidationErrors([
          {
            row: -1,
            column: "file",
            error: `CSV parsing error: ${error.message}`,
            value: null,
          },
        ]);
        setIsProcessing(false);
      },
    });
  };

  const handleImport = async () => {
    if (!convexUser || !selectedAccount || !preset || !file) return;
    try {
      setIsProcessing(true);

      Papa.parse(file, {
        header: preset.hasHeader,
        delimiter: preset.delimiter,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as Record<string, unknown>[];
          const result = processTransactions(rows, preset as PresetConfig);

          if (result.errors.length > 0) {
            setValidationErrors(result.errors);
            setIsProcessing(false);
            return;
          }

          // Generate a session ID for this import
          const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const transactionsForConvex = result.transactions.map((t, index) => ({
            date: new Date(t.date).getTime(),
            amount: t.amount,
            description: t.description,
            category: t.category,
            transactionType: t.transactionType,
            rawData: { ...t, originalRowIndex: index }, // Store original row data
          }));

          const importResult = await importTransactions({
            userId: convexUser._id,
            accountId: selectedAccount as Id<"accounts">,
            transactions: transactionsForConvex,
            sessionId,
          });

          if (importResult.possibleDuplicates && importResult.possibleDuplicates.length > 0) {
            // Store session ID for persistence
            localStorage.setItem('import_session_id', sessionId);
            setCurrentSessionId(sessionId);
            setImportPhase("reviewing");
          } else {
            // No duplicates, show success
            alert(
              `Successfully imported ${importResult.inserted} transactions!${importResult.errors.length > 0
                ? ` ${importResult.errors.length} rows had errors.`
                : ""
              }`
            );
            setImportPhase("completed");
          }

          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("Import error:", error);
      alert(
        `Error importing transactions: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsProcessing(false);
    }
  };

  const handleSessionResolved = () => {
    localStorage.removeItem('import_session_id');
    setImportPhase("completed");
    alert("Import completed successfully!");
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

  return (
    <AppLayout>
      <InitUser />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">CSV Transaction Importer</h1>
          {importPhase !== "upload" && (
            <Button onClick={resetImportState} variant="outline" size="sm">
              Start New Import
            </Button>
          )}
        </div>

        {/* Show duplicate review phase */}
        {importPhase === "reviewing" && importSession && existingTransactions && (
          <DuplicateReview
            session={importSession}
            existingTransactions={existingTransactions}
            onSessionResolved={handleSessionResolved}
          />
        )}

        {/* Show completion message */}
        {importPhase === "completed" && (
          <div className="mb-6 p-4 rounded-md border bg-green-50 dark:bg-green-950/20">
            <h2 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
              ✅ Import Completed Successfully!
            </h2>
            <p className="text-green-600 dark:text-green-400">
              All transactions have been processed and imported to your account.
            </p>
          </div>
        )}

        {/* Show upload/preview phase only when not in reviewing/completed state */}
        {importPhase !== "reviewing" && importPhase !== "completed" && (
          <>

            {/* Account Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Account</label>
              <select
                value={selectedAccount || ""}
                // onChange={(e) => setSelectedAccount(e.target.value || null)}
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

            {/* Preset Info */}
            {selectedAccount && preset && (
              <div className="mb-6 p-4 rounded-md border bg-muted">
                <h3 className="text-lg font-medium">Using Preset: {preset.name}</h3>
                <p className="text-muted-foreground">{preset.description}</p>
                <div className="text-sm text-muted-foreground mt-2 space-y-1">
                  <div>
                    Delimiter: &quot;{preset.delimiter}&quot; | Headers:{" "}
                    {preset.hasHeader ? "Yes" : "No"} | Skip rows:{" "}
                    {preset.skipRows || 0}
                  </div>
                  <div>Date format: {preset.dateFormat}</div>
                </div>
              </div>
            )}

            {selectedAccount && !preset && (
              <div className="mb-6 p-4 rounded-md border bg-yellow-100/10 text-yellow-700 dark:text-yellow-400">
                <h3 className="text-lg font-medium">
                  No preset linked to this account. Please create and link a preset
                  first.
                </h3>
              </div>
            )}

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
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
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTransactions.map((transaction, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? "bg-background" : "bg-muted"}
                        >
                          <td className="px-4 py-3 text-sm">{transaction.date}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={
                                transaction.amount >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }
                            >
                              ${transaction.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm max-w-xs truncate">
                            {transaction.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {transaction.category || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {transaction.transactionType || "-"}
                          </td>
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
                // variant="success"
                className="mb-6"
              >
                {isProcessing
                  ? "Importing..."
                  : `Import All ${processingStats?.validRows || 0} Transactions`}
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
                <div className="text-yellow-600 dark:text-yellow-400 mt-2">
                  ⚠️ Import process now includes duplicate detection based on account, amount, and description.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
