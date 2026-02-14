import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("auditSessions").collect();
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    departmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q;
    if (args.departmentId) {
      q = ctx.db
        .query("auditSessions")
        .withIndex("by_completed_departmentId", (q_) =>
          q_.eq("completed", true).eq("departmentId", args.departmentId!)
        );
    } else {
      q = ctx.db
        .query("auditSessions")
        .withIndex("by_completed_departmentId", (q_) =>
          q_.eq("completed", true)
        );
    }
    return await q.order("desc").paginate(args.paginationOpts);
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("auditSessions"),
    companyId: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    auditorId: v.optional(v.string()),
    auditorName: v.optional(v.string()),
    date: v.optional(v.string()),
    answers: v.optional(
      v.array(
        v.object({
          questionId: v.string(),
          value: v.union(
            v.literal("yes"),
            v.literal("no"),
            v.literal("partial"),
            v.null(),
          ),
          points: v.number(),
        }),
      ),
    ),
    totalPoints: v.optional(v.number()),
    maxPoints: v.optional(v.number()),
    percentage: v.optional(v.number()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionId, ...rest }) => {
    // Filter out undefined values
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(sessionId, patch);
  },
});

export const remove = mutation({
  args: {
    sessionId: v.id("auditSessions"),
  },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.delete(sessionId);
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
