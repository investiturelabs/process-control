import { internalMutation } from "../_generated/server";

/**
 * One-time migration: backfill orgId on all existing data.
 *
 * Steps:
 * 1. Read the `companies` singleton → create an `organizations` row from it
 * 2. For each existing user → create an `orgMembers` row (using user's current role)
 * 3. For every row in every data table → patch with orgId
 * 4. Idempotent: skip rows that already have orgId
 *
 * Run via: npx convex run migrations/backfillOrgId:run
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stats = {
      orgCreated: false,
      orgMembersCreated: 0,
      departments: 0,
      questions: 0,
      auditSessions: 0,
      invitations: 0,
      savedAnswers: 0,
      reminders: 0,
      reminderCompletions: 0,
      changeLog: 0,
    };

    // 1. Check if an org already exists (idempotent)
    const existingOrg = await ctx.db.query("organizations").first();
    let orgId;

    if (existingOrg) {
      orgId = existingOrg._id;
    } else {
      // Read companies singleton (table removed from schema post-migration)
      // @ts-expect-error — companies table removed in Phase 6; migration already ran
      const company = await ctx.db.query("companies").first();
      const orgName = (company as any)?.name ?? "My Organization";
      const logoUrl = (company as any)?.logoUrl;

      // Need a user to be the creator — use the first admin, or first user
      const allUsers = await ctx.db.query("users").collect();
      const realUsers = allUsers.filter((u) => !u.tokenIdentifier.startsWith("test|"));
      // @ts-expect-error — role removed from users schema in Phase 6
      const creator = realUsers.find((u) => u.role === "admin") ?? realUsers[0];

      if (!creator) {
        // No users exist — nothing to migrate
        return { ...stats, message: "No users found, nothing to migrate" };
      }

      const now = new Date().toISOString();
      orgId = await ctx.db.insert("organizations", {
        name: orgName,
        logoUrl,
        createdBy: creator._id,
        createdAt: now,
      });
      stats.orgCreated = true;
    }

    // 2. Create orgMembers for all existing users (skip if already exists)
    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      const existingMembership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) =>
          q.eq("orgId", orgId).eq("userId", user._id),
        )
        .unique();

      if (!existingMembership) {
        await ctx.db.insert("orgMembers", {
          orgId,
          userId: user._id,
          // @ts-expect-error — role removed from users schema in Phase 6
          role: user.role ?? "user",
          joinedAt: new Date().toISOString(),
        });
        stats.orgMembersCreated++;
      }
    }

    // 3. Backfill orgId on all data tables
    const departments = await ctx.db.query("departments").collect();
    for (const row of departments) {
      if (!row.orgId) {
        await ctx.db.patch(row._id, { orgId });
        stats.departments++;
      }
    }

    const questions = await ctx.db.query("questions").collect();
    for (const row of questions) {
      if (!row.orgId) {
        await ctx.db.patch(row._id, { orgId });
        stats.questions++;
      }
    }

    const sessions = await ctx.db.query("auditSessions").collect();
    for (const row of sessions) {
      if (!row.orgId) {
        await ctx.db.patch(row._id, { orgId });
        stats.auditSessions++;
      }
    }

    const invitations = await ctx.db.query("invitations").collect();
    for (const row of invitations) {
      if (!row.orgId) {
        await ctx.db.patch(row._id, { orgId });
        stats.invitations++;
      }
    }

    const savedAnswers = await ctx.db.query("savedAnswers").collect();
    for (const row of savedAnswers) {
      if (!row.orgId) {
        await ctx.db.patch(row._id, { orgId });
        stats.savedAnswers++;
      }
    }

    const reminders = await ctx.db.query("reminders").collect();
    for (const row of reminders) {
      if (!row.orgId) {
        await ctx.db.patch(row._id, { orgId });
        stats.reminders++;
      }
    }

    const completions = await ctx.db.query("reminderCompletions").collect();
    for (const row of completions) {
      if (!row.orgId) {
        await ctx.db.patch(row._id, { orgId });
        stats.reminderCompletions++;
      }
    }

    const logs = await ctx.db.query("changeLog").collect();
    for (const row of logs) {
      if (!row.orgId) {
        await ctx.db.patch(row._id, { orgId });
        stats.changeLog++;
      }
    }

    return { ...stats, orgId, message: "Migration complete" };
  },
});
