import Stripe from "stripe";
import {
  deletePendingCheckoutSessionByStripeId,
  hasProcessedStripeEvent,
  recordProcessedStripeEvent,
  saveSubscription,
} from "@/server/db";

export type StripeSubscriptionReader = {
  retrieve(subscriptionId: string): Promise<Stripe.Subscription>;
};

function toStripeId(
  value: string | Stripe.Customer | Stripe.Subscription | Stripe.DeletedCustomer | null | undefined,
): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  return subscription.items.data.reduce<number | null>((latest, item) => (
    latest === null || item.current_period_end > latest ? item.current_period_end : latest
  ), null);
}

async function syncSubscription(
  db: D1Database,
  subscription: Stripe.Subscription,
  eventCreated: number,
  status = subscription.status,
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) return;
  const periodEnd = subscriptionPeriodEnd(subscription);
  await saveSubscription(db, {
    userId,
    stripe_customer_id: toStripeId(subscription.customer),
    stripe_subscription_id: subscription.id,
    status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: status === "canceled" ? 0 : subscription.cancel_at_period_end ? 1 : 0,
    last_event_created_at: eventCreated,
  });
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  if (invoice.parent?.type !== "subscription_details") return null;
  return toStripeId(invoice.parent.subscription_details?.subscription);
}

async function retrieveAndSync(
  db: D1Database,
  subscriptions: StripeSubscriptionReader,
  subscriptionId: string | null,
  eventCreated: number,
): Promise<void> {
  if (!subscriptionId) return;
  const subscription = await subscriptions.retrieve(subscriptionId);
  await syncSubscription(db, subscription, eventCreated);
}

export async function processStripeWebhookEvent(
  db: D1Database,
  subscriptions: StripeSubscriptionReader,
  event: Stripe.Event,
): Promise<{ duplicate: boolean }> {
  if (await hasProcessedStripeEvent(db, event.id)) return { duplicate: true };

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (event.type !== "checkout.session.completed" || session.payment_status !== "unpaid") {
        await retrieveAndSync(db, subscriptions, toStripeId(session.subscription), event.created);
      }
      await deletePendingCheckoutSessionByStripeId(db, session.id);
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await deletePendingCheckoutSessionByStripeId(db, session.id);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
    case "customer.subscription.trial_will_end": {
      const eventSubscription = event.data.object as Stripe.Subscription;
      await retrieveAndSync(db, subscriptions, eventSubscription.id, event.created);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(db, subscription, event.created, "canceled");
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
    case "invoice.finalization_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await retrieveAndSync(db, subscriptions, invoiceSubscriptionId(invoice), event.created);
      break;
    }
    default:
      break;
  }

  await recordProcessedStripeEvent(db, event.id);
  return { duplicate: false };
}
