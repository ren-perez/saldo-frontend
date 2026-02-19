// src/app/accounts/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

type AccountType = "checking" | "savings" | "investment" | "credit";

const typeIcons: Record<AccountType, React.ElementType> = {
    checking: Wallet,
    savings: PiggyBank,
    investment: TrendingUp,
    credit: CreditCard,
};

const typeColors: Record<AccountType, string> = {
    checking: "bg-chart-2/10 text-chart-2",
    savings: "bg-primary/10 text-primary",
    investment: "bg-chart-4/10 text-chart-4",
    credit: "bg-destructive/10 text-destructive",
};

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

    function getAccountType(type: string): AccountType {
        if (type in typeIcons) return type as AccountType;
        return "checking";
    }

    return (
        <AppLayout>
            <InitUser />
            <div className="w-full min-w-0 mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Accounts
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Manage your financial accounts. Click an account
                                to view details.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-lg border p-1">
                                <Button
                                    variant={
                                        viewMode === "grid"
                                            ? "secondary"
                                            : "ghost"
                                    }
                                    size="sm"
                                    className="h-8"
                                    onClick={() => setViewMode("grid")}
                                >
                                    <LayoutGrid className="h-4 w-4 mr-2" />
                                    Grid
                                </Button>
                                <Button
                                    variant={
                                        viewMode === "table"
                                            ? "secondary"
                                            : "ghost"
                                    }
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

                    {/* Account cards grid */}
                    {viewMode === "grid" && accounts && accounts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {accounts.map((account) => {
                                const acctType = getAccountType(account.type);
                                const Icon = typeIcons[acctType];
                                const balance = account.balance ?? 0;
                                return (
                                    <Card
                                        key={account._id}
                                        className="relative overflow-hidden group hover:shadow-lg transition-shadow"
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <Link
                                                    href={`/accounts/${account._id}`}
                                                    className="flex-1"
                                                >
                                                    <div
                                                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeColors[acctType]}`}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                </Link>
                                                <div className="absolute top-3 right-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <div className="flex gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() =>
                                                                openEdit(
                                                                    account
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                                            <span className="sr-only">
                                                                Edit{" "}
                                                                {account.name}
                                                            </span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => {
                                                                if (
                                                                    confirm(
                                                                        "Are you sure you want to delete this account?"
                                                                    )
                                                                ) {
                                                                    deleteAccountMut(
                                                                        {
                                                                            accountId:
                                                                                account._id,
                                                                        }
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                                                            <span className="sr-only">
                                                                Delete{" "}
                                                                {account.name}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/accounts/${account._id}`}
                                            >
                                                <p className="text-sm font-medium text-foreground">
                                                    {account.name}
                                                    {account.number
                                                        ? ` • ${account.number}`
                                                        : ""}
                                                </p>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {account.bank}
                                                </p>
                                                <div className="flex items-baseline gap-2">
                                                    <span
                                                        className={`text-2xl font-bold ${balance >= 0 ? "text-foreground" : "text-destructive"}`}
                                                    >
                                                        {currency(balance)}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] uppercase tracking-wider"
                                                    >
                                                        {account.type}
                                                    </Badge>
                                                </div>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Accounts table */}
                    {viewMode === "table" &&
                        accounts &&
                        accounts.length > 0 && (
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bank</TableHead>
                                                <TableHead>
                                                    Account Name
                                                </TableHead>
                                                <TableHead>Number</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead className="text-right">
                                                    Balance
                                                </TableHead>
                                                <TableHead className="w-28 text-right">
                                                    Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {accounts.map((account) => {
                                                const balance =
                                                    account.balance ?? 0;
                                                return (
                                                    <TableRow key={account._id}>
                                                        <TableCell className="font-medium text-foreground">
                                                            <Link
                                                                href={`/accounts/${account._id}`}
                                                                className="hover:underline"
                                                            >
                                                                {account.bank}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className="text-foreground">
                                                            <Link
                                                                href={`/accounts/${account._id}`}
                                                                className="hover:underline"
                                                            >
                                                                {account.name}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-muted-foreground">
                                                            {account.number ||
                                                                "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs capitalize"
                                                            >
                                                                {account.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell
                                                            className={`text-right font-mono font-semibold ${balance >= 0 ? "text-foreground" : "text-destructive"}`}
                                                        >
                                                            {currency(balance)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex gap-1 justify-end">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            account
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="sr-only">
                                                                        Edit{" "}
                                                                        {
                                                                            account.name
                                                                        }
                                                                    </span>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() => {
                                                                        if (
                                                                            confirm(
                                                                                "Are you sure you want to delete this account?"
                                                                            )
                                                                        ) {
                                                                            deleteAccountMut(
                                                                                {
                                                                                    accountId:
                                                                                        account._id,
                                                                                }
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="sr-only">
                                                                        Delete{" "}
                                                                        {
                                                                            account.name
                                                                        }
                                                                    </span>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
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
                                    {editing
                                        ? "Edit Account"
                                        : "Add Account"}
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
                                                setForm({
                                                    ...form,
                                                    bank: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Account Name</Label>
                                        <Input
                                            placeholder="e.g. Main Checking"
                                            value={form.name}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    name: e.target.value,
                                                })
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
                                                setForm({
                                                    ...form,
                                                    number: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Type</Label>
                                        <Select
                                            value={form.type}
                                            onValueChange={(v) =>
                                                setForm({
                                                    ...form,
                                                    type: v as AccountType,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="checking">
                                                    Checking
                                                </SelectItem>
                                                <SelectItem value="savings">
                                                    Savings
                                                </SelectItem>
                                                <SelectItem value="investment">
                                                    Investment
                                                </SelectItem>
                                                <SelectItem value="credit">
                                                    Credit
                                                </SelectItem>
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
                                <Button
                                    onClick={editing ? handleEdit : handleAdd}
                                >
                                    {editing ? "Save Changes" : "Add Account"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
}
