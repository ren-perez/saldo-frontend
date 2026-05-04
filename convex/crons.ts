// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs at 03:00 UTC daily — marks import sessions stuck in "awaiting_review"
// for over 48 hours as "abandoned" so they stop appearing as active reviews.
crons.daily(
    "clean stale import sessions",
    { hourUTC: 3, minuteUTC: 0 },
    internal.imports.cleanStaleImportSessions,
);

export default crons;
