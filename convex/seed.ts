import { mutation } from "./_generated/server";
import { v } from "convex/values";

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
    // Idempotent: only seed if no departments exist
    const existing = await ctx.db.query("departments").first();
    if (existing) return;

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
  },
});
