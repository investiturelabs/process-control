import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { sanitize, validatePoints, MAX_LENGTHS } from "./lib/validators";

export const seedAll = mutation({
  args: {
    departments: v.array(
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
    ),
  },
  handler: async (ctx, { departments }) => {
    await requireAdmin(ctx);

    // Idempotent: only seed if no departments exist
    const existing = await ctx.db.query("departments").first();
    if (existing) return;

    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i];
      const cleanName = sanitize(dept.name, "department name", MAX_LENGTHS.name);
      const cleanIcon = sanitize(dept.icon, "icon", MAX_LENGTHS.icon);

      await ctx.db.insert("departments", {
        stableId: dept.id,
        name: cleanName,
        icon: cleanIcon,
        sortOrder: i,
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
        });
      }
    }
  },
});
