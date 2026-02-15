import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { logChange } from "./changeLog";

const answerValidator = v.object({
  questionId: v.string(),
  value: v.union(
    v.literal("yes"),
    v.literal("no"),
    v.literal("partial"),
    v.null(),
  ),
  points: v.number(),
  questionText: v.optional(v.string()),
  questionCriteria: v.optional(v.string()),
  questionRiskCategory: v.optional(v.string()),
  questionAnswerType: v.optional(v.union(v.literal("yes_no"), v.literal("yes_no_partial"))),
  questionPointsYes: v.optional(v.number()),
  questionPointsPartial: v.optional(v.number()),
  questionPointsNo: v.optional(v.number()),
});

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
    answers: v.optional(v.array(answerValidator)),
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

    // PCT-20: Inject question snapshots when completing
    if (rest.completed === true && rest.answers) {
      const existing = await ctx.db.get(sessionId);
      if (!existing) throw new Error("Session not found");

      const questions = await ctx.db
        .query("questions")
        .withIndex("by_departmentId", (q) => q.eq("departmentId", existing.departmentId))
        .collect();
      const qMap = new Map(questions.map((q) => [q._id as string, q]));

      patch.answers = rest.answers.map((a) => {
        const q = qMap.get(a.questionId);
        if (!q) return a;
        return {
          ...a,
          questionText: q.text,
          questionCriteria: q.criteria,
          questionRiskCategory: q.riskCategory,
          questionAnswerType: q.answerType,
          questionPointsYes: q.pointsYes,
          questionPointsPartial: q.pointsPartial,
          questionPointsNo: q.pointsNo,
        };
      });

      await logChange(ctx, {
        actorId: existing.auditorId,
        actorName: existing.auditorName,
        action: "session.complete",
        entityType: "session",
        entityId: sessionId,
        entityLabel: existing.departmentId,
      });
    }

    await ctx.db.patch(sessionId, patch);
  },
});

export const remove = mutation({
  args: {
    sessionId: v.id("auditSessions"),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, actorId, actorName }) => {
    const existing = await ctx.db.get(sessionId);
    await ctx.db.delete(sessionId);
    await logChange(ctx, {
      actorId,
      actorName,
      action: "session.remove",
      entityType: "session",
      entityId: sessionId,
      entityLabel: existing?.departmentId,
    });
  },
});

export const save = mutation({
  args: {
    companyId: v.string(),
    departmentId: v.string(),
    auditorId: v.string(),
    auditorName: v.string(),
    date: v.string(),
    answers: v.array(answerValidator),
    totalPoints: v.number(),
    maxPoints: v.number(),
    percentage: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    let answers = args.answers;

    // PCT-20: Inject question snapshots when completing
    if (args.completed) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_departmentId", (q) => q.eq("departmentId", args.departmentId))
        .collect();
      const qMap = new Map(questions.map((q) => [q._id as string, q]));

      answers = args.answers.map((a) => {
        const q = qMap.get(a.questionId);
        if (!q) return a;
        return {
          ...a,
          questionText: q.text,
          questionCriteria: q.criteria,
          questionRiskCategory: q.riskCategory,
          questionAnswerType: q.answerType,
          questionPointsYes: q.pointsYes,
          questionPointsPartial: q.pointsPartial,
          questionPointsNo: q.pointsNo,
        };
      });
    }

    const id = await ctx.db.insert("auditSessions", { ...args, answers });

    if (args.completed) {
      await logChange(ctx, {
        actorId: args.auditorId,
        actorName: args.auditorName,
        action: "session.complete",
        entityType: "session",
        entityId: id,
        entityLabel: args.departmentId,
      });
    }

    return id;
  },
});
