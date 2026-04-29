import { Transaction, Account, Category, CategoryGroup } from "../_types";

interface CSVLookups {
  accounts: Account[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
}

function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function generateCSV(transactions: Transaction[], lookups: CSVLookups): string {
  const { accounts, categories, categoryGroups } = lookups;

  const headers = ["Date", "Description", "Account", "Type", "Group", "Category", "Amount", "Transfer Pair ID"];

  const rows = transactions.map((tx) => {
    const account = accounts.find((a) => a._id === tx.accountId);
    const category = categories.find((c) => c._id === tx.categoryId);
    const group = categoryGroups.find((g) => g._id === category?.groupId);

    return [
      new Date(tx.date).toISOString().slice(0, 10),
      escapeCell(tx.description || ""),
      escapeCell(account?.name || ""),
      tx.transactionType || "",
      escapeCell(group?.name || ""),
      escapeCell(category?.name || ""),
      tx.amount.toString(),
      tx.transfer_pair_id || "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  lookups: CSVLookups,
  label?: string
): void {
  const csv = generateCSV(transactions, lookups);
  const date = new Date().toISOString().slice(0, 10);
  downloadCSV(csv, `transactions-${label ?? date}.csv`);
}
