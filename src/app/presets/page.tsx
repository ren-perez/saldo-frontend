// src/app/presets/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { EditPresetDialog } from "@/components/EditPresetDialog";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Button } from "@/components/ui/button";

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


function LinkedAccounts({ presetId, accounts }: { presetId: Id<"presets">; accounts: Array<{ _id: Id<"accounts">; name: string; bank: string }> }) {
  const linkedAccounts = useQuery(api.presets.getPresetAccounts, { presetId });
  const linkPreset = useMutation(api.presets.linkPresetToAccount);
  const unlinkPreset = useMutation(api.presets.unlinkPresetFromAccount);

  if (!linkedAccounts) return null;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-foreground mb-2">Linked Accounts:</h4>
      <div className="space-y-2">
        {accounts?.map((acc) => {
          const isLinked = linkedAccounts.includes(acc._id);
          return (
            <label key={acc._id} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={isLinked}
                onChange={async (e) => {
                  if (e.target.checked) {
                    await linkPreset({ presetId, accountId: acc._id });
                  } else {
                    await unlinkPreset({ presetId, accountId: acc._id });
                  }
                }}
                className="h-4 w-4 text-primary border-border rounded focus:ring-ring"
              />
              <span className="text-muted-foreground">
                {acc.bank} {acc.name}
              </span>
            </label>
          );
        })}
      </div>
      {(!accounts || accounts.length === 0) && (
        <p className="text-sm text-muted-foreground italic">No accounts available to link</p>
      )}
    </div>
  );
}

export default function PresetsPage() {
  const { convexUser } = useConvexUser();

  const presets = useQuery(
    api.presets.listPresets,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const accounts = useQuery(
    api.accounts.listAccounts,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const createPreset = useMutation(api.presets.createPreset);
  const deletePreset = useMutation(api.presets.deletePreset);
  const updatePreset = useMutation(api.presets.updatePreset);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // const [editingPreset, setEditingPreset] = useState<{
  //   _id: Id<"presets">;
  //   name: string;
  //   description: string;
  //   [key: string]: unknown;
  // } | null>(null);
  const [editingPreset, setEditingPreset] = useState<{
    _id: Id<"presets">;
    name: string;
    description: string;
    delimiter: string;
    hasHeader: boolean;
    skipRows: number;
    amountMultiplier: number;
    dateColumn: string;
    dateFormat: string;
    descriptionColumn: string;
    amountColumns: string[];
    categoryColumn?: string;
    accountColumn?: string;
    amountProcessing: AmountProcessing;
    [key: string]: unknown;
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">CSV Import Presets</h1>
          <p className="text-muted-foreground">Configure how to import your bank statements</p>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-accent border border-border rounded-lg p-4 mb-8">
          <h3 className="font-medium text-foreground mb-2">💡 Quick Start</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Presets define how to parse your CSV files. Each bank exports data differently.
          </p>
          <div className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Create a preset, then link it to your accounts for easy importing.
          </div>
        </div>

        {/* Create Form */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <h2 className="text-lg font-medium text-foreground mb-4">Create New Preset</h2>
          <form
            onSubmit={async (e) => {
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
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Preset Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Capital One Checking"
                  className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this format"
                  className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                  required
                />
              </div>
            </div>

            <Button type="submit">Create Preset</Button>
          </form>
        </div>

        {/* Presets List */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-medium text-foreground">Your Presets</h2>
          </div>
          <div className="p-6">
            {(!presets || presets.length === 0) ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚙️</div>
                <p className="text-muted-foreground mb-2">No presets yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first preset above to configure CSV imports
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {presets.map((preset) => (
                  <div key={preset._id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-medium text-foreground">{preset.name}</h3>
                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingPreset(preset)}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this preset?")) {
                              deletePreset({ presetId: preset._id });
                            }
                          }}
                          className="text-destructive hover:underline text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Preset Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground mb-4 bg-muted p-3 rounded">
                      <div><strong>Delimiter:</strong> &quot;{preset.delimiter}&quot;</div>
                      <div><strong>Header:</strong> {preset.hasHeader ? "Yes" : "No"}</div>
                      <div><strong>Skip:</strong> {preset.skipRows} rows</div>
                      <div><strong>Multiplier:</strong> {preset.amountMultiplier}</div>
                      <div><strong>Date:</strong> {preset.dateColumn}</div>
                      <div><strong>Amount:</strong> {preset.amountColumns.join(", ")}</div>
                      <div><strong>Description:</strong> {preset.descriptionColumn}</div>
                      <div><strong>Category:</strong> {preset.categoryColumn || "None"}</div>
                    </div>

                    <LinkedAccounts presetId={preset._id as Id<"presets">} accounts={accounts ?? []} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Dialog */}
        {editingPreset && (
          <EditPresetDialog
            open={!!editingPreset}
            preset={editingPreset}
            onClose={() => setEditingPreset(null)}
            onSave={async (updates) => {
              const { _id, ...rest } = updates;
              await updatePreset({ presetId: _id as Id<"presets">, updates: rest });
              setEditingPreset(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
