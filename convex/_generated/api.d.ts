/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as allocationRules from "../allocationRules.js";
import type * as allocations from "../allocations.js";
import type * as categories from "../categories.js";
import type * as categoryGroups from "../categoryGroups.js";
import type * as categoryRules from "../categoryRules.js";
import type * as chatHistory from "../chatHistory.js";
import type * as chatTools from "../chatTools.js";
import type * as contributions from "../contributions.js";
import type * as crons from "../crons.js";
import type * as goals from "../goals.js";
import type * as importActions from "../importActions.js";
import type * as imports from "../imports.js";
import type * as incomePlans from "../incomePlans.js";
import type * as presets from "../presets.js";
import type * as reflections from "../reflections.js";
import type * as rulesEngine from "../rulesEngine.js";
import type * as telegram from "../telegram.js";
import type * as transactions from "../transactions.js";
import type * as transfers from "../transfers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  allocationRules: typeof allocationRules;
  allocations: typeof allocations;
  categories: typeof categories;
  categoryGroups: typeof categoryGroups;
  categoryRules: typeof categoryRules;
  chatHistory: typeof chatHistory;
  chatTools: typeof chatTools;
  contributions: typeof contributions;
  crons: typeof crons;
  goals: typeof goals;
  importActions: typeof importActions;
  imports: typeof imports;
  incomePlans: typeof incomePlans;
  presets: typeof presets;
  reflections: typeof reflections;
  rulesEngine: typeof rulesEngine;
  telegram: typeof telegram;
  transactions: typeof transactions;
  transfers: typeof transfers;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
