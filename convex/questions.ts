import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { sanitize, validatePoints, MAX_LENGTHS } from "./lib/validators";
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
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const cleanText = sanitize(args.text, "question text", MAX_LENGTHS.text);
    const cleanCriteria = sanitize(args.criteria, "criteria", MAX_LENGTHS.criteria);
    const cleanRiskCategory = sanitize(args.riskCategory, "risk category", MAX_LENGTHS.riskCategory);
    validatePoints(args.pointsYes, args.pointsPartial, args.pointsNo);

    // Verify department exists
    const dept = await ctx.db
      .query("departments")
      .withIndex("by_stableId", (q) => q.eq("stableId", args.departmentId))
      .unique();
    if (!dept) throw new Error("Department not found");

    // Find the max sortOrder for this department's questions
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_departmentId", (q) => q.eq("departmentId", args.departmentId))
      .collect();
    const maxSort = existing.reduce((max, q) => Math.max(max, q.sortOrder), -1);

    const id = await ctx.db.insert("questions", {
      departmentId: args.departmentId,
      riskCategory: cleanRiskCategory,
      text: cleanText,
      criteria: cleanCriteria,
      answerType: args.answerType,
      pointsYes: args.pointsYes,
      pointsPartial: args.pointsPartial,
      pointsNo: args.pointsNo,
      sortOrder: maxSort + 1,
    });

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "question.add",
      entityType: "question",
      entityId: id,
      entityLabel: cleanText,
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
  },
  handler: async (ctx, { questionId, ...fields }) => {
    const admin = await requireAdmin(ctx);

    const cleanText = sanitize(fields.text, "question text", MAX_LENGTHS.text);
    const cleanCriteria = sanitize(fields.criteria, "criteria", MAX_LENGTHS.criteria);
    const cleanRiskCategory = sanitize(fields.riskCategory, "risk category", MAX_LENGTHS.riskCategory);
    validatePoints(fields.pointsYes, fields.pointsPartial, fields.pointsNo);

    const old = await ctx.db.get(questionId);

    // Explicit patch — no spread
    const patch = {
      riskCategory: cleanRiskCategory,
      text: cleanText,
      criteria: cleanCriteria,
      answerType: fields.answerType,
      pointsYes: fields.pointsYes,
      pointsPartial: fields.pointsPartial,
      pointsNo: fields.pointsNo,
    };
    await ctx.db.patch(questionId, patch);

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (old) {
      for (const [key, value] of Object.entries(patch)) {
        const oldVal = (old as Record<string, unknown>)[key];
        if (oldVal !== value) {
          changes[key] = { from: oldVal, to: value };
        }
      }
    }

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "question.update",
      entityType: "question",
      entityId: questionId,
      entityLabel: old?.text ?? cleanText,
      details: JSON.stringify(changes),
    });
  },
});

export const remove = mutation({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, { questionId }) => {
    const admin = await requireAdmin(ctx);

    const old = await ctx.db.get(questionId);
    await ctx.db.delete(questionId);

    // Cascade: delete any saved answer for this question
    const savedAnswer = await ctx.db
      .query("savedAnswers")
      .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
      .first();
    if (savedAnswer) {
      await ctx.db.delete(savedAnswer._id);
    }

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "question.remove",
      entityType: "question",
      entityId: questionId,
      entityLabel: old?.text,
      details: old ? JSON.stringify({ departmentId: old.departmentId }) : undefined,
    });
  },
});
