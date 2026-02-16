import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin } from "./lib/auth";
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
 * Uses the JWT identity (server-verified, unspoofable) to:
 * - Return existing user if already linked by tokenIdentifier
 * - Create new user: first user = admin, checks pending invitations for role
 * - Marks matched invitation as "accepted"
 *
 * Convex OCC (serializable transactions) prevents two simultaneous first-users —
 * if two sign up at the same time, one transaction will retry and see the other's user.
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
      return existing;
    }

    // Determine role: first user = admin, invited users get invited role, otherwise "user"
    const allUsers = await ctx.db.query("users").collect();
    const isFirst = allUsers.length === 0;

    const email = (identity.email ?? "").toLowerCase();
    let role: "admin" | "user" = isFirst ? "admin" : "user";

    // Check for pending invitation
    const now = new Date().toISOString();
    let matchedInvitation = null;
    if (!isFirst && email) {
      matchedInvitation = await ctx.db
        .query("invitations")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      const hasValidInvitation =
        matchedInvitation &&
        matchedInvitation.status === "pending" &&
        (!matchedInvitation.expiresAt || matchedInvitation.expiresAt > now);

      if (hasValidInvitation) {
        role = matchedInvitation!.role;
      } else {
        matchedInvitation = null;
      }
    }

    // Create the user
    const name = identity.name ?? identity.email ?? "User";
    const id = await ctx.db.insert("users", {
      name,
      email,
      role,
      avatarColor: AVATAR_COLORS[allUsers.length % AVATAR_COLORS.length],
      tokenIdentifier: identity.tokenIdentifier,
    });

    // Mark invitation as accepted
    if (matchedInvitation && matchedInvitation.status === "pending") {
      await ctx.db.patch(matchedInvitation._id, { status: "accepted" as const });
    }

    await logChange(ctx, {
      actorId: id,
      actorName: name,
      action: "user.created",
      entityType: "user",
      entityId: id,
      entityLabel: name,
      details: JSON.stringify({ email, role }),
    });

    return (await ctx.db.get(id))!;
  },
});

/**
 * List all users. Requires authentication.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const users = await ctx.db.query("users").collect();
    // Strip tokenIdentifier — internal Clerk binding key, not for client exposure
    return users.map(({ tokenIdentifier, ...rest }) => rest);
  },
});

/**
 * Update a user's role. Admin only. Prevents self-demotion.
 */
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, { userId, role }) => {
    const admin = await requireAdmin(ctx);

    if (admin._id === userId && role !== "admin") {
      throw new Error("Cannot demote yourself");
    }

    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");

    // Prevent demoting the last admin — would create an unrecoverable zero-admin state
    if (target.role === "admin" && role !== "admin") {
      const allUsers = await ctx.db.query("users").collect();
      const adminCount = allUsers.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error("Cannot demote the last admin");
      }
    }

    const oldRole = target.role;
    await ctx.db.patch(userId, { role });

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "user.roleChange",
      entityType: "user",
      entityId: userId,
      entityLabel: target.name,
      details: JSON.stringify({ from: oldRole, to: role }),
    });
  },
});

/**
 * Activate or deactivate a user. Admin only.
 */
export const setActive = mutation({
  args: {
    userId: v.id("users"),
    active: v.boolean(),
  },
  handler: async (ctx, { userId, active }) => {
    const admin = await requireAdmin(ctx);

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (!active && user.role === "admin") {
      const activeAdmins = (await ctx.db.query("users").collect())
        .filter((u) => u.role === "admin" && u.active !== false && u._id !== userId);
      if (activeAdmins.length === 0) {
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
    });
  },
});
