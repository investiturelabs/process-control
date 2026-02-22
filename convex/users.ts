import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireOrgAdmin, requireOrgMember } from "./lib/auth";
import { logChange } from "./changeLog";

const AVATAR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

/**
 * Returns the current authenticated user's Convex record.
 * Called by the frontend to get user info after Clerk sign-in.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

/**
 * Creates or retrieves a Convex user after Clerk authentication.
 * New flow with org support:
 * 1. Return existing user if already linked by tokenIdentifier
 * 2. Check for pending invitation (org-scoped):
 *    - Found: Create user, join existing org with invited role
 *    - Not found: Create user, create new org, user becomes org admin
 * 3. Return { user, orgId } so frontend knows which org to load
 */
export const getOrCreateFromClerk = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: not authenticated");
    }

    // Check if user already exists by tokenIdentifier
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      if (existing.active === false) {
        throw new Error("Account deactivated. Contact your administrator.");
      }

      // Find their first org membership for the return value
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_userId", (q) => q.eq("userId", existing._id))
        .first();

      return { ...existing, orgId: membership?.orgId ?? null };
    }

    const allUsers = await ctx.db.query("users").collect();
    const realUsers = allUsers.filter(u => !u.tokenIdentifier.startsWith("test|"));
    const isFirst = realUsers.length === 0;

    const email = (identity.email ?? "").toLowerCase();

    // Check for pending invitation (org-scoped)
    const now = new Date().toISOString();
    let matchedInvitation = null;
    if (!isFirst && email) {
      const allPending = await ctx.db
        .query("invitations")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect();
      matchedInvitation = allPending.find(inv => inv.email === email) ?? null;

      const hasValidInvitation =
        matchedInvitation &&
        (!matchedInvitation.expiresAt || matchedInvitation.expiresAt > now);

      if (!hasValidInvitation) {
        matchedInvitation = null;
      }
    }

    // Create the user
    const name = identity.name ?? identity.email ?? "User";
    const userId = await ctx.db.insert("users", {
      name,
      email,
      avatarColor: AVATAR_COLORS[allUsers.length % AVATAR_COLORS.length],
      tokenIdentifier: identity.tokenIdentifier,
    });

    let orgId;
    let orgRole: "admin" | "user";

    if (matchedInvitation && matchedInvitation.orgId) {
      // Invited user: join the inviting org
      orgId = matchedInvitation.orgId;
      orgRole = matchedInvitation.role;
      await ctx.db.insert("orgMembers", {
        orgId,
        userId,
        role: orgRole,
        joinedAt: now,
      });

      // Mark invitation as accepted
      await ctx.db.patch(matchedInvitation._id, { status: "accepted" as const });
    } else {
      // New user (with or without legacy invitation): create org and become admin
      if (matchedInvitation) {
        await ctx.db.patch(matchedInvitation._id, { status: "accepted" as const });
      }

      orgId = await ctx.db.insert("organizations", {
        name: "My Organization",
        createdBy: userId,
        createdAt: now,
      });

      orgRole = "admin";
      await ctx.db.insert("orgMembers", {
        orgId,
        userId,
        role: orgRole,
        joinedAt: now,
      });
    }

    await logChange(ctx, {
      actorId: userId,
      actorName: name,
      action: "user.created",
      entityType: "user",
      entityId: userId,
      entityLabel: name,
      details: JSON.stringify({ email, orgRole }),
      orgId,
    });

    const user = (await ctx.db.get(userId))!;
    return { ...user, orgId, role: orgRole };
  },
});

/**
 * List users who are members of a given org.
 */
export const list = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await requireOrgMember(ctx, orgId);

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();

    const users = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        if (!user) return null;
        // Strip tokenIdentifier, use org-level role
        const { tokenIdentifier, ...rest } = user;
        return { ...rest, role: m.role };
      }),
    );

    return users.filter(Boolean);
  },
});

/**
 * Update a user's role within an org. Org admin only. Prevents self-demotion.
 */
export const updateRole = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, { orgId, userId, role }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    if (admin._id === userId && role !== "admin") {
      throw new Error("Cannot demote yourself");
    }

    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");

    // Find the target's membership in this org
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId_userId", (q) => q.eq("orgId", orgId).eq("userId", userId))
      .unique();
    if (!membership) throw new Error("User is not a member of this organization");

    const oldRole = membership.role;

    // Prevent demoting the last admin
    if (oldRole === "admin" && role !== "admin") {
      const allMembers = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
        .collect();
      const adminCount = allMembers.filter((m) => m.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error("Cannot demote the last admin");
      }
    }

    await ctx.db.patch(membership._id, { role });

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "user.roleChange",
      entityType: "user",
      entityId: userId,
      entityLabel: target.name,
      details: JSON.stringify({ from: oldRole, to: role }),
      orgId,
    });
  },
});

/**
 * Activate or deactivate a user. Org admin only.
 */
export const setActive = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    active: v.boolean(),
  },
  handler: async (ctx, { orgId, userId, active }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Check membership
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId_userId", (q) => q.eq("orgId", orgId).eq("userId", userId))
      .unique();
    if (!membership) throw new Error("User is not a member of this organization");

    if (!active && membership.role === "admin") {
      const allMembers = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
        .collect();
      const activeAdminMembers = await Promise.all(
        allMembers
          .filter((m) => m.role === "admin" && m.userId !== userId)
          .map(async (m) => {
            const u = await ctx.db.get(m.userId);
            return u && u.active !== false ? u : null;
          }),
      );
      if (activeAdminMembers.filter(Boolean).length === 0) {
        throw new Error("Cannot deactivate the last admin");
      }
    }

    await ctx.db.patch(userId, { active });

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: active ? "user.activate" : "user.deactivate",
      entityType: "user",
      entityId: userId,
      entityLabel: user.name,
      orgId,
    });
  },
});
