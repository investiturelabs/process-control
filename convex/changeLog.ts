import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireOrgMember } from "./lib/auth";

interface LogEntry {
  actorId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  details?: string;
  orgId: Id<"organizations">;
}

export async function logChange(ctx: MutationCtx, entry: LogEntry) {
  await ctx.db.insert("changeLog", {
    timestamp: new Date().toISOString(),
    actorId: entry.actorId,
    actorName: entry.actorName,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityLabel: entry.entityLabel?.slice(0, 200),
    details: entry.details?.slice(0, 2000),
    orgId: entry.orgId,
  });
}

export const list = query({
  args: {
    orgId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
    entityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.orgId);
    if (args.entityType) {
      return await ctx.db
        .query("changeLog")
        .withIndex("by_orgId_entityType_timestamp", (q) =>
          q.eq("orgId", args.orgId).eq("entityType", args.entityType!)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("changeLog")
      .withIndex("by_orgId_timestamp", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
