/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as changeLog from "../changeLog.js";
import type * as crons from "../crons.js";
import type * as departments from "../departments.js";
import type * as invitations from "../invitations.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_reminderUtils from "../lib/reminderUtils.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migrations_backfillOrgId from "../migrations/backfillOrgId.js";
import type * as migrations_stripUserRole from "../migrations/stripUserRole.js";
import type * as organizations from "../organizations.js";
import type * as questions from "../questions.js";
import type * as reminders from "../reminders.js";
import type * as savedAnswers from "../savedAnswers.js";
import type * as seed from "../seed.js";
import type * as sessions from "../sessions.js";
import type * as testData from "../testData.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  changeLog: typeof changeLog;
  crons: typeof crons;
  departments: typeof departments;
  invitations: typeof invitations;
  "lib/auth": typeof lib_auth;
  "lib/reminderUtils": typeof lib_reminderUtils;
  "lib/validators": typeof lib_validators;
  "migrations/backfillOrgId": typeof migrations_backfillOrgId;
  "migrations/stripUserRole": typeof migrations_stripUserRole;
  organizations: typeof organizations;
  questions: typeof questions;
  reminders: typeof reminders;
  savedAnswers: typeof savedAnswers;
  seed: typeof seed;
  sessions: typeof sessions;
  testData: typeof testData;
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
