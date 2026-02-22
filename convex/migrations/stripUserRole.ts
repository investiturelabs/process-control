import { internalMutation } from "../_generated/server";

/**
 * One-time migration: remove the legacy `role` field from all user documents.
 * Role now lives on `orgMembers` rows.
 *
 * Run via: npx convex run migrations/stripUserRole:run
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let stripped = 0;

    for (const user of users) {
      // @ts-expect-error — role removed from users schema in Phase 6
      if (user.role !== undefined) {
        const { role: _, ...rest } = user as any;
        await ctx.db.replace(user._id, rest);
        stripped++;
      }
    }

    return { stripped, total: users.length };
  },
});
