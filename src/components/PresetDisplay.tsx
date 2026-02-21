// src/components/PresetDisplay.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Preset {
    _id: string;
    name: string;
    description: string;
    delimiter: string;
    hasHeader: boolean;
    skipRows: number;
    accountColumn?: string;
    amountMultiplier: number;
    categoryColumn?: string;
    categoryGroupColumn?: string;
    dateColumn: string;
    dateFormat: string;
    descriptionColumn: string;
    amountColumns: string[];
    amountProcessing: Record<string, unknown>;
    transactionTypeColumn?: string;
}

interface PresetDisplayProps {
    preset: Preset;
    mode?: "compact" | "detailed" | "summary";
    showHeader?: boolean;
    showAdvanced?: boolean;
    className?: string;
    onEdit?: () => void;
}

export function PresetDisplay({
    preset,
    mode = "detailed",
    showHeader = true,
    showAdvanced = true,
    className = "",
    onEdit
}: PresetDisplayProps) {
    const renderCompactView = () => (
        <div className={`p-3 bg-muted rounded-lg border ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{preset.name}</h4>
                {onEdit && (
                    <Button variant="ghost" size="sm" onClick={onEdit}>
                        Edit
                    </Button>
                )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><strong>Delimiter:</strong> `&quot;`{preset.delimiter}`&quot;`</div>
                <div><strong>Header:</strong> {preset.hasHeader ? "Yes" : "No"}</div>
                <div><strong>Skip:</strong> {preset.skipRows} rows</div>
                <div><strong>Multiplier:</strong> {preset.amountMultiplier}</div>
            </div>
        </div>
    );

    const renderSummaryView = () => (
        <div className={`space-y-3 ${className}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Delimiter</div>
                    <div className="font-mono text-lg">`&quot;`{preset.delimiter}`&quot;`</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Header Row</div>
                    <div className="text-lg">{preset.hasHeader ? "✓ Yes" : "✗ No"}</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Skip Rows</div>
                    <div className="text-lg">{preset.skipRows || 0}</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Multiplier</div>
                    <div className="text-lg">{preset.amountMultiplier}</div>
                </div>
            </div>
        </div>
    );

    const renderColumnMapping = () => {
        const mappings = [
            { label: "Date", value: preset.dateColumn },
            { label: "Description", value: preset.descriptionColumn },
            { label: "Amount", value: preset.amountColumns.join(", ") },
            { label: "Category", value: preset.categoryColumn },
            { label: "Account", value: preset.accountColumn },
            { label: "Type", value: preset.transactionTypeColumn },
            { label: "Category Group", value: preset.categoryGroupColumn },
        ].filter(mapping => mapping.value);

        return (
            <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    Column Mapping
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mappings.map((mapping, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="text-sm text-muted-foreground">{mapping.label}:</span>
                            <Badge variant="outline" className="font-mono text-xs">
                                {mapping.value}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderDateFormat = () => (
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Date Format:</span>
            <Badge variant="secondary" className="font-mono">
                {preset.dateFormat}
            </Badge>
        </div>
    );

    const renderAdvancedProcessing = () => {
        if (!preset.amountProcessing || Object.keys(preset.amountProcessing).length === 0) {
            return null;
        }

        return (
            <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    Advanced Processing Rules
                </summary>
                <div className="mt-2 p-3 bg-muted/30 rounded border text-xs font-mono overflow-x-auto">
                    <pre>{JSON.stringify(preset.amountProcessing, null, 2)}</pre>
                </div>
            </details>
        );
    };

    const renderDetailedView = () => (
        <Card className={className}>
            {showHeader && (
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div>
                                <CardTitle className="text-lg">{preset.name}</CardTitle>
                                <CardDescription>{preset.description}</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                                Active Preset
                            </Badge>
                            {onEdit && (
                                <Button variant="outline" size="sm" onClick={onEdit}>
                                    Edit
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
            )}
            <CardContent className="space-y-4">
                {renderSummaryView()}

                <Separator className="my-6" />

                {renderColumnMapping()}

                <Separator className="my-6" />

                {renderDateFormat()}

                {showAdvanced && renderAdvancedProcessing()}
            </CardContent>
        </Card>
    );

    switch (mode) {
        case "compact":
            return renderCompactView();
        case "summary":
            return renderSummaryView();
        case "detailed":
        default:
            return renderDetailedView();
    }
}

// Preset not found component
interface PresetNotFoundProps {
    accountName?: string;
    className?: string;
    onCreatePreset?: () => void;
}

export function PresetNotFound({
    accountName,
    className = "",
    onCreatePreset,
}: PresetNotFoundProps) {
    const description = accountName
        ? `"${accountName}" doesn't have an import preset linked to it.`
        : "This account doesn't have an import preset linked to it.";

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-lg">
                    No Import Preset
                </CardTitle>
                <CardDescription>
                    {description}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Create and link a CSV import preset before importing transactions.
                </p>

                <Button
                    variant="default"
                    size="sm"
                    onClick={onCreatePreset}
                    asChild={!onCreatePreset}
                >
                    {onCreatePreset ? (
                        "Create Preset"
                    ) : (
                        <Link href="/presets">Go to Presets →</Link>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}