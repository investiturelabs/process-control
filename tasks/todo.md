# Multi-Tenant Organizations Implementation

## Completed

- [x] Phase 1: Schema + Auth Foundations
  - Added `organizations` and `orgMembers` tables
  - Added `orgId` (optional) to all data tables with compound indexes
  - Created `requireOrgMember` and `requireOrgAdmin` auth helpers

- [x] Phase 2: User Signup + Org Creation
  - Created `convex/organizations.ts` (get, update, listForUser)
  - Rewrote `users.getOrCreateFromClerk` to auto-create org on signup
  - Org-scoped user list and role management

- [x] Phase 3: Backfill Migration
  - Created `convex/migrations/backfillOrgId.ts` (idempotent)

- [x] Phase 4: Updated All Backend Queries/Mutations
  - departments, questions, sessions, invitations, savedAnswers, reminders, changeLog, seed, testData

- [x] Phase 5: Frontend Integration
  - Updated types.ts, store-types.ts, context.tsx
  - Updated all pages (Layout, Settings, Team, Questions, ActivityLog, History, Reminders)

- [x] Phase 6 (partial): Schema kept optional for migration safety
  - `orgId` stays optional until after production migration runs
  - `companies` table kept temporarily

- [x] Security Fixes (Code Review)
  - Fixed cross-org data leak in `sessions.listPaginated` (now uses `by_orgId_completed_departmentId`)
  - Fixed cross-org data leak in `changeLog.list` entityType branch (now uses `by_orgId_entityType_timestamp`)
  - Fixed cross-org data leak in `reminders.listByQuestion` and `listByDepartment` (now filter by orgId)
  - Added orgId ownership checks to: sessions.update, sessions.remove, questions.update, questions.remove, invitations.remove, savedAnswers.update, savedAnswers.remove, reminders.update, reminders.remove, reminders.complete

- [x] All 324 tests passing

## Remaining (Post-Migration)

- [ ] Run `backfillOrgId` migration on production database
- [ ] Phase 6 tighten: Make `orgId` required on all tables, remove `companies` table
- [ ] Remove old non-org indexes (by_stableId, by_departmentId, by_auditorId, etc.)
- [ ] Remove `role` field from `users` table (role now lives in `orgMembers`)
- [ ] Delete `convex/companies.ts`
- [ ] Address `users.setActive` global mutation issue (deactivating affects all orgs)
