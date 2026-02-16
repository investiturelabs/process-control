import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    avatarColor: v.string(),
    active: v.optional(v.boolean()),
    tokenIdentifier: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["tokenIdentifier"]),

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
        // PCT-20: question snapshot (optional, backward compat)
        questionText: v.optional(v.string()),
        questionCriteria: v.optional(v.string()),
        questionRiskCategory: v.optional(v.string()),
        questionAnswerType: v.optional(v.union(v.literal("yes_no"), v.literal("yes_no_partial"))),
        questionPointsYes: v.optional(v.number()),
        questionPointsPartial: v.optional(v.number()),
        questionPointsNo: v.optional(v.number()),
      }),
    ),
    totalPoints: v.number(),
    maxPoints: v.number(),
    percentage: v.number(),
    completed: v.boolean(),
  }).index("by_departmentId", ["departmentId"])
    .index("by_auditorId", ["auditorId"])
    .index("by_completed_departmentId", ["completed", "departmentId"]),

  // PCT-14: Change log for audit trail
  changeLog: defineTable({
    timestamp: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    entityLabel: v.optional(v.string()),
    details: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"])
    .index("by_entityType_timestamp", ["entityType", "timestamp"]),

  invitations: defineTable({
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    createdAt: v.string(),
    expiresAt: v.optional(v.string()),
  }).index("by_email", ["email"])
    .index("by_status", ["status"]),

  savedAnswers: defineTable({
    questionId: v.string(),
    departmentId: v.string(),
    value: v.union(v.literal("yes"), v.literal("no"), v.literal("partial")),
    expiresAt: v.optional(v.string()),
    note: v.optional(v.string()),
    savedBy: v.string(),
    savedByName: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_questionId", ["questionId"])
    .index("by_departmentId", ["departmentId"]),
});
