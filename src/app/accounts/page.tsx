// src/app/accounts/page.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useConvexUser } from "@/hooks/useConvexUser";

export default function AccountsPage() {
    const { user } = useUser();
    const { convexUser } = useConvexUser();

    const accounts = useQuery(
        convexUser ? api.accounts.listAccounts: "skip" as any, 
        convexUser ? { userId: convexUser._id } : "skip");
        
    const createAccount = useMutation(api.accounts.createAccount);
    const updateAccount = useMutation(api.accounts.updateAccount);
    const deleteAccount = useMutation(api.accounts.deleteAccount);

    const [name, setName] = useState("");
    const [bank, setBank] = useState("");
    const [type, setType] = useState("checking");

    if (!convexUser) return <p>Sign in required</p>;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-xl font-bold">Accounts</h2>

            {/* Create Form */}
            <form
                onSubmit={async e => {
                    e.preventDefault();
                    await createAccount({ userId: convexUser._id, name, bank, type });
                    setName(""); setBank("");
                }}
                className="space-x-2"
            >
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Account name" className="border p-1" />
                <input value={bank} onChange={e => setBank(e.target.value)} placeholder="Bank" className="border p-1" />
                <select value={type} onChange={e => setType(e.target.value)} className="border p-1">
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit</option>
                </select>
                <button type="submit" className="border px-2">Add</button>
            </form>

            {/* List + Edit/Delete */}
            <ul className="space-y-2">
                {accounts?.map(acc => (
                    <li key={acc._id} className="flex items-center space-x-2">
                        <span>{acc.bank} {acc.name} ({acc.type})</span>
                        <button onClick={() => deleteAccount({ accountId: acc._id })} className="text-red-500">Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
