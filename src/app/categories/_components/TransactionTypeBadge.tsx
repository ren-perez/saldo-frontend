import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_PILL } from "../constants";

export function TransactionTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        TRANSACTION_TYPE_PILL[type] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {TRANSACTION_TYPE_LABELS[type] ?? type}
    </span>
  );
}
