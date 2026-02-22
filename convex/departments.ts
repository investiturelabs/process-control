import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMember, requireOrgAdmin } from "./lib/auth";
import { sanitize, validatePoints, MAX_LENGTHS } from "./lib/validators";
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
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await requireOrgMember(ctx, orgId);

    const departments = await ctx.db
      .query("departments")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", orgId))
      .collect();

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
    orgId: v.id("organizations"),
    name: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, { orgId, name, icon }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    const cleanName = sanitize(name, "department name", MAX_LENGTHS.name);
    const cleanIcon = sanitize(icon, "icon", MAX_LENGTHS.icon);

    const existing = await ctx.db
      .query("departments")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
    const maxOrder = existing.reduce((max, d) => Math.max(max, d.sortOrder), -1);
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const stableId = `dept-${slug}-${Date.now()}`;
    await ctx.db.insert("departments", {
      stableId,
      name: cleanName,
      icon: cleanIcon,
      sortOrder: maxOrder + 1,
      orgId,
    });

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "department.add",
      entityType: "department",
      entityId: stableId,
      entityLabel: cleanName,
      orgId,
    });

    return stableId;
  },
});

export const update = mutation({
  args: {
    orgId: v.id("organizations"),
    stableId: v.string(),
    name: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, { orgId, stableId, name, icon }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    const cleanName = sanitize(name, "department name", MAX_LENGTHS.name);
    const cleanIcon = sanitize(icon, "icon", MAX_LENGTHS.icon);

    const dept = await ctx.db
      .query("departments")
      .withIndex("by_orgId_stableId", (q) => q.eq("orgId", orgId).eq("stableId", stableId))
      .unique();
    if (!dept) throw new Error("Department not found");

    const oldName = dept.name;
    const oldIcon = dept.icon;
    await ctx.db.patch(dept._id, { name: cleanName, icon: cleanIcon });

    const changes: Record<string, { from: string; to: string }> = {};
    if (oldName !== cleanName) changes.name = { from: oldName, to: cleanName };
    if (oldIcon !== cleanIcon) changes.icon = { from: oldIcon, to: cleanIcon };

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "department.update",
      entityType: "department",
      entityId: stableId,
      entityLabel: cleanName,
      details: JSON.stringify(changes),
      orgId,
    });
  },
});

export const remove = mutation({
  args: {
    orgId: v.id("organizations"),
    stableId: v.string(),
  },
  handler: async (ctx, { orgId, stableId }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    const dept = await ctx.db
      .query("departments")
      .withIndex("by_orgId_stableId", (q) => q.eq("orgId", orgId).eq("stableId", stableId))
      .unique();
    if (!dept) throw new Error("Department not found");

    // Delete all questions belonging to this department
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", orgId).eq("departmentId", stableId))
      .collect();
    for (const q of questions) {
      await ctx.db.delete(q._id);
    }

    // Delete in-progress audit sessions (completed sessions are kept as historical records)
    const inProgressSessions = await ctx.db
      .query("auditSessions")
      .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", orgId).eq("departmentId", stableId))
      .filter((q) => q.eq(q.field("completed"), false))
      .collect();
    for (const session of inProgressSessions) {
      await ctx.db.delete(session._id);
    }

    // Cascade: delete saved answers for this department
    const savedAnswers = await ctx.db
      .query("savedAnswers")
      .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", orgId).eq("departmentId", stableId))
      .collect();
    for (const sa of savedAnswers) {
      await ctx.db.delete(sa._id);
    }

    await ctx.db.delete(dept._id);

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "department.remove",
      entityType: "department",
      entityId: stableId,
      entityLabel: dept.name,
      details: JSON.stringify({ deletedQuestions: questions.length }),
      orgId,
    });
  },
});

export const duplicate = mutation({
  args: {
    orgId: v.id("organizations"),
    stableId: v.string(),
  },
  handler: async (ctx, { orgId, stableId }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    const source = await ctx.db
      .query("departments")
      .withIndex("by_orgId_stableId", (q) => q.eq("orgId", orgId).eq("stableId", stableId))
      .unique();
    if (!source) throw new Error("Department not found");

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", orgId).eq("departmentId", stableId))
      .collect();

    const slug = source.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const newStableId = `dept-${slug}-${Date.now()}`;
    const existing = await ctx.db
      .query("departments")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
    const maxOrder = existing.reduce((max, d) => Math.max(max, d.sortOrder), -1);

    await ctx.db.insert("departments", {
      stableId: newStableId,
      name: `${source.name} (Copy)`,
      icon: source.icon,
      sortOrder: maxOrder + 1,
      orgId,
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
        orgId,
      });
    }

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "department.duplicate",
      entityType: "department",
      entityId: newStableId,
      entityLabel: source.name,
      orgId,
    });

    return newStableId;
  },
});

export const resetToDefaults = mutation({
  args: {
    orgId: v.id("organizations"),
    departments: departmentsValidator,
  },
  handler: async (ctx, { orgId, departments }) => {
    const { user: admin } = await requireOrgAdmin(ctx, orgId);

    // Delete all existing questions for this org
    const existingQuestions = await ctx.db
      .query("questions")
      .withIndex("by_orgId_departmentId", (q) => q.eq("orgId", orgId))
      .collect();
    for (const q of existingQuestions) {
      await ctx.db.delete(q._id);
    }

    // Delete all existing departments for this org
    const existingDepts = await ctx.db
      .query("departments")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
    for (const d of existingDepts) {
      await ctx.db.delete(d._id);
    }

    // Re-seed with validation
    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i];
      const cleanName = sanitize(dept.name, "department name", MAX_LENGTHS.name);
      const cleanIcon = sanitize(dept.icon, "icon", MAX_LENGTHS.icon);

      await ctx.db.insert("departments", {
        stableId: dept.id,
        name: cleanName,
        icon: cleanIcon,
        sortOrder: i,
        orgId,
      });

      for (let j = 0; j < dept.questions.length; j++) {
        const q = dept.questions[j];
        validatePoints(q.pointsYes, q.pointsPartial, q.pointsNo);
        const cleanText = sanitize(q.text, "question text", MAX_LENGTHS.text);
        const cleanCriteria = sanitize(q.criteria, "criteria", MAX_LENGTHS.criteria);
        const cleanRiskCategory = sanitize(q.riskCategory, "risk category", MAX_LENGTHS.riskCategory);

        await ctx.db.insert("questions", {
          departmentId: dept.id,
          riskCategory: cleanRiskCategory,
          text: cleanText,
          criteria: cleanCriteria,
          answerType: q.answerType,
          pointsYes: q.pointsYes,
          pointsPartial: q.pointsPartial,
          pointsNo: q.pointsNo,
          sortOrder: j,
          orgId,
        });
      }
    }

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "department.resetToDefaults",
      entityType: "department",
      entityLabel: `Reset ${departments.length} departments`,
      orgId,
    });
  },
});
