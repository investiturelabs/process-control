import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    avatarColor: v.string(),
    active: v.optional(v.boolean()),
  }).index("by_email", ["email"]),

  companies: defineTable({
    name: v.string(),
    logoUrl: v.optional(v.string()),
  }),

  departments: defineTable({
    stableId: v.string(),
    name: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  }).index("by_stableId", ["stableId"]),

  questions: defineTable({
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
    sortOrder: v.number(),
  }).index("by_departmentId", ["departmentId"]),

  auditSessions: defineTable({
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
  }).index("by_departmentId", ["departmentId"])
    .index("by_auditorId", ["auditorId"])
    .index("by_completed_departmentId", ["completed", "departmentId"]),

  invitations: defineTable({
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    createdAt: v.string(),
  }).index("by_email", ["email"]),
});
