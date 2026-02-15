import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { logChange } from "./changeLog";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("companies").first();
  },
});

export const set = mutation({
  args: {
    name: v.string(),
    logoUrl: v.optional(v.string()),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  handler: async (ctx, { name, logoUrl, actorId, actorName }) => {
    const existing = await ctx.db.query("companies").first();
    const oldName = existing?.name;
    if (existing) {
      await ctx.db.patch(existing._id, { name, logoUrl });
    } else {
      await ctx.db.insert("companies", { name, logoUrl });
    }

    await logChange(ctx, {
      actorId,
      actorName,
      action: "company.update",
      entityType: "company",
      entityLabel: name,
      details: oldName ? JSON.stringify({ from: oldName, to: name }) : undefined,
    });
  },
});
