import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("companies").first();
  },
});

export const set = mutation({
  args: { name: v.string(), logoUrl: v.optional(v.string()) },
  handler: async (ctx, { name, logoUrl }) => {
    const existing = await ctx.db.query("companies").first();
    if (existing) {
      await ctx.db.patch(existing._id, { name, logoUrl });
    } else {
      await ctx.db.insert("companies", { name, logoUrl });
    }
  },
});
