import type { FlowType } from "../types";

const FLOW_PILL: Record<string, string> = {
  fundamental: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  flexible: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  wealth: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
};

const FLOW_LABELS: Record<string, string> = {
  fundamental: "Fundamental",
  flexible: "Flexible",
  wealth: "Wealth",
};

export function FlowTypeBadge({ type }: { type?: FlowType }) {
  if (!type) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        FLOW_PILL[type] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {FLOW_LABELS[type] ?? type}
    </span>
  );
}
