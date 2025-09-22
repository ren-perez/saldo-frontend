"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";

function LinkedAccounts({ presetId, accounts }: { presetId: string, accounts: any[] }) {
  const linkedAccounts = useQuery(api.presets.getPresetAccounts, { presetId });
  const linkPreset = useMutation(api.presets.linkPresetToAccount);
  const unlinkPreset = useMutation(api.presets.unlinkPresetFromAccount);

  if (!linkedAccounts) return null;

  return (
    <div className="mt-2">
      <p className="font-semibold">Linked Accounts:</p>
      <div className="flex flex-wrap gap-2">
        {accounts?.map(acc => {
          const isLinked = linkedAccounts.includes(acc._id);
          return (
            <label key={acc._id} className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={isLinked}
                onChange={async e => {
                  if (e.target.checked) {
                    await linkPreset({ presetId, accountId: acc._id });
                  } else {
                    await unlinkPreset({ presetId, accountId: acc._id });
                  }
                }}
              />
              <span>
                {acc.bank} {acc.name}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function PresetsPage() {
  const { convexUser } = useConvexUser();

  const presets = useQuery(
    convexUser ? api.presets.listPresets : "skip",
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const accounts = useQuery(
    convexUser ? api.accounts.listAccounts : "skip",
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const createPreset = useMutation(api.presets.createPreset);
  const deletePreset = useMutation(api.presets.deletePreset);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!convexUser) return <p>Sign in required</p>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">Presets</h2>

      {/* Create Form */}
      <form
        onSubmit={async e => {
          e.preventDefault();
          await createPreset({
            userId: convexUser._id,
            name,
            description,
            delimiter: ",",
            hasHeader: true,
            skipRows: 0,
            accountColumn: "Account Number",
            amountMultiplier: 1,
            dateColumn: "Transaction Date",
            dateFormat: "%m/%d/%y",
            descriptionColumn: "Transaction Description",
            amountColumns: ["Transaction Amount"],
            amountProcessing: { debit_values: ["Debit"], credit_values: ["Credit"] },
          });
          setName("");
          setDescription("");
        }}
        className="space-x-2"
      >
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Preset name"
          className="border p-1"
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description"
          className="border p-1"
        />
        <button type="submit" className="border px-2">
          Add
        </button>
      </form>

      {/* List Presets */}
      <ul className="space-y-4">
        {presets?.map(preset => (
          <li key={preset._id} className="border p-2">
            <div className="flex justify-between">
              <span className="font-bold">{preset.name}</span>
              <button
                onClick={() => deletePreset({ presetId: preset._id })}
                className="text-red-500"
              >
                Delete
              </button>
            </div>
            <p className="text-sm">{preset.description}</p>
            <LinkedAccounts presetId={preset._id} accounts={accounts ?? []} />
          </li>
        ))}
      </ul>
    </div>
  );
}
