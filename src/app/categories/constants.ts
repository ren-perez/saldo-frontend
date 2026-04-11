export const GROUP_COLORS = [
  {
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700/50",
    trigger: "hover:bg-slate-200/70 dark:hover:bg-slate-800/80",
    badge: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-100 dark:border-blue-900/50",
    trigger: "hover:bg-blue-100/70 dark:hover:bg-blue-900/50",
    badge: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300",
    dot: "bg-blue-400",
  },
  {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-100 dark:border-emerald-900/50",
    trigger: "hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50",
    badge: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-100 dark:border-violet-900/50",
    trigger: "hover:bg-violet-100/70 dark:hover:bg-violet-900/50",
    badge: "bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-400",
  },
  {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-100 dark:border-amber-900/50",
    trigger: "hover:bg-amber-100/70 dark:hover:bg-amber-900/50",
    badge: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-100 dark:border-rose-900/50",
    trigger: "hover:bg-rose-100/70 dark:hover:bg-rose-900/50",
    badge: "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-400",
  },
];

export const ungroupedColor = {
  bg: "bg-muted/40",
  border: "border-muted",
  trigger: "hover:bg-muted/60",
  badge: "bg-muted text-muted-foreground",
  dot: "bg-muted-foreground/40",
};

export const getGroupColor = (index: number) =>
  GROUP_COLORS[index % GROUP_COLORS.length];

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

export const TRANSACTION_TYPE_PILL: Record<string, string> = {
  income:
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  expense:
    "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  transfer:
    "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
};
