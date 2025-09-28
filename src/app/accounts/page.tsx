// src/app/accounts/page.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useState } from "react";
import { EditAccountDialog } from "@/components/EditAccountDialog";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { AddAccountDialog } from "@/components/AddAccountDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AccountsPage() {
    const { convexUser } = useConvexUser();
    const accounts = useQuery(
        convexUser ? api.accounts.listAccounts : ("skip" as never),
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const updateAccount = useMutation(api.accounts.updateAccount);
    const deleteAccount = useMutation(api.accounts.deleteAccount);

    const [openAdd, setOpenAdd] = useState(false);
    const [editing, setEditing] = useState<{
        _id: string;
        name: string;
        number?: string;
        type: string;
        bank: string;
        createdAt: string;
    } | null>(null);

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Sign in required</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <InitUser />
            <div className="w-full min-w-0 mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 max-w-7xl">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-foreground">Your Accounts</h1>
                    {/* <p className="text-muted-foreground">Manage your financial accounts</p> */}
                </div>

                {/* Toolbar with Add Button */}
                <div className="flex justify-end mb-4">
                    <Button onClick={() => setOpenAdd(true)}>
                        <Plus className="h-4 w-4" />
                        {/* Add Account */}
                    </Button>
                </div>

                {/* Accounts List */}
                {/* <div className="bg-card rounded-lg shadow-sm border border-border"> */}
                <div className="">
                    {/* <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-lg font-medium text-foreground">Your Accounts</h2>
                    </div> */}
                    {/* <div className="p-6"> */}
                    <div className="py-6">
                        {(!accounts || accounts.length === 0) ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-4">🏦</div>
                                <p className="text-muted-foreground mb-2">No accounts yet</p>
                                <p className="text-sm text-muted-foreground">Add your first account above to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {accounts.map(acc => (
                                    <div
                                        key={acc._id}
                                        className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow ease-in-out duration-300"
                                    >
                                        <div>
                                            <div className="font-medium text-foreground">
                                                {acc.bank} {acc.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground capitalize">
                                                {acc.type} {acc.number && `• ***${acc.number}`}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setEditing(acc)}
                                                className="text-primary hover:underline text-sm font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to delete this account?")) {
                                                        deleteAccount({ accountId: acc._id });
                                                    }
                                                }}
                                                className="text-destructive hover:underline text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Account Dialog */}
                <AddAccountDialog
                    open={openAdd}
                    onClose={() => setOpenAdd(false)}
                />

                {/* Edit Dialog */}
                <EditAccountDialog
                    open={!!editing}
                    account={editing}
                    onClose={() => setEditing(null)}
                    onSave={async updates => {
                        if (!editing) return;
                        await updateAccount({
                            accountId: editing._id as Id<"accounts">,
                            ...updates
                        });
                        setEditing(null);
                    }}
                />
            </div>
        </AppLayout>
    );
}
