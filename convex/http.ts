import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", message);
      return new Response(`Webhook Error: ${message}`, { status: 400 });
    }

    const HANDLED_EVENTS = [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ];

    if (HANDLED_EVENTS.includes(event.type)) {
      const subscription = event.data.object as any;
      const orgId = subscription.metadata?.orgId as string | undefined;

      if (!orgId) {
        console.error("Webhook: missing orgId in subscription metadata", {
          subscriptionId: subscription.id,
          eventType: event.type,
        });
        return new Response("Missing orgId in metadata", { status: 400 });
      }

      // Normalize status to our supported values
      const VALID_STATUSES = ["trialing", "active", "past_due", "canceled", "unpaid", "incomplete"] as const;
      const rawStatus =
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : subscription.status;
      const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : "incomplete";

      const priceItem = subscription.items?.data?.[0];

      if (!priceItem?.price?.id) {
        console.warn("Webhook: missing price ID", {
          subscriptionId: subscription.id,
          eventType: event.type,
        });
      }
      const interval: "month" | "year" = priceItem?.price?.recurring?.interval === "year" ? "year" : "month";

      // current_period_end lives on subscription item in newer Stripe API versions (Clover+)
      const currentPeriodEnd = subscription.current_period_end
        ?? priceItem?.current_period_end;

      const mutationArgs = {
          orgId: orgId as Id<"organizations">,
          stripeCustomerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceItem?.price?.id ?? "",
          status,
          quantity: priceItem?.quantity ?? 3,
          billingInterval: interval,
          trialEndsAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : undefined,
          currentPeriodEnd: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : new Date().toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
          stripeEventCreated: event.created,
        };
      try {
        await ctx.runMutation(internal.stripe.upsertSubscription, mutationArgs);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Webhook: mutation failed", {
          eventType: event.type,
          orgId,
          subscriptionId: subscription.id,
          status: rawStatus,
          error: message,
        });
        return new Response(`Mutation error: ${message}`, { status: 500 });
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
