import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("invitations").collect();
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, { email, role }) => {
    return await ctx.db.insert("invitations", {
      email,
      role,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, { invitationId }) => {
    await ctx.db.delete(invitationId);
  },
});
