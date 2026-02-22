import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { requireOrgMember } from "./lib/auth";
import { logChange } from "./changeLog";

/** Validates session fields shared by save and update. */
function validateSessionFields(fields: {
  date?: string;
  percentage?: number;
  totalPoints?: number;
  maxPoints?: number;
}) {
  if (fields.date !== undefined && fields.date.trim().length === 0) {
    throw new Error("date cannot be empty");
  }
  if (fields.percentage !== undefined && (fields.percentage < 0 || fields.percentage > 100)) {
    throw new Error("percentage must be between 0 and 100");
  }
  if (fields.totalPoints !== undefined && fields.totalPoints < 0) {
    throw new Error("totalPoints must be non-negative");
  }
  if (fields.maxPoints !== undefined && fields.maxPoints < 0) {
    throw new Error("maxPoints must be non-negative");
  }
}

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
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const { user, membership } = await requireOrgMember(ctx, orgId);

    // Admins see all sessions in the org; regular users see only their own
    if (membership.role === "admin") {
      return await ctx.db
        .query("auditSessions")
        .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
        .collect();
    }
    return await ctx.db
      .query("auditSessions")
      .withIndex("by_orgId_auditorId", (q) => q.eq("orgId", orgId).eq("auditorId", user._id))
      .collect();
  },
});

export const listPaginated = query({
  args: {
    orgId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    departmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId);

    let q;
    if (args.departmentId) {
      q = ctx.db
        .query("auditSessions")
        .withIndex("by_orgId_completed_departmentId", (q_) =>
          q_.eq("orgId", args.orgId).eq("completed", true).eq("departmentId", args.departmentId!)
        );
    } else {
      q = ctx.db
        .query("auditSessions")
        .withIndex("by_orgId_completed_departmentId", (q_) =>
          q_.eq("orgId", args.orgId).eq("completed", true)
        );
    }
    return await q.order("desc").paginate(args.paginationOpts);
  },
});

export const update = mutation({
  args: {
    orgId: v.id("organizations"),
    sessionId: v.id("auditSessions"),
    companyId: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    date: v.optional(v.string()),
    answers: v.optional(v.array(answerValidator)),
    totalPoints: v.optional(v.number()),
    maxPoints: v.optional(v.number()),
    percentage: v.optional(v.number()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user, membership } = await requireOrgMember(ctx, args.orgId);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.orgId !== args.orgId) throw new Error("Session not found");

    // Only the auditor who created it or an admin can update
    if (session.auditorId !== user._id && membership.role !== "admin") {
      throw new Error("Forbidden: you can only update your own sessions");
    }

    validateSessionFields(args);

    // Explicit allowlist — auditorId/auditorName are never client-patchable
    const patch: Record<string, unknown> = {};
    if (args.companyId !== undefined) patch.companyId = args.companyId;
    if (args.departmentId !== undefined) patch.departmentId = args.departmentId;
    if (args.date !== undefined) patch.date = args.date;
    if (args.answers !== undefined) patch.answers = args.answers;
    if (args.totalPoints !== undefined) patch.totalPoints = args.totalPoints;
    if (args.maxPoints !== undefined) patch.maxPoints = args.maxPoints;
    if (args.percentage !== undefined) patch.percentage = args.percentage;
    if (args.completed !== undefined) patch.completed = args.completed;

    // PCT-20: Inject question snapshots when completing
    if (args.completed === true && args.answers) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", args.orgId).eq("departmentId", session.departmentId))
        .collect();
      const qMap = new Map(questions.map((q) => [q._id as string, q]));

      patch.answers = args.answers.map((a) => {
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
        actorId: user._id,
        actorName: user.name,
        action: "session.complete",
        entityType: "session",
        entityId: args.sessionId,
        entityLabel: session.departmentId,
        orgId: args.orgId,
      });
    }

    await ctx.db.patch(args.sessionId, patch);
  },
});

export const remove = mutation({
  args: {
    orgId: v.id("organizations"),
    sessionId: v.id("auditSessions"),
  },
  handler: async (ctx, { orgId, sessionId }) => {
    const { user, membership } = await requireOrgMember(ctx, orgId);
    const session = await ctx.db.get(sessionId);
    if (!session || session.orgId !== orgId) throw new Error("Session not found");

    // Only the auditor who created it or an admin can delete
    if (session.auditorId !== user._id && membership.role !== "admin") {
      throw new Error("Forbidden: you can only delete your own sessions");
    }

    await ctx.db.delete(sessionId);
    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "session.remove",
      entityType: "session",
      entityId: sessionId,
      entityLabel: session.departmentId,
      orgId,
    });
  },
});

export const save = mutation({
  args: {
    orgId: v.id("organizations"),
    companyId: v.string(),
    departmentId: v.string(),
    date: v.string(),
    answers: v.array(answerValidator),
    totalPoints: v.number(),
    maxPoints: v.number(),
    percentage: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrgMember(ctx, args.orgId);

    validateSessionFields(args);

    let answers = args.answers;

    // PCT-20: Inject question snapshots when completing
    if (args.completed) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", args.orgId).eq("departmentId", args.departmentId))
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

    // Server sets auditorId/auditorName from JWT-verified user — no spoofing
    const id = await ctx.db.insert("auditSessions", {
      ...args,
      answers,
      auditorId: user._id,
      auditorName: user.name,
      orgId: args.orgId,
    });

    if (args.completed) {
      await logChange(ctx, {
        actorId: user._id,
        actorName: user.name,
        action: "session.complete",
        entityType: "session",
        entityId: id,
        entityLabel: args.departmentId,
        orgId: args.orgId,
      });
    }

    return id;
  },
});
