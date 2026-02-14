import { mutation } from "./_generated/server";
import { v } from "convex/values";

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
    // Find the max sortOrder for this department's questions
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_departmentId", (q) => q.eq("departmentId", args.departmentId))
      .collect();
    const maxSort = existing.reduce((max, q) => Math.max(max, q.sortOrder), -1);

    return await ctx.db.insert("questions", {
      ...args,
      sortOrder: maxSort + 1,
    });
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
    await ctx.db.patch(questionId, fields);
  },
});

export const remove = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, { questionId }) => {
    await ctx.db.delete(questionId);
  },
});
