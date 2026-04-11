/**
 * Structured logger for Saldo backend.
 *
 * Outputs JSON lines so logs are machine-parseable in production.
 * Sensitive fields (tokens, raw payloads) must never be passed in.
 *
 * Epic 7 — Story 10
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    event: string;
    ts: string;
    [key: string]: unknown;
}

function emit(level: LogLevel, event: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
        level,
        event,
        ts: new Date().toISOString(),
        ...data,
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }
}

export const log = {
    info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
    warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
    error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};
