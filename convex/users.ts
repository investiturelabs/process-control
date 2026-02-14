import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const AVATAR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

export const login = mutation({
  args: { name: v.string(), email: v.string() },
  handler: async (ctx, { name, email }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return existing;
    }

    const allUsers = await ctx.db.query("users").collect();
    const isFirst = allUsers.length === 0;

    const id = await ctx.db.insert("users", {
      name,
      email,
      role: isFirst ? "admin" : "user",
      avatarColor: AVATAR_COLORS[allUsers.length % AVATAR_COLORS.length],
    });

    return (await ctx.db.get(id))!;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const updateRole = mutation({
  args: { userId: v.id("users"), role: v.union(v.literal("admin"), v.literal("user")) },
  handler: async (ctx, { userId, role }) => {
    await ctx.db.patch(userId, { role });
  },
});
