import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMember } from "./lib/auth";
import { logChange } from "./changeLog";

export const list = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await requireOrgMember(ctx, orgId);
    return await ctx.db
      .query("savedAnswers")
      .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", orgId))
      .collect();
  },
});

export const listByDepartment = query({
  args: {
    orgId: v.id("organizations"),
    departmentId: v.string(),
  },
  handler: async (ctx, { orgId, departmentId }) => {
    await requireOrgMember(ctx, orgId);
    return await ctx.db
      .query("savedAnswers")
      .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", orgId).eq("departmentId", departmentId))
      .collect();
  },
});

export const save = mutation({
  args: {
    orgId: v.id("organizations"),
    questionId: v.string(),
    departmentId: v.string(),
    value: v.union(v.literal("yes"), v.literal("no"), v.literal("partial")),
    expiresAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrgMember(ctx, args.orgId);
    const now = new Date().toISOString();

    // Upsert: check if saved answer exists for this question in this org
    const existing = await ctx.db
      .query("savedAnswers")
      .withIndex("by_orgId_questionId", (q) => q.eq("orgId", args.orgId).eq("questionId", args.questionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        expiresAt: args.expiresAt,
        note: args.note,
        savedBy: user._id,
        savedByName: user.name,
        updatedAt: now,
      });

      await logChange(ctx, {
        actorId: user._id,
        actorName: user.name,
        action: "savedAnswer.update",
        entityType: "savedAnswer",
        entityId: existing._id,
        entityLabel: args.questionId,
        orgId: args.orgId,
      });
    } else {
      const id = await ctx.db.insert("savedAnswers", {
        questionId: args.questionId,
        departmentId: args.departmentId,
        value: args.value,
        expiresAt: args.expiresAt,
        note: args.note,
        savedBy: user._id,
        savedByName: user.name,
        createdAt: now,
        updatedAt: now,
        orgId: args.orgId,
      });

      await logChange(ctx, {
        actorId: user._id,
        actorName: user.name,
        action: "savedAnswer.create",
        entityType: "savedAnswer",
        entityId: id,
        entityLabel: args.questionId,
        orgId: args.orgId,
      });
    }
  },
});

export const update = mutation({
  args: {
    orgId: v.id("organizations"),
    savedAnswerId: v.id("savedAnswers"),
    value: v.optional(v.union(v.literal("yes"), v.literal("no"), v.literal("partial"))),
    expiresAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, savedAnswerId, ...fields }) => {
    const { user } = await requireOrgMember(ctx, orgId);
    const old = await ctx.db.get(savedAnswerId);
    if (!old || old.orgId !== orgId) throw new Error("Saved answer not found");

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (fields.value !== undefined) patch.value = fields.value;
    if (fields.expiresAt !== undefined) patch.expiresAt = fields.expiresAt;
    if (fields.note !== undefined) patch.note = fields.note;

    await ctx.db.patch(savedAnswerId, patch);

    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "savedAnswer.update",
      entityType: "savedAnswer",
      entityId: savedAnswerId,
      entityLabel: old.questionId,
      orgId,
    });
  },
});

export const remove = mutation({
  args: {
    orgId: v.id("organizations"),
    savedAnswerId: v.id("savedAnswers"),
  },
  handler: async (ctx, { orgId, savedAnswerId }) => {
    const { user } = await requireOrgMember(ctx, orgId);
    const old = await ctx.db.get(savedAnswerId);
    if (!old || old.orgId !== orgId) throw new Error("Saved answer not found");

    await ctx.db.delete(savedAnswerId);

    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "savedAnswer.remove",
      entityType: "savedAnswer",
      entityId: savedAnswerId,
      entityLabel: old.questionId,
      orgId,
    });
  },
});
