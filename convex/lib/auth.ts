import type { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

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
 * Requires the authenticated user to be a member of the given org.
 * Returns the user doc and their orgMembers membership row.
 */
export async function requireOrgMember(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
) {
  const user = await requireAuth(ctx);

  const membership = await ctx.db
    .query("orgMembers")
    .withIndex("by_orgId_userId", (q) =>
      q.eq("orgId", orgId).eq("userId", user._id),
    )
    .unique();

  if (!membership) {
    throw new Error("Forbidden: not a member of this organization");
  }

  return { user, membership };
}

/**
 * Requires the authenticated user to be an admin of the given org.
 * Returns the user doc and their orgMembers membership row.
 */
export async function requireOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
) {
  const { user, membership } = await requireOrgMember(ctx, orgId);

  if (membership.role !== "admin") {
    throw new Error("Forbidden: org admin access required");
  }

  return { user, membership };
}
