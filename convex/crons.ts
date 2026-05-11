import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Auto-close planned income plans on the 1st of each month (for the previous month)
crons.cron(
    "auto-close-income-plans",
    "5 0 1 * *",
    internal.incomePlans.autoCloseMonthPlansInternal,
    {}
);

export default crons;
