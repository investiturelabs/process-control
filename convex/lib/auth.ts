import type { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type QueryCtx = GenericQueryCtx<DataModel>;
type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * Requires a valid JWT identity (via Clerk) and returns the matching Convex user doc.
 * The identity is cryptographically verified by Convex — unspoofable.
 * Throws if not authenticated or if no matching user record exists.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user) {
    throw new Error("Unauthorized: user not found");
  }

  return user;
}

/**
 * Requires an authenticated admin user. Calls requireAuth then checks role.
 * Throws if user is not an admin.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireAuth(ctx);
  if (user.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }
  return user;
}
