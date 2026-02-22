import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMember, requireOrgAdmin } from "./lib/auth";
import { sanitize, validateUrl, MAX_LENGTHS } from "./lib/validators";
import { logChange } from "./changeLog";

/**
 * Get an organization by ID. Requires org membership.
 */
export const get = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await requireOrgMember(ctx, orgId);
    return await ctx.db.get(orgId);
  },
});

/**
 * Update organization name/logo. Requires org admin.
 */
export const update = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, name, logoUrl }) => {
    const { user } = await requireOrgAdmin(ctx, orgId);

    const cleanName = sanitize(name, "organization name", MAX_LENGTHS.name);
    validateUrl(logoUrl, "logo URL");

    const org = await ctx.db.get(orgId);
    const oldName = org?.name;
    await ctx.db.patch(orgId, { name: cleanName, logoUrl });

    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "organization.update",
      entityType: "organization",
      entityId: orgId,
      entityLabel: cleanName,
      details: oldName ? JSON.stringify({ from: oldName, to: cleanName }) : undefined,
      orgId,
    });
  },
});

/**
 * List all organizations the current user belongs to.
 */
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        if (!org) return null;
        return { ...org, role: m.role };
      }),
    );

    return orgs.filter(Boolean);
  },
});
