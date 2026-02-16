import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { logChange } from "./changeLog";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("savedAnswers").collect();
  },
});

export const listByDepartment = query({
  args: { departmentId: v.string() },
  handler: async (ctx, { departmentId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("savedAnswers")
      .withIndex("by_departmentId", (q) => q.eq("departmentId", departmentId))
      .collect();
  },
});

export const save = mutation({
  args: {
    questionId: v.string(),
    departmentId: v.string(),
    value: v.union(v.literal("yes"), v.literal("no"), v.literal("partial")),
    expiresAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const now = new Date().toISOString();

    // Upsert: check if saved answer exists for this question
    const existing = await ctx.db
      .query("savedAnswers")
      .withIndex("by_questionId", (q) => q.eq("questionId", args.questionId))
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
      });

      await logChange(ctx, {
        actorId: user._id,
        actorName: user.name,
        action: "savedAnswer.create",
        entityType: "savedAnswer",
        entityId: id,
        entityLabel: args.questionId,
      });
    }
  },
});

export const update = mutation({
  args: {
    savedAnswerId: v.id("savedAnswers"),
    value: v.optional(v.union(v.literal("yes"), v.literal("no"), v.literal("partial"))),
    expiresAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { savedAnswerId, ...fields }) => {
    const user = await requireAuth(ctx);
    const old = await ctx.db.get(savedAnswerId);
    if (!old) throw new Error("Saved answer not found");

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
    });
  },
});

export const remove = mutation({
  args: {
    savedAnswerId: v.id("savedAnswers"),
  },
  handler: async (ctx, { savedAnswerId }) => {
    const user = await requireAuth(ctx);
    const old = await ctx.db.get(savedAnswerId);
    if (!old) throw new Error("Saved answer not found");

    await ctx.db.delete(savedAnswerId);

    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "savedAnswer.remove",
      entityType: "savedAnswer",
      entityId: savedAnswerId,
      entityLabel: old.questionId,
    });
  },
});
