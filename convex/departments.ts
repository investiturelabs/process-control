import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { logChange } from "./changeLog";

const departmentsValidator = v.array(
  v.object({
    id: v.string(),
    name: v.string(),
    icon: v.string(),
    questions: v.array(
      v.object({
        id: v.string(),
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
      }),
    ),
  }),
);

export const listWithQuestions = query({
  args: {},
  handler: async (ctx) => {
    const departments = await ctx.db.query("departments").collect();
    const questions = await ctx.db.query("questions").collect();

    departments.sort((a, b) => a.sortOrder - b.sortOrder);

    return departments.map((dept) => ({
      id: dept.stableId,
      name: dept.name,
      icon: dept.icon,
      questions: questions
        .filter((q) => q.departmentId === dept.stableId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((q) => ({
          id: q._id as string,
          departmentId: q.departmentId,
          riskCategory: q.riskCategory,
          text: q.text,
          criteria: q.criteria,
          answerType: q.answerType,
          pointsYes: q.pointsYes,
          pointsPartial: q.pointsPartial,
          pointsNo: q.pointsNo,
        })),
    }));
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { name, icon, actorId, actorName }) => {
    const existing = await ctx.db.query("departments").collect();
    const maxOrder = existing.reduce((max, d) => Math.max(max, d.sortOrder), -1);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const stableId = `dept-${slug}-${Date.now()}`;
    await ctx.db.insert("departments", {
      stableId,
      name,
      icon,
      sortOrder: maxOrder + 1,
    });

    await logChange(ctx, {
      actorId,
      actorName,
      action: "department.add",
      entityType: "department",
      entityId: stableId,
      entityLabel: name,
    });

    return stableId;
  },
});

export const update = mutation({
  args: {
    stableId: v.string(),
    name: v.string(),
    icon: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { stableId, name, icon, actorId, actorName }) => {
    const dept = await ctx.db
      .query("departments")
      .withIndex("by_stableId", (q) => q.eq("stableId", stableId))
      .unique();
    if (!dept) throw new Error("Department not found");

    const oldName = dept.name;
    const oldIcon = dept.icon;
    await ctx.db.patch(dept._id, { name, icon });

    const changes: Record<string, { from: string; to: string }> = {};
    if (oldName !== name) changes.name = { from: oldName, to: name };
    if (oldIcon !== icon) changes.icon = { from: oldIcon, to: icon };

    await logChange(ctx, {
      actorId,
      actorName,
      action: "department.update",
      entityType: "department",
      entityId: stableId,
      entityLabel: name,
      details: JSON.stringify(changes),
    });
  },
});

export const remove = mutation({
  args: {
    stableId: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { stableId, actorId, actorName }) => {
    const dept = await ctx.db
      .query("departments")
      .withIndex("by_stableId", (q) => q.eq("stableId", stableId))
      .unique();
    if (!dept) throw new Error("Department not found");

    // Delete all questions belonging to this department
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_departmentId", (q) => q.eq("departmentId", stableId))
      .collect();
    for (const q of questions) {
      await ctx.db.delete(q._id);
    }

    // Delete in-progress audit sessions (completed sessions are kept as historical records)
    const inProgressSessions = await ctx.db
      .query("auditSessions")
      .withIndex("by_departmentId", (q) => q.eq("departmentId", stableId))
      .filter((q) => q.eq(q.field("completed"), false))
      .collect();
    for (const session of inProgressSessions) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(dept._id);

    await logChange(ctx, {
      actorId,
      actorName,
      action: "department.remove",
      entityType: "department",
      entityId: stableId,
      entityLabel: dept.name,
      details: JSON.stringify({ deletedQuestions: questions.length }),
    });
  },
});

export const duplicate = mutation({
  args: {
    stableId: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { stableId, actorId, actorName }) => {
    const source = await ctx.db
      .query("departments")
      .withIndex("by_stableId", (q) => q.eq("stableId", stableId))
      .unique();
    if (!source) throw new Error("Department not found");

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_departmentId", (q) => q.eq("departmentId", stableId))
      .collect();

    const slug = source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const newStableId = `dept-${slug}-${Date.now()}`;
    const existing = await ctx.db.query("departments").collect();
    const maxOrder = existing.reduce((max, d) => Math.max(max, d.sortOrder), -1);

    await ctx.db.insert("departments", {
      stableId: newStableId,
      name: `${source.name} (Copy)`,
      icon: source.icon,
      sortOrder: maxOrder + 1,
    });

    questions.sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await ctx.db.insert("questions", {
        departmentId: newStableId,
        riskCategory: q.riskCategory,
        text: q.text,
        criteria: q.criteria,
        answerType: q.answerType,
        pointsYes: q.pointsYes,
        pointsPartial: q.pointsPartial,
        pointsNo: q.pointsNo,
        sortOrder: i,
      });
    }

    await logChange(ctx, {
      actorId,
      actorName,
      action: "department.duplicate",
      entityType: "department",
      entityId: newStableId,
      entityLabel: source.name,
    });

    return newStableId;
  },
});

export const resetToDefaults = mutation({
  args: {
    departments: departmentsValidator,
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { departments, actorId, actorName }) => {
    // Delete all existing questions
    const existingQuestions = await ctx.db.query("questions").collect();
    for (const q of existingQuestions) {
      await ctx.db.delete(q._id);
    }

    // Delete all existing departments
    const existingDepts = await ctx.db.query("departments").collect();
    for (const d of existingDepts) {
      await ctx.db.delete(d._id);
    }

    // Re-seed
    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i];
      await ctx.db.insert("departments", {
        stableId: dept.id,
        name: dept.name,
        icon: dept.icon,
        sortOrder: i,
      });

      for (let j = 0; j < dept.questions.length; j++) {
        const q = dept.questions[j];
        await ctx.db.insert("questions", {
          departmentId: dept.id,
          riskCategory: q.riskCategory,
          text: q.text,
          criteria: q.criteria,
          answerType: q.answerType,
          pointsYes: q.pointsYes,
          pointsPartial: q.pointsPartial,
          pointsNo: q.pointsNo,
          sortOrder: j,
        });
      }
    }

    await logChange(ctx, {
      actorId,
      actorName,
      action: "department.resetToDefaults",
      entityType: "department",
      entityLabel: `Reset ${departments.length} departments`,
    });
  },
});
