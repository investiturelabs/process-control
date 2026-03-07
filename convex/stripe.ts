import { v } from "convex/values";
import {
  query,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireOrgMember, requireOrgAdmin } from "./lib/auth";
import { logChange } from "./changeLog";

// --- Query: get subscription for org ---
export const getForOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await requireOrgMember(ctx, orgId);
    const doc = await ctx.db
      .query("subscriptions")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
    if (!doc) return null;
    return {
      _id: doc._id,
      _creationTime: doc._creationTime,
      orgId: doc.orgId,
      status: doc.status,
      quantity: doc.quantity,
      billingInterval: doc.billingInterval,
      trialEndsAt: doc.trialEndsAt,
      currentPeriodEnd: doc.currentPeriodEnd,
      cancelAtPeriodEnd: doc.cancelAtPeriodEnd,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
});

// --- Internal queries ---
export const getSubscriptionByOrgId = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .unique();
  },
});

export const getSubscriptionByStripeId = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, { stripeSubscriptionId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
  },
});

export const getOrgMemberCount = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
    return members.length;
  },
});

export const getOrgAdminEmail = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
    const admin = members.find((m) => m.role === "admin");
    if (!admin) return null;
    const user = await ctx.db.get(admin.userId);
    return user?.email ?? null;
  },
});

// --- Internal mutation: upsert subscription ---
export const upsertSubscription = internalMutation({
  args: {
    orgId: v.id("organizations"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
      v.literal("incomplete"),
    ),
    quantity: v.number(),
    billingInterval: v.union(v.literal("month"), v.literal("year")),
    trialEndsAt: v.optional(v.string()),
    currentPeriodEnd: v.string(),
    cancelAtPeriodEnd: v.boolean(),
    stripeEventCreated: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();

    const now = new Date().toISOString();

    if (existing) {
      // Skip stale webhook events
      if (
        args.stripeEventCreated &&
        existing.stripeEventCreated &&
        args.stripeEventCreated <= existing.stripeEventCreated
      ) {
        return;
      }

      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      await logChange(ctx, {
        actorName: "Stripe",
        action: "subscription.updated",
        entityType: "subscription",
        entityId: existing._id,
        entityLabel: args.status,
        details: JSON.stringify({
          status: args.status,
          quantity: args.quantity,
          cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        }),
        orgId: args.orgId,
      });
    } else {
      const id = await ctx.db.insert("subscriptions", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
      await logChange(ctx, {
        actorName: "Stripe",
        action: "subscription.created",
        entityType: "subscription",
        entityId: id,
        entityLabel: args.status,
        details: JSON.stringify({
          status: args.status,
          quantity: args.quantity,
        }),
        orgId: args.orgId,
      });
    }
  },
});

// --- Action: create Stripe Checkout session ---
export const createCheckoutSession = action({
  args: {
    orgId: v.id("organizations"),
    annual: v.boolean(),
  },
  returns: v.object({ url: v.union(v.string(), v.null()) }),
  handler: async (ctx, { orgId, annual }): Promise<{ url: string | null }> => {
    // Verify admin
    await ctx.runQuery(internal.stripe.verifyOrgAdmin, { orgId });

    // Check for existing active subscription
    const existingSub = await ctx.runQuery(
      internal.stripe.getSubscriptionByOrgId,
      { orgId },
    );
    if (
      existingSub &&
      (existingSub.status === "active" || existingSub.status === "trialing")
    ) {
      throw new Error("Organization already has an active subscription");
    }

    // Get seat count
    const memberCount = await ctx.runQuery(
      internal.stripe.getOrgMemberCount,
      { orgId },
    );
    const seats = Math.max(memberCount, 3);

    // Get admin email for Stripe customer
    const adminEmail = await ctx.runQuery(
      internal.stripe.getOrgAdminEmail,
      { orgId },
    );

    // Initialize Stripe
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Reuse existing customer or create new
    let customerId: string;
    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: adminEmail ?? undefined,
        metadata: { orgId },
      });
      customerId = customer.id;
    }

    const priceId = annual
      ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID!
      : process.env.STRIPE_PRO_MONTHLY_PRICE_ID!;

    const siteUrl = process.env.SITE_URL!;

    // Only offer trial if org has never had a subscription before
    const hasPriorSubscription = !!existingSub;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: seats }],
      subscription_data: {
        ...(hasPriorSubscription ? {} : { trial_period_days: 14 }),
        metadata: { orgId },
      },
      success_url: `${siteUrl}/settings?checkout=success`,
      cancel_url: `${siteUrl}/pricing`,
    });

    return { url: session.url };
  },
});

// --- Action: create Stripe billing portal session ---
export const createPortalSession = action({
  args: { orgId: v.id("organizations") },
  returns: v.object({ url: v.union(v.string(), v.null()) }),
  handler: async (ctx, { orgId }): Promise<{ url: string | null }> => {
    await ctx.runQuery(internal.stripe.verifyOrgAdmin, { orgId });

    const existingSub = await ctx.runQuery(
      internal.stripe.getSubscriptionByOrgId,
      { orgId },
    );
    if (!existingSub?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const siteUrl = process.env.SITE_URL!;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: existingSub.stripeCustomerId,
      return_url: `${siteUrl}/settings`,
    });

    return { url: portalSession.url };
  },
});

// --- Action: update subscription seat count ---
export const updateSeats = action({
  args: {
    orgId: v.id("organizations"),
    quantity: v.number(),
  },
  handler: async (ctx, { orgId, quantity }) => {
    await ctx.runQuery(internal.stripe.verifyOrgAdmin, { orgId });

    if (quantity < 3) {
      throw new Error("Minimum 3 seats required");
    }

    const existingSub = await ctx.runQuery(
      internal.stripe.getSubscriptionByOrgId,
      { orgId },
    );
    if (!existingSub?.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Get the subscription to find the item ID
    const stripeSub = await stripe.subscriptions.retrieve(
      existingSub.stripeSubscriptionId,
    );
    const item = stripeSub.items.data[0];
    if (!item) {
      throw new Error("No subscription item found");
    }

    await stripe.subscriptionItems.update(item.id, { quantity });

    return { quantity };
  },
});

// --- Internal query to verify org admin (for use in actions) ---
export const verifyOrgAdmin = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    await requireOrgAdmin(ctx, orgId);
    return true;
  },
});
