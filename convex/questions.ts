import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { logChange } from "./changeLog";

export const add = mutation({
  args: {
    departmentId: v.string(),
    riskCategory: v.string(),
    text: v.string(),
    criteria: v.string(),
    answerType: v.union(
      v.literal("yes_no"),
      v.literal("yes_no_partial"),
    ),
    pointsYes: v.number(),
    pointsPartial: v.number(),
    pointsNo: v.number(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actorId, actorName, ...questionFields } = args;

    // Find the max sortOrder for this department's questions
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_departmentId", (q) => q.eq("departmentId", args.departmentId))
      .collect();
    const maxSort = existing.reduce((max, q) => Math.max(max, q.sortOrder), -1);

    const id = await ctx.db.insert("questions", {
      ...questionFields,
      sortOrder: maxSort + 1,
    });

    await logChange(ctx, {
      actorId,
      actorName,
      action: "question.add",
      entityType: "question",
      entityId: id,
      entityLabel: args.text,
      details: JSON.stringify({ departmentId: args.departmentId }),
    });

    return id;
  },
});

export const update = mutation({
  args: {
    questionId: v.id("questions"),
    riskCategory: v.string(),
    text: v.string(),
    criteria: v.string(),
    answerType: v.union(
      v.literal("yes_no"),
      v.literal("yes_no_partial"),
    ),
    pointsYes: v.number(),
    pointsPartial: v.number(),
    pointsNo: v.number(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { questionId, actorId, actorName, ...fields }) => {
    const old = await ctx.db.get(questionId);
    await ctx.db.patch(questionId, fields);

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (old) {
      for (const [key, value] of Object.entries(fields)) {
        const oldVal = (old as Record<string, unknown>)[key];
        if (oldVal !== value) {
          changes[key] = { from: oldVal, to: value };
        }
      }
    }

    await logChange(ctx, {
      actorId,
      actorName,
      action: "question.update",
      entityType: "question",
      entityId: questionId,
      entityLabel: old?.text ?? fields.text,
      details: JSON.stringify(changes),
    });
  },
});

export const remove = mutation({
  args: {
    questionId: v.id("questions"),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { questionId, actorId, actorName }) => {
    const old = await ctx.db.get(questionId);
    await ctx.db.delete(questionId);

    await logChange(ctx, {
      actorId,
      actorName,
      action: "question.remove",
      entityType: "question",
      entityId: questionId,
      entityLabel: old?.text,
      details: old ? JSON.stringify({ departmentId: old.departmentId }) : undefined,
    });
  },
});
