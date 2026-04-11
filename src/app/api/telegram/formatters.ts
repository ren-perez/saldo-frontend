// src/app/api/telegram/formatters.ts
// Pure formatting utilities for Telegram bot replies.
// No emojis — plain text only. Use text prefixes/separators for clarity.
// Epic 8 — Stories 1, 2, 3, 9, 11

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(Math.abs(amount));
}

export function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

/**
 * Single transaction line for /recent list.
 * Format: `Apr 9  [-] $12.45  Starbucks`
 * Sign indicator: [-] expense, [+] income
 */
export function formatTransactionLine(tx: {
    date: number;
    amount: number;
    description: string;
}): string {
    const sign = tx.amount >= 0 ? "[+]" : "[-]";
    const date = formatDate(tx.date).padEnd(6);
    return `${date}  ${sign} ${formatCurrency(tx.amount)}  ${tx.description}`;
}

/**
 * Full /recent block with header.
 * Returns a ready-to-send string.
 */
export function formatRecentList(txs: Array<{ date: number; amount: number; description: string }>): string {
    if (txs.length === 0) return "No transactions found.";
    const lines = txs.map(formatTransactionLine);
    return `Last ${txs.length} transaction${txs.length === 1 ? "" : "s"}:\n\n${lines.join("\n")}`;
}

/**
 * Confirmation reply after a write action.
 * Story 2: always includes amount + description.
 */
export function formatWriteConfirmation(
    type: "expense" | "income",
    amount: number,   // always positive — we add the sign
    description: string,
    extra?: string    // optional second line (e.g. category name)
): string {
    const prefix = type === "expense" ? "Expense logged" : "Income logged";
    const sign = type === "expense" ? "-" : "+";
    const line1 = `${prefix}: ${sign}${formatCurrency(amount)}  ${description}`;
    return extra ? `${line1}\n${extra}` : line1;
}

/**
 * Monthly summary block for /summary.
 * Story 8.
 */
export function formatSummary(data: {
    month: string;
    totalIncome: number;
    totalExpenses: number;
    net: number;
    transactionCount: number;
    topCategory: { name: string; amount: number } | null;
}): string {
    const { month, totalIncome, totalExpenses, net, transactionCount, topCategory } = data;
    const netLabel = net >= 0 ? `+${formatCurrency(net)}` : `-${formatCurrency(Math.abs(net))}`;

    const lines = [
        `${month} summary (${transactionCount} transaction${transactionCount === 1 ? "" : "s"})`,
        "",
        `Income:    ${formatCurrency(totalIncome)}`,
        `Expenses:  ${formatCurrency(totalExpenses)}`,
        `Net:       ${netLabel}`,
    ];

    if (topCategory) {
        lines.push("", `Top category: ${topCategory.name} (${formatCurrency(topCategory.amount)})`);
    }

    return lines.join("\n");
}

/**
 * Quick-reply hint — appended subtly after some responses.
 * Story 10.
 */
export function formatHint(hint: string): string {
    return `\n(${hint})`;
}
