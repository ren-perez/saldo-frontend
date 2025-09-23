// src/app/import-csv/page.tsx
"use client";
import { useState } from "react";
import Papa from "papaparse";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { 
    processTransactions, 
    validatePreset, 
    validateCsvHeaders, 
    getDateRange,
    type PresetConfig,
    type ValidationError,
    type NormalizedTransaction
} from "@/utils/etl";

export default function CsvImporterPage() {
    const { convexUser } = useConvexUser();
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewTransactions, setPreviewTransactions] = useState<NormalizedTransaction[]>([]);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [processingStats, setProcessingStats] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch accounts using useQuery
    const accounts = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    // Fetch preset for selected account
    const preset = useQuery(
        api.accounts.getAccountPreset,
        selectedAccount ? { accountId: selectedAccount as any } : "skip"
    );

    // Import mutation
    const importTransactions = useMutation(api.transactions.importTransactions);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setPreviewTransactions([]);
            setValidationErrors([]);
            setProcessingStats(null);
        }
    };

    // Parse CSV and preview using ETL utilities
    const handlePreview = () => {
        if (!file || !preset) return;

        setIsProcessing(true);

        // First validate the preset configuration
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
                const rows = results.data as any[];
                
                if (rows.length === 0) {
                    setValidationErrors([{
                        row: -1,
                        column: 'file',
                        error: 'No data rows found in CSV',
                        value: null
                    }]);
                    setIsProcessing(false);
                    return;
                }

                // Validate CSV headers against preset requirements
                const headers = preset.hasHeader ? Object.keys(rows[0]) : [];
                const headerErrors = validateCsvHeaders(headers, preset as PresetConfig);
                
                if (headerErrors.length > 0) {
                    setValidationErrors(headerErrors);
                    setIsProcessing(false);
                    return;
                }

                // Process transactions using ETL utilities
                const result = processTransactions(rows, preset as PresetConfig);
                
                setValidationErrors(result.errors);
                setPreviewTransactions(result.transactions.slice(0, 10)); // Show first 10 for preview
                setProcessingStats(result.stats);
                setIsProcessing(false);
            },
            error: (error) => {
                setValidationErrors([{
                    row: -1,
                    column: 'file',
                    error: `CSV parsing error: ${error.message}`,
                    value: null
                }]);
                setIsProcessing(false);
            }
        });
    };

    // Commit transactions using processed data
    const handleImport = async () => {
        if (!convexUser || !selectedAccount || !preset || !file) return;

        try {
            setIsProcessing(true);

            // Parse and process all rows (not just preview)
            Papa.parse(file, {
                header: preset.hasHeader,
                delimiter: preset.delimiter,
                skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data as any[];
                    
                    // Process all transactions using ETL utilities
                    const result = processTransactions(rows, preset as PresetConfig);
                    
                    if (result.errors.length > 0) {
                        setValidationErrors(result.errors);
                        setIsProcessing(false);
                        return;
                    }

                    // Convert normalized transactions to the format expected by Convex
                    const transactionsForConvex = result.transactions.map((transaction) => ({
                        // Convert ISO date string back to timestamp for Convex
                        date: new Date(transaction.date).getTime(),
                        amount: transaction.amount,
                        description: transaction.description,
                        category: transaction.category,
                        transactionType: transaction.transactionType,
                    }));

                    // ✅ Get date range for deduplication - this was missing!
                    const dateRange = getDateRange(result.transactions);

                    console.log('Import data:', {
                        transactionCount: transactionsForConvex.length,
                        dateRange: dateRange ? {
                            startDate: new Date(dateRange.startDate).toISOString(),
                            endDate: new Date(dateRange.endDate).toISOString()
                        } : null
                    });

                    // ✅ Pass dateRange to the mutation
                    const importResult = await importTransactions({
                        userId: convexUser._id,
                        accountId: selectedAccount as any,
                        transactions: transactionsForConvex,
                        dateRange: dateRange ? {
                            startDate: new Date(dateRange.startDate).getTime(),
                            endDate: new Date(dateRange.endDate).getTime()
                        } : undefined
                    });

                    // Show detailed import summary
                    alert(importResult.summary || `Successfully imported ${importResult.insertedCount} transactions!`);
                    
                    console.log('Import result:', importResult);

                    setFile(null);
                    setPreviewTransactions([]);
                    setValidationErrors([]);
                    setProcessingStats(null);
                    setSelectedAccount(null);
                    setIsProcessing(false);
                },
            });
        } catch (error) {
            console.error("Import error:", error);
            alert(`Error importing transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsProcessing(false);
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

    return (
        <AppLayout>
            <InitUser />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">CSV Transaction Importer</h1>
                </div>

                {/* Account Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Select Account</label>
                    <select
                        value={selectedAccount || ""}
                        onChange={(e) => setSelectedAccount(e.target.value || null)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h3 className="text-lg font-medium text-blue-900">Using Preset: {preset.name}</h3>
                        <p className="text-blue-700">{preset.description}</p>
                        <div className="text-sm text-blue-600 mt-2 space-y-1">
                            <div>Delimiter: "{preset.delimiter}" | Headers: {preset.hasHeader ? "Yes" : "No"} | Skip rows: {preset.skipRows || 0}</div>
                            <div>Date format: {preset.dateFormat}</div>
                        </div>
                    </div>
                )}

                {selectedAccount && !preset && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h3 className="text-lg font-medium text-yellow-900">No preset linked to this account. Please create and link a preset first.</h3>
                    </div>
                )}

                {/* File Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Select CSV File</label>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>

                {/* Preview Button */}
                <button
                    onClick={handlePreview}
                    disabled={!file || !preset || isProcessing}
                    className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md"
                >
                    {isProcessing ? "Processing..." : "Preview CSV"}
                </button>

                {/* Processing Stats */}
                {processingStats && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                        <h3 className="text-lg font-medium text-green-900">Processing Summary</h3>
                        <div className="mt-2 text-sm text-green-700">
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
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <h3 className="text-lg font-medium text-red-900">Validation Errors ({validationErrors.length}):</h3>
                        <div className="mt-2 max-h-64 overflow-y-auto">
                            {validationErrors.slice(0, 20).map((error, i) => (
                                <div key={i} className="text-sm text-red-700 py-1">
                                    {error.row > 0 ? `Row ${error.row}: ` : ''}
                                    {error.column && `[${error.column}] `}
                                    {error.error}
                                    {error.value !== null && error.value !== undefined && (
                                        <span className="font-mono bg-red-100 px-1 ml-2">"{error.value}"</span>
                                    )}
                                </div>
                            ))}
                            {validationErrors.length > 20 && (
                                <div className="text-sm text-red-600 mt-2">
                                    ... and {validationErrors.length - 20} more errors
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Preview Table - Now shows normalized transactions */}
                {previewTransactions.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-4">Normalized Transaction Preview (first 10):</h3>
                        <div className="overflow-x-auto border border-gray-200 rounded-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {previewTransactions.map((transaction, i) => (
                                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{transaction.date}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                <span className={transaction.amount >= 0 ? "text-green-600" : "text-red-600"}>
                                                    ${transaction.amount.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                                                {transaction.description}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {transaction.category || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {transaction.transactionType || '-'}
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
                    <button
                        onClick={handleImport}
                        disabled={isProcessing}
                        className="mb-6 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium"
                    >
                        {isProcessing ? "Importing..." : `Import All ${processingStats?.validRows || 0} Transactions`}
                    </button>
                )}

                {/* Instructions */}
                <div className="bg-gray-50 p-6 rounded-md">
                    <h3 className="text-lg font-medium mb-4">Instructions:</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                        <div>1. Select the account you want to import transactions for</div>
                        <div>2. Make sure the account has a preset linked to it</div>
                        <div>3. Choose your CSV file</div>
                        <div>4. Click "Preview CSV" to validate and normalize the data</div>
                        <div>5. Review the normalized transactions preview</div>
                        <div>6. If validation passes, click "Import All Transactions"</div>
                        <div className="text-yellow-600 mt-2">⚠️ Re-importing will replace existing transactions in the date range while preserving any you've categorized.</div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}