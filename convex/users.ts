import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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

export const login = mutation({
  args: { name: v.string(), email: v.string() },
  handler: async (ctx, { name, email }) => {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      if (existing.active === false) {
        throw new Error("Account deactivated. Contact your administrator.");
      }
      return existing;
    }

    // Check for a valid pending invitation
    const now = new Date().toISOString();
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    const hasValidInvitation =
      invitation &&
      invitation.status === "pending" &&
      (!invitation.expiresAt || invitation.expiresAt > now);

    const allUsers = await ctx.db.query("users").collect();
    const isFirst = allUsers.length === 0;
    const role = isFirst ? "admin" : hasValidInvitation ? invitation.role : "user";

    const id = await ctx.db.insert("users", {
      name,
      email: normalizedEmail,
      role,
      avatarColor: AVATAR_COLORS[allUsers.length % AVATAR_COLORS.length],
    });

    // Mark invitation as accepted (atomic — same transaction)
    if (hasValidInvitation) {
      await ctx.db.patch(invitation._id, { status: "accepted" as const });
    }

    await logChange(ctx, {
      actorId: id,
      actorName: name,
      action: "user.created",
      entityType: "user",
      entityId: id,
      entityLabel: name,
      details: JSON.stringify({ email: normalizedEmail, role }),
    });

    return (await ctx.db.get(id))!;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, role, actorId, actorName }) => {
    const user = await ctx.db.get(userId);
    const oldRole = user?.role;
    await ctx.db.patch(userId, { role });

    await logChange(ctx, {
      actorId,
      actorName,
      action: "user.roleChange",
      entityType: "user",
      entityId: userId,
      entityLabel: user?.name,
      details: JSON.stringify({ from: oldRole, to: role }),
    });
  },
});

export const setActive = mutation({
  args: {
    userId: v.id("users"),
    active: v.boolean(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, active, actorId, actorName }) => {
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
      actorId,
      actorName,
      action: active ? "user.activate" : "user.deactivate",
      entityType: "user",
      entityId: userId,
      entityLabel: user.name,
    });
  },
});
