"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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

type Preset = {
    _id: Id<"presets">;
    name: string;
    description: string;
    delimiter: string;
    hasHeader: boolean;
    dateColumn: string;
    amountColumns: string[];
    [key: string]: unknown;
};

type Account = { _id: Id<"accounts">; name: string; bank: string };

const ICON_BTN = "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors";

function LinkedAccounts({ presetId, accounts }: { presetId: Id<"presets">; accounts: Account[] }) {
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

function PresetCard({
    preset,
    accounts,
    onEdit,
    onDelete,
}: {
    preset: Preset;
    accounts: Account[];
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="relative group rounded-lg border bg-card p-5 flex flex-col transition-colors shadow-sm">
            <div className="absolute top-2.5 right-2.5 flex gap-0.5 rounded-md border bg-background p-0.5 opacity-0 transition-opacity group-hover:opacity-100 z-10">
                <button className={cn(ICON_BTN, "hover:bg-muted hover:text-foreground")} onClick={onEdit}>
                    <Settings2 className="h-3 w-3" />
                </button>
                <button className={cn(ICON_BTN, "hover:bg-destructive/10 hover:text-destructive")} onClick={onDelete}>
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>

            <div className="pr-14 mb-3">
                <p className="text-sm font-medium truncate">{preset.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{preset.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground bg-muted/50 rounded-md p-2 mb-3">
                <span><span className="font-medium">Delimiter</span> &quot;{preset.delimiter}&quot;</span>
                <span><span className="font-medium">Header</span> {preset.hasHeader ? "Yes" : "No"}</span>
                <span><span className="font-medium">Date</span> {preset.dateColumn}</span>
                <span><span className="font-medium">Amount</span> {preset.amountColumns.join(", ")}</span>
            </div>

            <LinkedAccounts presetId={preset._id} accounts={accounts} />
        </div>
    );
}

interface PresetsTabProps {
    presets: Preset[] | undefined;
    accounts: Account[] | undefined;
    onEdit: (preset: Preset) => void;
    onDelete: (presetId: Id<"presets">) => void;
    onCreateClick: () => void;
}

export function PresetsTab({ presets, accounts, onEdit, onDelete, onCreateClick }: PresetsTabProps) {
    if (!presets || presets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
                <Settings2 className="size-8 text-muted-foreground/30" />
                <p className="text-sm font-medium">No presets yet</p>
                <p className="text-sm text-muted-foreground">Create your first preset to configure CSV imports.</p>
                <Button size="sm" className="mt-2 gap-1.5" onClick={onCreateClick}>
                    <Plus className="size-3.5" /> New preset
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presets.map((preset) => (
                <PresetCard
                    key={preset._id}
                    preset={preset}
                    accounts={accounts ?? []}
                    onEdit={() => onEdit(preset)}
                    onDelete={() => onDelete(preset._id)}
                />
            ))}
        </div>
    );
}
