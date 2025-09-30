// src/app/imports/page.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function ImportsPage() {
    const { convexUser } = useConvexUser();
    const imports = useQuery(
        api.imports.getImportHistory,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Sign in required</p>
                </div>
            </AppLayout>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                    </Badge>
                );
            case "failed":
                return (
                    <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                );
            case "processing":
                return (
                    <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Processing
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline">
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

    return (
        <AppLayout>
            <InitUser />
            <div className="w-full min-w-0 mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Import History</h1>
                    <p className="text-muted-foreground mt-2">View all your CSV import sessions</p>
                </div>

                {!imports || imports.length === 0 ? (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                <p className="text-lg text-muted-foreground mb-2">No imports yet</p>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Import your first CSV file to get started
                                </p>
                                <Button asChild>
                                    <Link href="/import-csv">Import CSV</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {imports.map((importRecord) => (
                            <Card key={importRecord._id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <FileText className="h-5 w-5" />
                                                {importRecord.fileName}
                                            </CardTitle>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {format(new Date(importRecord.uploadedAt), 'MMM d, yyyy HH:mm')}
                                                </div>
                                                <span>{formatFileSize(importRecord.size)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(importRecord.status)}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6 text-sm">
                                            {importRecord.importedCount !== undefined && (
                                                <div>
                                                    <span className="text-muted-foreground">Imported: </span>
                                                    <span className="font-medium text-green-600">
                                                        {importRecord.importedCount}
                                                    </span>
                                                </div>
                                            )}
                                            {importRecord.skippedCount !== undefined && importRecord.skippedCount > 0 && (
                                                <div>
                                                    <span className="text-muted-foreground">Skipped: </span>
                                                    <span className="font-medium text-orange-600">
                                                        {importRecord.skippedCount}
                                                    </span>
                                                </div>
                                            )}
                                            {importRecord.errorCount !== undefined && importRecord.errorCount > 0 && (
                                                <div>
                                                    <span className="text-muted-foreground">Errors: </span>
                                                    <span className="font-medium text-red-600">
                                                        {importRecord.errorCount}
                                                    </span>
                                                </div>
                                            )}
                                            {importRecord.session?.hasDuplicates && (
                                                <Badge variant="outline" className="text-xs">
                                                    {importRecord.session.duplicateCount} duplicates
                                                </Badge>
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/imports/${importRecord._id}`}>
                                                View Details
                                            </Link>
                                        </Button>
                                    </div>
                                    {importRecord.error && (
                                        <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                                            <p className="text-sm text-destructive">{importRecord.error}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}