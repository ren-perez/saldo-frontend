/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accounts from "../accounts.js";
import type * as allocationRules from "../allocationRules.js";
import type * as allocations from "../allocations.js";
import type * as categories from "../categories.js";
import type * as categoryGroups from "../categoryGroups.js";
import type * as contributions from "../contributions.js";
import type * as demo from "../demo.js";
import type * as goals from "../goals.js";
import type * as importActions from "../importActions.js";
import type * as imports from "../imports.js";
import type * as incomePlans from "../incomePlans.js";
import type * as presets from "../presets.js";
import type * as reflections from "../reflections.js";
import type * as transactions from "../transactions.js";
import type * as transfers from "../transfers.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  allocationRules: typeof allocationRules;
  allocations: typeof allocations;
  categories: typeof categories;
  categoryGroups: typeof categoryGroups;
  contributions: typeof contributions;
  demo: typeof demo;
  goals: typeof goals;
  importActions: typeof importActions;
  imports: typeof imports;
  incomePlans: typeof incomePlans;
  presets: typeof presets;
  reflections: typeof reflections;
  transactions: typeof transactions;
  transfers: typeof transfers;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
