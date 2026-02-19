// src/app/accounts/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { currency } from "@/lib/format";
import { format } from "date-fns";
import {
    Plus,
    Trash2,
    Pencil,
    CreditCard,
    PiggyBank,
    TrendingUp,
    Wallet,
    LayoutGrid,
    Table as TableIcon,
    Info,
    Target,
    FileText,
    Landmark,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

type AccountType = "checking" | "savings" | "investment" | "credit";

const typeIcons: Record<AccountType, React.ElementType> = {
    checking: Wallet,
    savings: PiggyBank,
    investment: TrendingUp,
    credit: CreditCard,
};

const typeColors: Record<AccountType, string> = {
    checking: "bg-primary/10 text-primary",
    savings: "bg-chart-2/10 text-chart-2",
    investment: "bg-chart-4/10 text-chart-4",
    credit: "bg-destructive/10 text-destructive",
};

const typeBorderColors: Record<AccountType, string> = {
    checking: "border-primary/30",
    savings: "border-chart-2/20",
    investment: "border-chart-4/20",
    credit: "border-destructive/20",
};

const typeLabels: Record<AccountType, string> = {
    checking: "Checking",
    savings: "Savings",
    investment: "Investment",
    credit: "Credit",
};

const typeOrder: AccountType[] = ["checking", "savings", "investment", "credit"];

function getAccountType(type: string): AccountType {
    if (type in typeIcons) return type as AccountType;
    return "checking";
}

export default function AccountsPage() {
    const { convexUser } = useConvexUser();
    const accounts = useQuery(
        convexUser ? api.accounts.listAccounts : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const createAccount = useMutation(api.accounts.createAccount);
    const updateAccountMut = useMutation(api.accounts.updateAccount);
    const deleteAccountMut = useMutation(api.accounts.deleteAccount);

    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<{
        _id: Id<"accounts">;
        name: string;
        bank: string;
        number?: string;
        type: string;
    } | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [form, setForm] = useState({
        bank: "",
        name: "",
        number: "",
        type: "checking" as AccountType,
    });

    const groupedAccounts = useMemo(() => {
        if (!accounts) return [];
        const groups = new Map<AccountType, typeof accounts>();
        for (const account of accounts) {
            const t = getAccountType(account.type);
            if (!groups.has(t)) groups.set(t, []);
            groups.get(t)!.push(account);
        }
        return typeOrder
            .filter(t => groups.has(t))
            .map(t => ({ type: t, accounts: groups.get(t)! }));
    }, [accounts]);

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">
                        Sign in required
                    </p>
                </div>
            </AppLayout>
        );
    }

    function resetForm() {
        setForm({ bank: "", name: "", number: "", type: "checking" });
    }

    async function handleAdd() {
        if (!form.name || !form.bank || !convexUser) return;
        await createAccount({
            userId: convexUser._id,
            name: form.name,
            bank: form.bank,
            number: form.number,
            type: form.type,
        });
        resetForm();
        setShowAdd(false);
    }

    async function handleEdit() {
        if (!editing) return;
        await updateAccountMut({
            accountId: editing._id,
            name: form.name,
            bank: form.bank,
            number: form.number,
            type: form.type,
        });
        setEditing(null);
    }

    function openEdit(account: {
        _id: Id<"accounts">;
        name: string;
        bank: string;
        number?: string;
        type: string;
    }) {
        setForm({
            bank: account.bank,
            name: account.name,
            number: account.number || "",
            type: account.type as AccountType,
        });
        setEditing(account);
    }

    return (
        <AppLayout>
            <InitUser />
            <div className="flex flex-col gap-6 p-6">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <Landmark className="h-8 w-8 text-primary" />
                            Accounts
                        </h1>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="size-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>Manage your financial accounts.</TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-lg border p-1">
                            <Button
                                variant={viewMode === "grid" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-8"
                                onClick={() => setViewMode("grid")}
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                Grid
                            </Button>
                            <Button
                                variant={viewMode === "table" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-8"
                                onClick={() => setViewMode("table")}
                            >
                                <TableIcon className="h-4 w-4 mr-2" />
                                Table
                            </Button>
                        </div>
                        <Button
                            onClick={() => {
                                resetForm();
                                setShowAdd(true);
                            }}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Account
                        </Button>
                    </div>
                </div>

                {/* Empty state */}
                {accounts && accounts.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-4">🏦</div>
                        <p className="text-muted-foreground mb-2">
                            No accounts yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Add your first account to get started
                        </p>
                    </div>
                )}

                {/* Account cards grid — grouped by type */}
                {viewMode === "grid" && groupedAccounts.length > 0 && groupedAccounts.map((group) => {
                    const GroupIcon = typeIcons[group.type];
                    return (
                        <div key={group.type}>
                            <div className="flex items-center gap-2 mb-4">
                                <GroupIcon className={`h-5 w-5 ${typeColors[group.type].split(" ")[1]}`} />
                                <h2 className="text-lg font-semibold">{typeLabels[group.type]}</h2>
                                <span className="text-sm text-muted-foreground">({group.accounts.length})</span>
                                <Separator className="flex-1" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.accounts.map((account) => {
                                    const acctType = group.type;
                                    const balance = account.balance ?? 0;
                                    const activeGoals = account.linkedGoals.filter(g => !g.is_completed);
                                    const lastImport = account.recentImports[0];
                                    return (
                                        <Card
                                            key={account._id}
                                            className={`relative overflow-hidden group hover:shadow-lg transition-shadow ${typeBorderColors[acctType]}`}
                                        >
                                            <CardContent className="px-4">
                                                {/* Top row: icon + name + actions */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">
                                                            {account.name}{account.number ? ` • ${account.number}` : ""}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{account.bank}</p>
                                                    </div>
                                                    <span className={`text-lg font-bold shrink-0 ${balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                                                        {currency(balance)}
                                                    </span>
                                                    <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                                                        <div className="flex gap-0.5 bg-background/90 backdrop-blur-sm rounded-md p-0.5 shadow-sm">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(account)}>
                                                                <Pencil className="h-3 w-3 text-muted-foreground" />
                                                                <span className="sr-only">Edit {account.name}</span>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                                                if (confirm("Are you sure you want to delete this account?")) {
                                                                    deleteAccountMut({ accountId: account._id });
                                                                }
                                                            }}>
                                                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                                                                <span className="sr-only">Delete {account.name}</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Linked Goals */}
                                                {activeGoals.length > 0 && (
                                                    <div className="mt-3 pt-2.5 border-t border-border/50">
                                                        <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1">
                                                            <Target className="size-3" />
                                                            Goals
                                                        </p>
                                                        <div className="flex flex-col gap-0.5">
                                                            {activeGoals.slice(0, 2).map((goal) => (
                                                                <div key={goal._id} className="flex items-center gap-1.5 text-xs">
                                                                    <span className="text-sm leading-none">{goal.emoji}</span>
                                                                    <span className="truncate text-foreground">{goal.name}</span>
                                                                    <span className="ml-auto text-muted-foreground shrink-0">
                                                                        {currency(goal.current_amount ?? 0)} / {currency(goal.total_amount)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {activeGoals.length > 2 && (
                                                                <p className="text-[11px] text-muted-foreground">+{activeGoals.length - 2} more</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Last Import */}
                                                {lastImport && (
                                                    <div className="mt-2.5 pt-2.5 border-t border-border/50">
                                                        <div className="flex items-center justify-between">
                                                            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                                                <FileText className="size-3" />
                                                                Last Import
                                                            </p>
                                                            {account.recentImports.length > 1 && (
                                                                <button
                                                                    className="text-[11px] text-primary hover:underline"
                                                                    onClick={() => {/* TODO: show imports dialog */}}
                                                                >
                                                                    See all ({account.recentImports.length})
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-foreground truncate mt-0.5">
                                                            {lastImport.fileName}
                                                            <span className="text-muted-foreground"> · {format(new Date(lastImport.uploadedAt), "MMM d")}</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Accounts table */}
                {viewMode === "table" && groupedAccounts.length > 0 && (
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bank</TableHead>
                                        <TableHead>Account Name</TableHead>
                                        <TableHead>Number</TableHead>
                                        <TableHead className="text-center">Goals</TableHead>
                                        <TableHead className="text-center">Imports</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="w-24 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedAccounts.map((group) => {
                                        const GroupIcon = typeIcons[group.type];
                                        return [
                                            <TableRow key={`header-${group.type}`} className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={7} className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <GroupIcon className={`h-4 w-4 ${typeColors[group.type].split(" ")[1]}`} />
                                                        <span className="text-sm font-semibold">{typeLabels[group.type]}</span>
                                                        <span className="text-xs text-muted-foreground">({group.accounts.length})</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>,
                                            ...group.accounts.map((account) => {
                                                const balance = account.balance ?? 0;
                                                const activeGoals = account.linkedGoals.filter(g => !g.is_completed);
                                                return (
                                                    <TableRow key={account._id}>
                                                        <TableCell className="font-medium text-foreground">
                                                            {account.bank}
                                                        </TableCell>
                                                        <TableCell className="text-foreground">
                                                            {account.name}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-muted-foreground">
                                                            {account.number || "-"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {activeGoals.length > 0 ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="inline-flex items-center gap-1 text-xs cursor-default">
                                                                            <Target className="size-3 text-primary" />
                                                                            {activeGoals.length}
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        {activeGoals.map(g => `${g.emoji} ${g.name}`).join(", ")}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {account.recentImports.length > 0 ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="inline-flex items-center gap-1 text-xs cursor-default">
                                                                            <FileText className="size-3 text-muted-foreground" />
                                                                            {account.recentImports.length}
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        {account.recentImports.map(i => i.fileName).join(", ")}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell
                                                            className={`text-right font-mono font-semibold ${balance >= 0 ? "text-foreground" : "text-destructive"}`}
                                                        >
                                                            {currency(balance)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex gap-1 justify-end">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(account)}>
                                                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="sr-only">Edit {account.name}</span>
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                                                    if (confirm("Are you sure you want to delete this account?")) {
                                                                        deleteAccountMut({ accountId: account._id });
                                                                    }
                                                                }}>
                                                                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="sr-only">Delete {account.name}</span>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }),
                                        ];
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Add / Edit Dialog */}
                <Dialog
                    open={showAdd || !!editing}
                    onOpenChange={(open) => {
                        if (!open) {
                            setShowAdd(false);
                            setEditing(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editing ? "Edit Account" : "Add Account"}
                            </DialogTitle>
                            <DialogDescription>
                                {editing
                                    ? "Update your account details."
                                    : "Add a new financial account to track."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label>Bank</Label>
                                    <Input
                                        placeholder="e.g. Chase"
                                        value={form.bank}
                                        onChange={(e) =>
                                            setForm({ ...form, bank: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Account Name</Label>
                                    <Input
                                        placeholder="e.g. Main Checking"
                                        value={form.name}
                                        onChange={(e) =>
                                            setForm({ ...form, name: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label>Account Number</Label>
                                    <Input
                                        placeholder="e.g. 5440"
                                        value={form.number}
                                        onChange={(e) =>
                                            setForm({ ...form, number: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Type</Label>
                                    <Select
                                        value={form.type}
                                        onValueChange={(v) =>
                                            setForm({ ...form, type: v as AccountType })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="checking">Checking</SelectItem>
                                            <SelectItem value="savings">Savings</SelectItem>
                                            <SelectItem value="investment">Investment</SelectItem>
                                            <SelectItem value="credit">Credit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAdd(false);
                                    setEditing(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={editing ? handleEdit : handleAdd}>
                                {editing ? "Save Changes" : "Add Account"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}