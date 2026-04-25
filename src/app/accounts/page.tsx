"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { currency } from "@/lib/format";
import { format } from "date-fns";
import { Plus, Trash2, Pencil, CreditCard, PiggyBank, TrendingUp, Wallet, LayoutGrid, Table as TableIcon, Target, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountType = "checking" | "savings" | "investment" | "credit";

const TYPE_META: Record<AccountType, { label: string; icon: React.ElementType }> = {
    checking:   { label: "Checking",   icon: Wallet },
    savings:    { label: "Savings",    icon: PiggyBank },
    investment: { label: "Investment", icon: TrendingUp },
    credit:     { label: "Credit",     icon: CreditCard },
};

const TYPE_ORDER: AccountType[] = ["checking", "savings", "investment", "credit"];

const toAccountType = (t: string): AccountType => (t in TYPE_META ? (t as AccountType) : "checking");

const NUM = "font-['Manrope',sans-serif] tabular-nums";
const ICON_BTN = "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors";

type Goal    = { _id: string; name: string; emoji?: string; current_amount?: number; total_amount: number; is_completed?: boolean };
type Import  = { fileName: string; uploadedAt: number };
type Account = { _id: Id<"accounts">; name: string; bank: string; number?: string; type: string; balance?: number; linkedGoals: Goal[]; recentImports: Import[] };

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ type, count, collapsed, onToggle }: { type: AccountType; count: number; collapsed: boolean; onToggle: () => void }) {
    const { icon: Icon, label } = TYPE_META[type];
    return (
        <button className="flex w-full items-center gap-2 select-none" onClick={onToggle}>
            <Icon className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className="text-xs text-muted-foreground/50">({count})</span>
            <span className="flex-1 h-px bg-border" />
            <ChevronDown className={cn("size-3.5 text-muted-foreground/50 transition-transform duration-300", collapsed && "-rotate-90")} />
        </button>
    );
}

// ─── Account card ─────────────────────────────────────────────────────────────

function AccountCard({ account, onEdit, onDelete }: { account: Account; onEdit: () => void; onDelete: () => void }) {
    const balance = account.balance ?? 0;
    const activeGoals = account.linkedGoals.filter((g) => !g.is_completed);
    const lastImport = account.recentImports[0];

    return (
        <div className="relative group rounded-lg border bg-card p-5 flex flex-col transition-colors shadow-sm">
            <div className="absolute top-2.5 right-2.5 flex gap-0.5 rounded-md border bg-background p-0.5 opacity-0 transition-opacity group-hover:opacity-100 z-10">
                <button className={cn(ICON_BTN, "hover:bg-muted hover:text-foreground")} onClick={onEdit}><Pencil className="h-3 w-3" /></button>
                <button className={cn(ICON_BTN, "hover:bg-destructive/10 hover:text-destructive")} onClick={onDelete}><Trash2 className="h-3 w-3" /></button>
            </div>

            {/* Name + balance */}
            <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                        {account.name}
                        {account.number && <span className="text-muted-foreground font-normal"> · {account.number}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{account.bank}</p>
                </div>
                <span className={cn(NUM, "text-sm font-semibold shrink-0", balance < 0 ? "text-destructive" : "text-foreground")}>
                    {currency(balance)}
                </span>
            </div>

            {/* Goals */}
            {activeGoals.length > 0 && (
                <>
                    <div className="h-px bg-border my-3" />
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                        <Target className="size-3" /> Goals
                    </p>
                    <div className="flex flex-col gap-1">
                        {activeGoals.slice(0, 2).map((g) => (
                            <div key={g._id} className="flex items-center gap-1.5 text-xs">
                                {g.emoji && <span className="leading-none">{g.emoji}</span>}
                                <span className="truncate">{g.name}</span>
                                <span className={cn(NUM, "ml-auto text-muted-foreground shrink-0 text-[11px]")}>
                                    {currency(g.current_amount ?? 0)} / {currency(g.total_amount)}
                                </span>
                            </div>
                        ))}
                        {activeGoals.length > 2 && <p className="text-xs text-muted-foreground">+{activeGoals.length - 2} more</p>}
                    </div>
                </>
            )}

            {/* Last import */}
            {lastImport && (
                <>
                    <div className="h-px bg-border my-3" />
                    <div className="flex items-center justify-between mb-1">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="size-3" /> Last import
                        </p>
                        {account.recentImports.length > 1 && (
                            <button className="text-xs text-primary hover:underline">
                                See all ({account.recentImports.length})
                            </button>
                        )}
                    </div>
                    <p className="text-xs truncate">
                        {lastImport.fileName}
                        <span className="text-muted-foreground"> · {format(new Date(lastImport.uploadedAt), "MMM d")}</span>
                    </p>
                </>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="flex flex-col gap-1.5"><Label>{label}</Label>{children}</div>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BLANK_FORM = { bank: "", name: "", number: "", type: "checking" as AccountType, balance: "" };

export default function AccountsPage() {
    const { convexUser } = useConvexUser();
    const accounts = useQuery(
        convexUser ? api.accounts.listAccounts : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    );
    const createAccount    = useMutation(api.accounts.createAccount);
    const updateAccountMut = useMutation(api.accounts.updateAccount);
    const deleteAccountMut = useMutation(api.accounts.deleteAccount);

    const [form, setForm]         = useState(BLANK_FORM);
    const [editing, setEditing]   = useState<Account | null>(null);
    const [showAdd, setShowAdd]   = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [collapsed, setCollapsed] = useState<Set<AccountType>>(new Set());

    const grouped = useMemo(() => {
        if (!accounts) return [];
        const map = new Map<AccountType, Account[]>();
        for (const a of accounts) {
            const t = toAccountType(a.type);
            if (!map.has(t)) map.set(t, []);
            map.get(t)!.push(a);
        }
        return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({ type: t, accounts: map.get(t)! }));
    }, [accounts]);

    if (!convexUser) return (
        <AppLayout>
            <div className="flex items-center justify-center h-64">
                <p className="text-sm text-muted-foreground">Sign in required</p>
            </div>
        </AppLayout>
    );

    const toggle = (t: AccountType) =>
        setCollapsed((prev) => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });

    function openEdit(a: Account) {
        setForm({ bank: a.bank, name: a.name, number: a.number || "", type: toAccountType(a.type), balance: a.balance != null ? String(a.balance) : "" });
        setEditing(a);
    }

    function closeDialog() { setShowAdd(false); setEditing(null); }

    async function handleSubmit() {
        if (!convexUser) return;
        const bal = form.balance !== "" ? parseFloat(form.balance) : 0;
        if (editing) {
            await updateAccountMut({ accountId: editing._id, name: form.name, bank: form.bank, number: form.number, type: form.type, balance: bal });
        } else {
            if (!form.name || !form.bank) return;
            await createAccount({ userId: convexUser._id, name: form.name, bank: form.bank, number: form.number, type: form.type, balance: bal });
        }
        closeDialog();
        setForm(BLANK_FORM);
    }

    return (
        <AppLayout>
            <InitUser />
            <div className="container flex flex-col">
                <div className="flex flex-col gap-6 p-6">

                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "table")} className="flex flex-col gap-6">

                        {/* Toolbar */}
                        <div className="flex items-center justify-between">
                            <TabsList>
                                <TabsTrigger value="grid" className="gap-1.5">
                                    <LayoutGrid className="size-3.5" /> Grid
                                </TabsTrigger>
                                <TabsTrigger value="table" className="gap-1.5">
                                    <TableIcon className="size-3.5" /> Table
                                </TabsTrigger>
                            </TabsList>
                            <Button className="gap-2" onClick={() => { setForm(BLANK_FORM); setShowAdd(true); }}>
                                <Plus className="size-4" /> 
                                Add account
                            </Button>
                        </div>

                        {/* Empty state */}
                        {accounts?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
                                <Wallet className="size-8 text-muted-foreground/30" />
                                <p className="text-sm font-medium">No accounts yet</p>
                                <p className="text-sm text-muted-foreground">Add your first account to start planning.</p>
                            </div>
                        )}

                        {/* Grid view */}
                        <TabsContent value="grid">
                            {grouped.length > 0 && (
                                <div className="flex flex-col gap-6">
                                    {grouped.map(({ type, accounts: accs }) => (
                                        <div key={type} className="flex flex-col gap-3">
                                            <SectionHeader type={type} count={accs.length} collapsed={collapsed.has(type)} onToggle={() => toggle(type)} />
                                            <div className={cn("grid transition-[grid-template-rows] duration-300 ease-in-out", collapsed.has(type) ? "grid-rows-[0fr]" : "grid-rows-[1fr]")}>
                                                <div className="overflow-hidden">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-1">
                                                        {accs.map((a) => (
                                                            <AccountCard
                                                                key={a._id}
                                                                account={a}
                                                                onEdit={() => openEdit(a)}
                                                                onDelete={() => confirm("Delete this account?") && deleteAccountMut({ accountId: a._id })}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Table view */}
                        <TabsContent value="table">
                            {grouped.length > 0 && (
                                <Card>
                                    <CardContent className="p-0">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    {["Bank", "Account", "Number", "Goals", "Imports", "Balance", ""].map((h, i) => (
                                                        <th key={i} className={cn(
                                                            "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide",
                                                            i === 3 || i === 4 ? "text-center" : i === 5 ? "text-right" : "text-left",
                                                            i === 6 && "w-20"
                                                        )}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            {grouped.map(({ type, accounts: accs }) => {
                                                const { icon: Icon, label } = TYPE_META[type];
                                                const isCollapsed = collapsed.has(type);
                                                return (
                                                    <tbody key={type}>
                                                        <tr className="bg-muted/40 hover:bg-muted/60 cursor-pointer select-none transition-colors" onClick={() => toggle(type)}>
                                                            <td colSpan={7} className="px-4 py-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Icon className="size-3.5 text-muted-foreground" />
                                                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                                                                    <span className="text-xs text-muted-foreground/50">({accs.length})</span>
                                                                    <ChevronDown className={cn("size-3.5 text-muted-foreground/50 ml-auto transition-transform duration-300", isCollapsed && "-rotate-90")} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {!isCollapsed && accs.map((a) => {
                                                            const bal = a.balance ?? 0;
                                                            const goals = a.linkedGoals.filter((g) => !g.is_completed);
                                                            return (
                                                                <tr key={a._id} className="border-t hover:bg-muted/30 transition-colors">
                                                                    <td className="px-4 py-3 font-medium">{a.bank}</td>
                                                                    <td className="px-4 py-3">{a.name}</td>
                                                                    <td className={cn(NUM, "px-4 py-3 text-muted-foreground text-xs")}>{a.number || "—"}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {goals.length > 0 ? (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <span className="inline-flex items-center gap-1 text-xs cursor-default text-primary">
                                                                                        <Target className="size-3" />{goals.length}
                                                                                    </span>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>{goals.map((g) => `${g.emoji ?? ""} ${g.name}`.trim()).join(", ")}</TooltipContent>
                                                                            </Tooltip>
                                                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {a.recentImports.length > 0 ? (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <span className="inline-flex items-center gap-1 text-xs cursor-default text-muted-foreground">
                                                                                        <FileText className="size-3" />{a.recentImports.length}
                                                                                    </span>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>{a.recentImports.map((i) => i.fileName).join(", ")}</TooltipContent>
                                                                            </Tooltip>
                                                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                                                    </td>
                                                                    <td className={cn(NUM, "px-4 py-3 text-right font-semibold", bal < 0 ? "text-destructive" : "text-foreground")}>
                                                                        {currency(bal)}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-0.5 justify-end">
                                                                            <button className={cn(ICON_BTN, "hover:bg-muted hover:text-foreground")} onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></button>
                                                                            <button className={cn(ICON_BTN, "hover:bg-destructive/10 hover:text-destructive")} onClick={() => confirm("Delete this account?") && deleteAccountMut({ accountId: a._id })}><Trash2 className="h-3 w-3" /></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                );
                                            })}
                                        </table>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                    </Tabs>

                    {/* Dialog */}
                    <Dialog open={showAdd || !!editing} onOpenChange={(o) => !o && closeDialog()}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editing ? "Edit account" : "Add account"}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 mt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Bank"><Input placeholder="e.g. Chase" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></Field>
                                    <Field label="Account name"><Input placeholder="e.g. Main Checking" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Last 4 digits"><Input placeholder="e.g. 5440" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
                                    <Field label="Type">
                                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AccountType })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {TYPE_ORDER.map((t) => <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                                <Field label="Balance"><Input type="number" placeholder="e.g. 1500.00" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></Field>
                            </div>
                            <DialogFooter className="mt-6">
                                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                                <Button onClick={handleSubmit}>{editing ? "Save changes" : "Add account"}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </div>
            </div>
        </AppLayout>
    );
}