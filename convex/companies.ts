import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin } from "./lib/auth";
import { sanitize, validateUrl, MAX_LENGTHS } from "./lib/validators";
import { logChange } from "./changeLog";

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("companies").first();
  },
});

export const set = mutation({
  args: {
    name: v.string(),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { name, logoUrl }) => {
    const admin = await requireAdmin(ctx);

    const cleanName = sanitize(name, "company name", MAX_LENGTHS.name);
    validateUrl(logoUrl, "logo URL");

    const existing = await ctx.db.query("companies").first();
    const oldName = existing?.name;
    if (existing) {
      await ctx.db.patch(existing._id, { name: cleanName, logoUrl });
    } else {
      await ctx.db.insert("companies", { name: cleanName, logoUrl });
    }

    await logChange(ctx, {
      actorId: admin._id,
      actorName: admin.name,
      action: "company.update",
      entityType: "company",
      entityLabel: cleanName,
      details: oldName ? JSON.stringify({ from: oldName, to: cleanName }) : undefined,
    });
  },
});
