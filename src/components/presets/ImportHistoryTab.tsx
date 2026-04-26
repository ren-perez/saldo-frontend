"use client";

import { useState, useMemo, Fragment } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import Link from "next/link";
import { FileText, ArrowRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const NUM = "font-['JetBrains_Mono',monospace] tabular-nums";

type SortKey = "fileName" | "uploadedAt" | "status" | "accountName";
type SortDir = "asc" | "desc";

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusDot({ status }: { status: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={cn(
                "inline-block size-1.5 rounded-full shrink-0",
                status === "completed"  ? "bg-green-500"   :
                status === "failed"     ? "bg-destructive" :
                status === "processing" ? "bg-amber-400"   :
                "bg-muted-foreground/40"
            )} />
            <span className={cn(
                "text-xs capitalize text-muted-foreground",
                status === "failed" && "text-destructive"
            )}>
                {status}
            </span>
        </span>
    );
}

function Results({ imported, skipped, errors }: { imported?: number; skipped?: number; errors?: number }) {
    if (imported === undefined && !skipped && !errors)
        return <span className="text-xs text-muted-foreground/50">—</span>;
    return (
        <span className={cn(NUM, "text-xs flex items-center gap-2 flex-wrap")}>
            {imported !== undefined && <span className="text-foreground">{imported} rows</span>}
            {skipped !== undefined && skipped > 0 && <span className="text-muted-foreground">{skipped} skipped</span>}
            {errors  !== undefined && errors  > 0 && <span className="text-destructive">{errors} errors</span>}
        </span>
    );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
    if (col !== sortKey) return <ChevronsUpDown className="size-3 text-muted-foreground/40 ml-1 inline-block" />;
    return sortDir === "asc"
        ? <ChevronUp className="size-3 text-foreground ml-1 inline-block" />
        : <ChevronDown className="size-3 text-foreground ml-1 inline-block" />;
}

export function ImportHistoryTab() {
    const { convexUser } = useConvexUser();

    const [filterAccountId, setFilterAccountId] = useState<Id<"accounts"> | undefined>(undefined);
    const [sortKey, setSortKey]   = useState<SortKey>("uploadedAt");
    const [sortDir, setSortDir]   = useState<SortDir>("desc");

    const accounts = useQuery(
        api.accounts.listAccounts,
        convexUser ? { userId: convexUser._id } : "skip"
    );
    const imports = useQuery(
        api.imports.getImportHistory,
        convexUser
            ? { userId: convexUser._id, ...(filterAccountId ? { accountId: filterAccountId } : {}) }
            : "skip"
    );
    const activeSessions = useQuery(
        api.imports.getActiveImportSessions,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const accountMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const a of accounts ?? []) m.set(a._id, a.name);
        return m;
    }, [accounts]);

    const sorted = useMemo(() => {
        if (!imports) return [];
        return [...imports].sort((a, b) => {
            let av: string | number, bv: string | number;
            switch (sortKey) {
                case "fileName":     av = a.fileName;     bv = b.fileName;     break;
                case "uploadedAt":   av = a.uploadedAt;   bv = b.uploadedAt;   break;
                case "status":       av = a.status;       bv = b.status;       break;
                case "accountName":
                    av = accountMap.get(a.accountId) ?? "";
                    bv = accountMap.get(b.accountId) ?? "";
                    break;
                default:             av = a.uploadedAt;   bv = b.uploadedAt;
            }
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [imports, sortKey, sortDir, accountMap]);

    const handleResumeSession = (sessionId: string) => {
        localStorage.setItem("import_session_id", sessionId);
        window.location.href = "/import-csv";
    };

    const toggleSort = (col: SortKey) => {
        if (sortKey === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
        else { setSortKey(col); setSortDir("asc"); }
    };

    const sortableHeader = (label: string, col: SortKey, extraClass?: string) => (
        <th
            className={cn(
                "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left cursor-pointer select-none hover:text-foreground transition-colors",
                extraClass
            )}
            onClick={() => toggleSort(col)}
        >
            {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
        </th>
    );

    return (
        <div className="flex flex-col gap-6">

            {/* Pending */}
            {activeSessions && activeSessions.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Awaiting review
                        </p>
                        <span className={cn(
                            NUM,
                            "text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full"
                        )}>
                            {activeSessions.length}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {activeSessions.map((session) => (
                            <div
                                key={session._id}
                                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-l-2 border-l-amber-500 border border-border bg-card"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{session.fileName}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {session.accountName}
                                        {session.duplicates.length > 0 && (
                                            <span className="ml-2 text-muted-foreground/60">
                                                · {session.duplicates.length} duplicate{session.duplicates.length !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1.5 text-xs shrink-0"
                                    onClick={() => handleResumeSession(session.sessionId)}
                                >
                                    Review <ArrowRight className="size-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* History */}
            <div className="flex flex-col gap-3">
                {/* Section header + filter */}
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">History</p>
                    <Select
                        value={filterAccountId ?? "all"}
                        onValueChange={(v) => setFilterAccountId(v === "all" ? undefined : v as Id<"accounts">)}
                    >
                        <SelectTrigger className="h-7 w-[160px] text-xs">
                            <SelectValue placeholder="All accounts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All accounts</SelectItem>
                            {(accounts ?? []).map((a) => (
                                <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {(!imports || imports.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
                        <FileText className="size-8 text-muted-foreground/20" />
                        <p className="text-sm font-medium">No imports yet</p>
                        <p className="text-sm text-muted-foreground">Import your first CSV file to get started.</p>
                        <Button size="sm" className="mt-2" asChild>
                            <Link href="/import-csv">Import CSV</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Mobile: stacked cards */}
                        <div className="flex flex-col gap-2 md:hidden">
                            {sorted.map((record) => {
                                const accountName = accountMap.get(record.accountId);
                                return (
                                    <div
                                        key={record._id}
                                        className="rounded-lg border bg-card px-4 py-3 flex items-start justify-between gap-3"
                                    >
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <p className="text-sm font-medium truncate">{record.fileName}</p>
                                            {accountName && (
                                                <p className="text-xs text-muted-foreground truncate">{accountName}</p>
                                            )}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={cn(NUM, "text-xs text-muted-foreground")}>
                                                    {format(new Date(record.uploadedAt), "MMM d, yyyy")}
                                                </span>
                                                <span className={cn(NUM, "text-xs text-muted-foreground")}>
                                                    {formatFileSize(record.size)}
                                                </span>
                                                <StatusDot status={record.status} />
                                            </div>
                                            <Results
                                                imported={record.importedCount}
                                                skipped={record.skippedCount}
                                                errors={record.errorCount}
                                            />
                                            {record.error && (
                                                <p className="text-xs text-destructive bg-destructive/5 rounded px-2 py-1.5 mt-1">
                                                    {record.error}
                                                </p>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground shrink-0" asChild>
                                            <Link href={`/imports/${record._id}`}>Details</Link>
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* md+: table */}
                        <Card className="hidden md:block">
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            {sortableHeader("File",    "fileName")}
                                            {sortableHeader("Account", "accountName")}
                                            {sortableHeader("Date",    "uploadedAt")}
                                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left">
                                                Size
                                            </th>
                                            <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left">
                                                Results
                                            </th>
                                            {sortableHeader("Status", "status")}
                                            <th className="w-16" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.map((record, i) => {
                                            const accountName = accountMap.get(record.accountId);
                                            return (
                                                <Fragment key={record._id}>
                                                    <tr
                                                        className={cn(
                                                            "hover:bg-muted/30 transition-colors",
                                                            i !== 0 && "border-t"
                                                        )}
                                                    >
                                                        <td className="px-4 py-3 max-w-[180px]">
                                                            <p className="text-sm font-medium truncate">{record.fileName}</p>
                                                        </td>
                                                        <td className="px-4 py-3 max-w-[140px]">
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {accountName ?? "—"}
                                                            </p>
                                                        </td>
                                                        <td className={cn(NUM, "px-4 py-3 text-xs text-muted-foreground whitespace-nowrap")}>
                                                            {format(new Date(record.uploadedAt), "MMM d, yyyy")}
                                                        </td>
                                                        <td className={cn(NUM, "px-4 py-3 text-xs text-muted-foreground whitespace-nowrap")}>
                                                            {formatFileSize(record.size)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Results
                                                                imported={record.importedCount}
                                                                skipped={record.skippedCount}
                                                                errors={record.errorCount}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <StatusDot status={record.status} />
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
                                                                <Link href={`/imports/${record._id}`}>Details</Link>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                    {record.error && (
                                                        <tr key={`${record._id}-err`} className="border-t">
                                                            <td colSpan={7} className="px-4 pb-3 pt-0">
                                                                <p className="text-xs text-destructive bg-destructive/5 rounded px-2 py-1.5">
                                                                    {record.error}
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

        </div>
    );
}
