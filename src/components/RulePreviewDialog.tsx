"use client";

/**
 * RulePreviewDialog
 *
 * A unified dialog for creating and editing auto-rules with a live transaction
 * preview on the right side.
 *
 * Modes
 * ─────
 * "new"  – create a new rule; optionally pre-filled from a suggestion.
 *          Buttons: Create | Create & Apply
 *
 * "edit" – edit an existing rule and / or run a retroactive sweep.
 *          Buttons: Save | Apply Now | Save & Apply
 *
 * Preview buckets
 * ───────────────
 * • Already matched  – linked to this rule (edit mode only)
 * • Would categorize – currently uncategorized, would gain a category
 * • Would update     – auto-categorized by a different rule, would be replaced
 * • Skipped          – human-edited, never touched
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { currencyExact, formatDate } from "@/lib/format";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Zap,
    Tag,
    Loader2,
    CheckCircle2,
    RefreshCw,
    AlertCircle,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RuleDialogMode =
    | { type: "new"; prefill?: { pattern: string; categoryId: string } }
    | { type: "edit"; rule: { _id: Id<"category_rules">; pattern: string; categoryId: Id<"categories">; priority: number; isActive: boolean } };

type PreviewTx = {
    _id: string;
    description: string;
    date: number;
    amount: number;
    currentCategoryName: string | null;
    isAutoCategorized: boolean;
};

type Category = {
    _id: Id<"categories">;
    name: string;
};

// ─── Preview bucket sub-component ─────────────────────────────────────────────

function TxBucket({
    label,
    color,
    icon,
    rows,
    total,
    defaultOpen = false,
}: {
    label: string;
    color: string;
    icon: React.ReactNode;
    rows: PreviewTx[];
    total: number;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    if (total === 0) return null;

    return (
        <div className="rounded-lg border border-border overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
            >
                {icon}
                <span className={cn("text-xs font-semibold flex-1", color)}>{label}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {total > rows.length ? `${rows.length}+ of ${total}` : total}
                </Badge>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                    {rows.map((t) => (
                        <div key={t._id} className="flex items-start gap-2 px-3 py-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs truncate text-foreground/80">{t.description}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground">{formatDate(t.date)}</span>
                                    {t.currentCategoryName && (
                                        <>
                                            <span className="text-[10px] text-muted-foreground">·</span>
                                            <span className="text-[10px] text-muted-foreground">{t.currentCategoryName}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <span className={cn("text-xs font-mono font-semibold shrink-0", t.amount > 0 ? "text-emerald-600" : "text-foreground")}>
                                {t.amount > 0 ? "+" : ""}{currencyExact(t.amount)}
                            </span>
                        </div>
                    ))}
                    {total > rows.length && (
                        <p className="text-[10px] text-muted-foreground text-center py-2">
                            + {total - rows.length} more (showing first {rows.length})
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function RulePreviewDialog({
    mode,
    userId,
    categories,
    onClose,
}: {
    mode: RuleDialogMode;
    userId: Id<"users">;
    categories: Category[];
    onClose: () => void;
}) {
    const isEdit = mode.type === "edit";

    const [pattern, setPattern] = useState(
        isEdit ? mode.rule.pattern : (mode.prefill?.pattern ?? "")
    );
    const [categoryId, setCategoryId] = useState(
        isEdit ? (mode.rule.categoryId as string) : (mode.prefill?.categoryId ?? "")
    );
    const [error, setError] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);

    // Debounced pattern for the preview query
    const [debouncedPattern, setDebouncedPattern] = useState(pattern);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setDebouncedPattern(pattern.trim()), 350);
    }, [pattern]);

    const createRule = useMutation(api.categoryRules.createRule);
    const updateRule = useMutation(api.categoryRules.updateRule);
    const applyRuleRetroactively = useMutation(api.categoryRules.applyRuleRetroactively);

    const rules = useQuery(
        api.categoryRules.listRules,
        { userId }
    );

    const preview = useQuery(
        debouncedPattern ? api.categoryRules.getTransactionsForRulePreview : ("skip" as never),
        debouncedPattern
            ? {
                userId,
                pattern: debouncedPattern,
                ruleId: isEdit ? mode.rule._id : undefined,
            }
            : "skip"
    );

    const isLoadingPreview = debouncedPattern !== "" && preview === undefined;

    // ── helpers ──

    const applyAndToast = async (ruleId: Id<"category_rules">) => {
        setApplying(true);
        try {
            const result = await applyRuleRetroactively({ ruleId, userId });
            toast.success(
                result.patched > 0
                    ? `Applied to ${result.patched} past transaction${result.patched === 1 ? "" : "s"}.`
                    : "No eligible past transactions to update."
            );
        } finally {
            setApplying(false);
        }
    };

    // ── handlers ──

    const handleCreate = async (andApply: boolean) => {
        setError(null);
        if (!pattern.trim() || !categoryId) return;
        try {
            const maxPriority = (rules ?? []).reduce((m, r) => Math.max(m, r.priority), -1);
            const ruleId = await createRule({
                userId,
                pattern: pattern.trim(),
                categoryId: categoryId as Id<"categories">,
                priority: maxPriority + 1,
            });
            if (andApply && ruleId) {
                await applyAndToast(ruleId as Id<"category_rules">);
            } else {
                toast.success("Rule created.");
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create rule");
        }
    };

    const handleSave = async (andApply: boolean) => {
        if (!isEdit) return;
        setError(null);
        try {
            await updateRule({
                ruleId: mode.rule._id,
                updates: {
                    pattern: pattern.trim(),
                    categoryId: categoryId as Id<"categories">,
                },
            });
            if (andApply) {
                await applyAndToast(mode.rule._id);
            } else {
                toast.success("Rule updated.");
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update rule");
        }
    };

    const handleApplyOnly = async () => {
        if (!isEdit) return;
        await applyAndToast(mode.rule._id);
        onClose();
    };

    const canSubmit = pattern.trim().length > 0 && categoryId.length > 0 && !applying;
    const totalWouldAffect = preview?.totalWouldAffect ?? 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-3xl w-full">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        {isEdit ? "Edit Rule" : "New Auto-Rule"}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ── Left: form ── */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">Keyword</label>
                            <Input
                                value={pattern}
                                onChange={(e) => setPattern(e.target.value)}
                                placeholder="e.g. uber, netflix, starbucks"
                                autoFocus
                            />
                            <p className="text-xs text-muted-foreground">
                                Case-insensitive. Matched after stripping bank noise prefixes.
                            </p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">Category</label>
                            <Select
                                value={categoryId || "none"}
                                onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Select category</SelectItem>
                                    {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {error}
                            </p>
                        )}

                        {/* Summary pill */}
                        {debouncedPattern && preview && (
                            <div className={cn(
                                "rounded-lg px-3 py-2 text-sm flex items-center gap-2 border",
                                totalWouldAffect > 0
                                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                                    : "bg-muted border-muted text-muted-foreground"
                            )}>
                                {totalWouldAffect > 0
                                    ? <><RefreshCw className="h-3.5 w-3.5 shrink-0" /> {totalWouldAffect} transaction{totalWouldAffect === 1 ? "" : "s"} would be updated</>
                                    : <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> No uncategorized matches</>
                                }
                                {preview.skippedCount > 0 && (
                                    <span className="ml-auto text-xs opacity-70">{preview.skippedCount} human override{preview.skippedCount === 1 ? "" : "s"} skipped</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Right: transaction preview ── */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">Transaction Preview</span>
                            {isLoadingPreview && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
                        </div>

                        {!debouncedPattern ? (
                            <div className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-muted text-center">
                                <p className="text-sm text-muted-foreground">
                                    Enter a keyword to preview matching transactions
                                </p>
                            </div>
                        ) : isLoadingPreview ? (
                            <div className="flex items-center justify-center h-40 rounded-lg border border-muted">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : preview ? (
                            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                                {/* Already linked — only relevant in edit mode */}
                                {isEdit && (
                                    <TxBucket
                                        label="Already matched by this rule"
                                        color="text-emerald-700 dark:text-emerald-400"
                                        icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                                        rows={preview.alreadyLinked}
                                        total={preview.alreadyLinkedTotal ?? 0}
                                        defaultOpen
                                    />
                                )}
                                <TxBucket
                                    label="Would be categorized (currently uncategorized)"
                                    color="text-blue-700 dark:text-blue-400"
                                    icon={<Tag className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                                    rows={preview.wouldCategorize}
                                    total={preview.wouldCategorizeTotal ?? 0}
                                    defaultOpen
                                />
                                <TxBucket
                                    label="Would be updated (auto-categorized by another rule)"
                                    color="text-amber-700 dark:text-amber-400"
                                    icon={<RefreshCw className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                    rows={preview.wouldUpdate}
                                    total={preview.wouldUpdateTotal ?? 0}
                                />
                                {preview.skippedCount > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        {preview.skippedCount} transaction{preview.skippedCount === 1 ? "" : "s"} skipped — manually categorized by user
                                    </div>
                                )}
                                {preview.alreadyLinkedTotal === 0 && preview.wouldCategorizeTotal === 0 && preview.wouldUpdateTotal === 0 && preview.skippedCount === 0 && (
                                    <div className="flex flex-col items-center justify-center h-28 rounded-lg border border-muted text-center">
                                        <p className="text-sm text-muted-foreground">No transactions match this keyword</p>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>

                <Separator />

                <DialogFooter className="flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={applying}>
                        Cancel
                    </Button>

                    {isEdit ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleApplyOnly}
                                disabled={!canSubmit}
                            >
                                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                                Apply Now
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSave(false)}
                                disabled={!canSubmit}
                            >
                                Save
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleSave(true)}
                                disabled={!canSubmit}
                            >
                                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                Save & Apply
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleCreate(false)}
                                disabled={!canSubmit}
                            >
                                Create Rule
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleCreate(true)}
                                disabled={!canSubmit || totalWouldAffect === 0}
                                title={totalWouldAffect === 0 ? "No past transactions to apply to" : undefined}
                            >
                                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                                Create & Apply ({totalWouldAffect})
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
