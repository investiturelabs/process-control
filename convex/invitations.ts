import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireOrgAdmin, requireOrgMember } from "./lib/auth";
import { sanitizeEmail } from "./lib/validators";
import { logChange } from "./changeLog";

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const list = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await requireOrgAdmin(ctx, orgId);

    const now = new Date().toISOString();
    const allInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();

    const validPending = allInvitations.filter(
      (inv) =>
        inv.status === "accepted" ||
        (inv.status === "pending" && (!inv.expiresAt || inv.expiresAt > now)),
    );
    return validPending;
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, { orgId, email, role }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    const cleanEmail = sanitizeEmail(email, "email");

    // Check if email is already a member of this org
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();
    if (existingUser) {
      const membership = await ctx.db
        .query("orgMembers")
        .withIndex("by_orgId_userId", (q) => q.eq("orgId", orgId).eq("userId", existingUser._id))
        .unique();
      if (membership) {
        throw new Error("This email is already a team member.");
      }
    }

    // Check existing invitations for this org
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_orgId_email", (q) => q.eq("orgId", orgId).eq("email", cleanEmail))
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
      email: cleanEmail,
      role,
      status: "pending",
      createdAt: now,
      expiresAt,
      orgId,
    });

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "invitation.create",
      entityType: "invitation",
      entityId: id,
      entityLabel: cleanEmail,
      details: JSON.stringify({ role }),
      orgId,
    });

    return id;
  },
});

export const remove = mutation({
  args: {
    orgId: v.id("organizations"),
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, { orgId, invitationId }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    const old = await ctx.db.get(invitationId);
    if (!old || old.orgId !== orgId) throw new Error("Invitation not found");
    await ctx.db.delete(invitationId);

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "invitation.remove",
      entityType: "invitation",
      entityId: invitationId,
      entityLabel: old?.email,
      orgId,
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

    const countByOrg = new Map<Id<"organizations">, number>();
    for (const inv of pending) {
      if (inv.expiresAt && inv.expiresAt <= now) {
        await ctx.db.delete(inv._id);
        countByOrg.set(inv.orgId, (countByOrg.get(inv.orgId) ?? 0) + 1);
      }
    }

    for (const [orgId, count] of countByOrg) {
      await logChange(ctx, {
        action: "invitation.expiredCleanup",
        entityType: "invitation",
        details: JSON.stringify({ count }),
        orgId,
      });
    }
  },
});
