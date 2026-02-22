# Lessons Learned

## Multi-Tenant Security

### Always check document ownership on ID-based fetches
When a mutation accepts a document ID (e.g., `reminderId: v.id("reminders")`), the handler MUST verify `doc.orgId === orgId` after fetching. Otherwise a user from Org A can manipulate documents belonging to Org B by guessing/knowing the document ID.

**Pattern:**
```typescript
const doc = await ctx.db.get(docId);
if (!doc || doc.orgId !== orgId) throw new Error("Not found");
```

### Always use org-scoped indexes for list queries
Non-org-scoped indexes (e.g., `by_departmentId`) return data across ALL orgs. Every query that returns data to a user must filter by orgId, preferably via a compound index.

**Wrong:** `.withIndex("by_departmentId", q => q.eq("departmentId", id))`
**Right:** `.withIndex("by_orgId", q => q.eq("orgId", orgId)).filter(...)` or use a compound index like `by_orgId_departmentId`

### Test mocks must include org fields
When adding `orgId` and `orgRole` to the store, ALL test mocks that call `setStore()` must include these new fields. Missing them causes tests to fail silently or with unclear errors.

## Convex-Specific

### Keep schema fields optional during migration
Making `orgId` required before running the backfill migration would cause Convex to reject existing rows. Keep fields optional until after the migration runs, then tighten.

### Compound indexes must have fields in order
Convex compound indexes like `by_orgId_completed_departmentId: ["orgId", "completed", "departmentId"]` must be queried with `eq` on each prefix field in order. You can't skip `completed` and filter only by `orgId` + `departmentId`.
