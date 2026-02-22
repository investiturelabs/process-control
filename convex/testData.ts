import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const AUDITORS = [
  { name: "Sarah Chen", email: "sarah@example.com" },
  { name: "Marcus Johnson", email: "marcus@example.com" },
  { name: "Emily Rodriguez", email: "emily@example.com" },
];

const AVATAR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

// Seeded random for reproducibility
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const generate = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // Check if test data already exists (more than 5 sessions = likely seeded)
    const existingSessions = await ctx.db.query("auditSessions").collect();
    if (existingSessions.length > 5) return { created: 0 };

    const departments = await ctx.db.query("departments").collect();
    const questions = await ctx.db.query("questions").collect();
    if (departments.length === 0) return { created: 0 };

    // Ensure auditor users exist
    const auditorIds: string[] = [];
    for (let i = 0; i < AUDITORS.length; i++) {
      const a = AUDITORS[i];
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", a.email))
        .first();
      if (existing) {
        auditorIds.push(existing._id);
      } else {
        const id = await ctx.db.insert("users", {
          name: a.name,
          email: a.email,
          role: "user",
          avatarColor: AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length],
          tokenIdentifier: `test|${a.email}`,
        });
        auditorIds.push(id);
      }
    }

    const rand = mulberry32(42);

    // Base scores per department (some depts perform better than others)
    const deptBaseScores: Record<string, number> = {};
    for (const dept of departments) {
      // General and produce tend higher, deli/meat mid, bulk/dairy lower variation
      const bases: Record<string, number> = {
        "dept-general": 78,
        "dept-deli": 74,
        "dept-meat": 76,
        "dept-bakery": 80,
        "dept-produce": 82,
        "dept-bulk": 85,
        "dept-dairy": 83,
        "dept-grocery": 81,
        "dept-vitamins": 86,
      };
      deptBaseScores[dept.stableId] = bases[dept.stableId] ?? 80;
    }

    // Generate sessions over 6 months: Sep 2025 - Feb 2026
    const months = [
      { year: 2025, month: 8 },  // Sep
      { year: 2025, month: 9 },  // Oct
      { year: 2025, month: 10 }, // Nov
      { year: 2025, month: 11 }, // Dec
      { year: 2026, month: 0 },  // Jan
      { year: 2026, month: 1 },  // Feb
    ];

    let created = 0;

    for (let mi = 0; mi < months.length; mi++) {
      const { year, month } = months[mi];
      // Improvement trend: +0 to +10 over 6 months
      const trendBonus = (mi / 5) * 10;

      for (const dept of departments) {
        // 2-3 audits per department per month
        const numAudits = 2 + (rand() > 0.5 ? 1 : 0);

        for (let a = 0; a < numAudits; a++) {
          const day = 1 + Math.floor(rand() * 27);
          const hour = 8 + Math.floor(rand() * 9);
          const date = new Date(year, month, day, hour, 0, 0);

          const auditorIdx = Math.floor(rand() * AUDITORS.length);
          const auditorId = auditorIds[auditorIdx];
          const auditorName = AUDITORS[auditorIdx].name;

          // Target score with noise
          const baseScore = deptBaseScores[dept.stableId] ?? 80;
          const noise = (rand() - 0.5) * 12; // ±6%
          const targetPct = Math.min(
            99,
            Math.max(60, baseScore + trendBonus + noise)
          );

          // Generate answers for this department's questions
          const deptQuestions = questions
            .filter((q) => q.departmentId === dept.stableId)
            .sort((x, y) => x.sortOrder - y.sortOrder);

          const maxPoints = deptQuestions.reduce(
            (acc, q) => acc + q.pointsYes,
            0
          );

          const answers: {
            questionId: string;
            value: "yes" | "no" | "partial";
            points: number;
          }[] = [];
          let earnedSoFar = 0;

          for (let qi = 0; qi < deptQuestions.length; qi++) {
            const q = deptQuestions[qi];
            const r = rand();

            // Adjust thresholds based on target percentage
            const yesThreshold = targetPct / 100;
            const partialThreshold =
              yesThreshold + (1 - yesThreshold) * 0.4;

            let value: "yes" | "no" | "partial";
            let points: number;

            if (r < yesThreshold) {
              value = "yes";
              points = q.pointsYes;
            } else if (
              r < partialThreshold &&
              q.answerType === "yes_no_partial"
            ) {
              value = "partial";
              points = q.pointsPartial;
            } else {
              value = "no";
              points = 0;
            }

            earnedSoFar += points;
            answers.push({
              questionId: q._id,
              value,
              points,
            });
          }

          const percentage =
            maxPoints > 0
              ? Math.round((earnedSoFar / maxPoints) * 100)
              : 0;

          await ctx.db.insert("auditSessions", {
            companyId: "",
            departmentId: dept.stableId,
            auditorId,
            auditorName,
            date: date.toISOString(),
            answers,
            totalPoints: earnedSoFar,
            maxPoints,
            percentage,
            completed: true,
          });

          created++;
        }
      }
    }

    return { created };
  },
});
