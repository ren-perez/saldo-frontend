"use client";
import { useState, useMemo } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, CircleDashed, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
    _id: Id<"accounts">;
    name: string;
    bank: string;
    type: string;
}

interface AccountMappingStepProps {
    uniqueCsvValues: string[];
    accounts: Account[];
    onComplete: (mapping: Record<string, Id<"accounts">>) => void;
}

export function AccountMappingStep({ uniqueCsvValues, accounts, onComplete }: AccountMappingStepProps) {
    const autoMatched = useMemo(() => {
        const set = new Set<string>();
        for (const csvValue of uniqueCsvValues) {
            const match = accounts.find(a => a.name.toLowerCase() === csvValue.toLowerCase());
            if (match) set.add(csvValue);
        }
        return set;
    }, [uniqueCsvValues, accounts]);

    const [mapping, setMapping] = useState<Record<string, Id<"accounts">>>(() => {
        const auto: Record<string, Id<"accounts">> = {};
        for (const csvValue of uniqueCsvValues) {
            const match = accounts.find(a => a.name.toLowerCase() === csvValue.toLowerCase());
            if (match) auto[csvValue] = match._id;
        }
        return auto;
    });

    const allMapped = uniqueCsvValues.every(v => mapping[v]);

    const handleSelect = (csvValue: string, accountId: Id<"accounts">) => {
        setMapping(prev => ({ ...prev, [csvValue]: accountId }));
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            {/* A→V→D header */}
            <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                    We detected <span className="font-semibold text-foreground">{uniqueCsvValues.length}</span> different account
                    {uniqueCsvValues.length !== 1 ? "s" : ""} in your uploaded file.
                    {autoMatched.size > 0 && (
                        <span className="ml-1"><span className="font-semibold text-foreground">{autoMatched.size}</span> {autoMatched.size === 1 ? "was" : "were"} auto-matched by name.</span>
                    )}
                </p>
                <p className="text-sm text-muted-foreground">
                    Confirm the mapping below and continue.
                </p>
            </div>

            {/* Mapping rows */}
            <div className="space-y-3">
                {uniqueCsvValues.map(csvValue => {
                    const isMapped = !!mapping[csvValue];
                    const isAutoMatched = autoMatched.has(csvValue);
                    return (
                        <div
                            key={csvValue}
                            className={cn(
                                "flex items-center gap-4 rounded-lg border px-4 py-3.5 transition-shadow",
                                isMapped
                                    ? "shadow-sm border-border bg-card"
                                    : "bg-muted/30 border-border/60"
                            )}
                        >
                            {/* Status icon */}
                            {isMapped
                                ? <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                                : <CircleDashed className="size-4 shrink-0 text-muted-foreground/50" />
                            }

                            {/* CSV value */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className={cn(
                                        "text-sm font-medium truncate",
                                        isMapped ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                        {csvValue}
                                    </p>
                                    {isAutoMatched && (
                                        <Sparkles className="size-3 shrink-0 text-muted-foreground/60" />
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">{isAutoMatched ? "Auto-matched" : "CSV value"}</p>
                            </div>

                            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/40" />

                            {/* Account select */}
                            <div className="w-52 shrink-0">
                                <Select
                                    value={mapping[csvValue] ?? ""}
                                    onValueChange={v => handleSelect(csvValue, v as Id<"accounts">)}
                                >
                                    <SelectTrigger className={cn(
                                        "text-sm rounded-md",
                                        !isMapped && "border-dashed"
                                    )}>
                                        <SelectValue placeholder="Select account..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(account => (
                                            <SelectItem key={account._id} value={account._id}>
                                                <span className="font-medium">{account.name}</span>
                                                <span className="text-muted-foreground ml-1.5 text-xs">· {account.bank}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Progress summary */}
            <p className="text-xs text-muted-foreground text-right">
                {Object.keys(mapping).length} of {uniqueCsvValues.length} mapped
            </p>

            <Button
                onClick={() => onComplete(mapping)}
                disabled={!allMapped}
                className="w-full gap-2"
            >
                Continue to Import
                <ArrowRight className="size-3.5" />
            </Button>
        </div>
    );
}
