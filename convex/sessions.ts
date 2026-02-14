import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("auditSessions").collect();
  },
});

export const save = mutation({
  args: {
    companyId: v.string(),
    departmentId: v.string(),
    auditorId: v.string(),
    auditorName: v.string(),
    date: v.string(),
    answers: v.array(
      v.object({
        questionId: v.string(),
        value: v.union(
          v.literal("yes"),
          v.literal("no"),
          v.literal("partial"),
          v.literal("na"),
          v.null(),
        ),
        points: v.number(),
      }),
    ),
    totalPoints: v.number(),
    maxPoints: v.number(),
    percentage: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditSessions", args);
  },
});
