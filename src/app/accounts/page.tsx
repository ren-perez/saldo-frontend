// src/app/accounts/page.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useState } from "react";
import { EditAccountDialog } from "@/components/EditAccountDialog";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";

export default function AccountsPage() {
    const { convexUser } = useConvexUser();
    const accounts = useQuery(
        convexUser ? api.accounts.listAccounts : "skip" as any,
        convexUser ? { userId: convexUser._id } : "skip"
    );

    const createAccount = useMutation(api.accounts.createAccount);
    const updateAccount = useMutation(api.accounts.updateAccount);
    const deleteAccount = useMutation(api.accounts.deleteAccount);

    const [name, setName] = useState("");
    const [bank, setBank] = useState("");
    const [number, setNumber] = useState("");
    const [type, setType] = useState("checking");

    const [editing, setEditing] = useState<any>(null);

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg">Sign in required</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <InitUser />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
                    <p className="text-gray-600">Manage your financial accounts</p>
                </div>

                {/* Create Form */}
                <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Account</h2>
                    <form
                        onSubmit={async e => {
                            e.preventDefault();
                            await createAccount({
                                userId: convexUser._id,
                                name, bank, number, type
                            });
                            setName(""); setBank(""); setNumber(""); setType("checking");
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Name
                                </label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g., Capital One 7729"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bank
                                </label>
                                <input
                                    value={bank}
                                    onChange={e => setBank(e.target.value)}
                                    placeholder="e.g., Capital One"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Number (optional)
                                </label>
                                <input
                                    value={number}
                                    onChange={e => setNumber(e.target.value)}
                                    placeholder="Last 4 digits"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Type
                                </label>
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="checking">Checking</option>
                                    <option value="savings">Savings</option>
                                    <option value="credit">Credit</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                        >
                            Add Account
                        </button>
                    </form>
                </div>

                {/* Accounts List */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Your Accounts</h2>
                    </div>
                    <div className="p-6">
                        {(!accounts || accounts.length === 0) ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-4">🏦</div>
                                <p className="text-gray-500 mb-4">No accounts yet</p>
                                <p className="text-sm text-gray-400">Add your first account above to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {accounts.map(acc => (
                                    <div key={acc._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {acc.bank} {acc.name}
                                            </div>
                                            <div className="text-sm text-gray-500 capitalize">
                                                {acc.type} {acc.number && `• ***${acc.number}`}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setEditing(acc)}
                                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to delete this account?")) {
                                                        deleteAccount({ accountId: acc._id });
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-700 text-sm font-medium"
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

                {/* Edit Dialog */}
                <EditAccountDialog
                    open={!!editing}
                    account={editing}
                    onClose={() => setEditing(null)}
                    onSave={async updates => {
                        await updateAccount({
                            accountId: editing._id,
                            ...updates
                        });
                        setEditing(null);
                    }}
                />
            </div>
        </AppLayout>
    );
}