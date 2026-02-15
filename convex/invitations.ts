import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { logChange } from "./changeLog";

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const all = await ctx.db
      .query("invitations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return all.filter((inv) => !inv.expiresAt || inv.expiresAt > now);
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { email, role, actorId, actorName }) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already a registered user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (existingUser) {
      throw new Error("This email is already a team member.");
    }

    // Check existing invitations
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    for (const inv of existing) {
      if (inv.status === "accepted") {
        throw new Error("This email is already a team member.");
      }
      if (inv.status === "pending") {
        const isExpired = inv.expiresAt && inv.expiresAt <= now;
        if (isExpired) {
          // Delete expired invitation so we can re-create
          await ctx.db.delete(inv._id);
        } else {
          throw new Error("An invitation is already pending for this email.");
        }
      }
    }

    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
    const id = await ctx.db.insert("invitations", {
      email: normalizedEmail,
      role,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    await logChange(ctx, {
      actorId,
      actorName,
      action: "invitation.create",
      entityType: "invitation",
      entityId: id,
      entityLabel: normalizedEmail,
      details: JSON.stringify({ role }),
    });

    return id;
  },
});

export const remove = mutation({
  args: {
    invitationId: v.id("invitations"),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { invitationId, actorId, actorName }) => {
    const old = await ctx.db.get(invitationId);
    await ctx.db.delete(invitationId);

    await logChange(ctx, {
      actorId,
      actorName,
      action: "invitation.remove",
      entityType: "invitation",
      entityId: invitationId,
      entityLabel: old?.email,
    });
  },
});

export const deleteExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const pending = await ctx.db
      .query("invitations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    let count = 0;
    for (const inv of pending) {
      if (inv.expiresAt && inv.expiresAt <= now) {
        await ctx.db.delete(inv._id);
        count++;
      }
    }

    if (count > 0) {
      await logChange(ctx, {
        action: "invitation.expiredCleanup",
        entityType: "invitation",
        details: JSON.stringify({ count }),
      });
    }
  },
});
