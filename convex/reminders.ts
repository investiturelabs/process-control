import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { logChange } from "./changeLog";
import { computeNextDueAt } from "./lib/reminderUtils";
import type { ReminderFrequency } from "./lib/reminderUtils";
import { sanitize, MAX_LENGTHS } from "./lib/validators";

const frequencyValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("annually"),
  v.literal("custom"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("reminders")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("reminders").collect();
  },
});

export const listByQuestion = query({
  args: { questionId: v.string() },
  handler: async (ctx, { questionId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("reminders")
      .withIndex("by_questionId", (q) => q.eq("questionId", questionId))
      .collect();
  },
});

export const listByDepartment = query({
  args: { departmentId: v.string() },
  handler: async (ctx, { departmentId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("reminders")
      .withIndex("by_departmentId", (q) => q.eq("departmentId", departmentId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    frequency: frequencyValidator,
    customDays: v.optional(v.number()),
    questionId: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const cleanTitle = sanitize(args.title, "title", MAX_LENGTHS.text);
    const cleanDescription = args.description?.trim() || undefined;

    const frequency = args.frequency as ReminderFrequency;
    if (frequency === "custom" && (!args.customDays || args.customDays < 1)) {
      throw new Error("customDays must be a positive number for custom frequency");
    }

    const startDate = new Date(args.startDate);
    const nextDueAt = startDate.toISOString();
    const now = new Date().toISOString();

    const id = await ctx.db.insert("reminders", {
      questionId: args.questionId,
      departmentId: args.departmentId,
      title: cleanTitle,
      description: cleanDescription,
      frequency: args.frequency,
      customDays: args.customDays,
      lastCompletedAt: undefined,
      lastCompletedBy: undefined,
      lastCompletedByName: undefined,
      nextDueAt,
      createdBy: user._id,
      createdByName: user.name,
      createdAt: now,
      active: true,
    });

    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "reminder.create",
      entityType: "reminder",
      entityId: id,
      entityLabel: cleanTitle,
      details: JSON.stringify({
        frequency: args.frequency,
        questionId: args.questionId,
        departmentId: args.departmentId,
      }),
    });

    return id;
  },
});

export const update = mutation({
  args: {
    reminderId: v.id("reminders"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    frequency: v.optional(frequencyValidator),
    customDays: v.optional(v.number()),
    questionId: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { reminderId, ...fields }) => {
    const user = await requireAuth(ctx);

    const old = await ctx.db.get(reminderId);
    if (!old) throw new Error("Reminder not found");

    const patch: Record<string, unknown> = {};

    if (fields.title !== undefined) {
      patch.title = sanitize(fields.title, "title", MAX_LENGTHS.text);
    }
    if (fields.description !== undefined) {
      patch.description = fields.description.trim() || undefined;
    }
    if (fields.frequency !== undefined) {
      patch.frequency = fields.frequency;
    }
    if (fields.customDays !== undefined) {
      patch.customDays = fields.customDays;
    }
    if (fields.questionId !== undefined) {
      patch.questionId = fields.questionId;
    }
    if (fields.departmentId !== undefined) {
      patch.departmentId = fields.departmentId;
    }
    if (fields.active !== undefined) {
      patch.active = fields.active;
    }

    // Recompute nextDueAt if frequency changed
    if (fields.frequency !== undefined && fields.frequency !== old.frequency) {
      const freq = fields.frequency as ReminderFrequency;
      const customDays = fields.customDays ?? old.customDays;
      const fromDate = old.lastCompletedAt ? new Date(old.lastCompletedAt) : new Date();
      patch.nextDueAt = computeNextDueAt(freq, fromDate, customDays);
    }

    await ctx.db.patch(reminderId, patch);

    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "reminder.update",
      entityType: "reminder",
      entityId: reminderId,
      entityLabel: old.title,
      details: JSON.stringify(patch),
    });
  },
});

export const remove = mutation({
  args: {
    reminderId: v.id("reminders"),
  },
  handler: async (ctx, { reminderId }) => {
    const user = await requireAuth(ctx);

    const old = await ctx.db.get(reminderId);
    if (!old) throw new Error("Reminder not found");

    // Delete all completions for this reminder
    const completions = await ctx.db
      .query("reminderCompletions")
      .withIndex("by_reminderId", (q) => q.eq("reminderId", reminderId))
      .collect();
    for (const c of completions) {
      await ctx.db.delete(c._id);
    }

    await ctx.db.delete(reminderId);

    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "reminder.remove",
      entityType: "reminder",
      entityId: reminderId,
      entityLabel: old.title,
    });
  },
});

export const complete = mutation({
  args: {
    reminderId: v.id("reminders"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { reminderId, note }) => {
    const user = await requireAuth(ctx);

    const reminder = await ctx.db.get(reminderId);
    if (!reminder) throw new Error("Reminder not found");

    const now = new Date();
    const completedAt = now.toISOString();

    // Insert completion record
    await ctx.db.insert("reminderCompletions", {
      reminderId,
      completedAt,
      completedBy: user._id,
      completedByName: user.name,
      note: note?.trim() || undefined,
    });

    // Advance nextDueAt
    const frequency = reminder.frequency as ReminderFrequency;
    const nextDueAt = computeNextDueAt(frequency, now, reminder.customDays);

    await ctx.db.patch(reminderId, {
      lastCompletedAt: completedAt,
      lastCompletedBy: user._id,
      lastCompletedByName: user.name,
      nextDueAt,
    });

    await logChange(ctx, {
      actorId: user._id,
      actorName: user.name,
      action: "reminder.complete",
      entityType: "reminder",
      entityId: reminderId,
      entityLabel: reminder.title,
      details: JSON.stringify({ note: note?.trim() }),
    });
  },
});

export const getCompletions = query({
  args: { reminderId: v.string() },
  handler: async (ctx, { reminderId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("reminderCompletions")
      .withIndex("by_reminderId", (q) => q.eq("reminderId", reminderId))
      .order("desc")
      .collect();
  },
});
