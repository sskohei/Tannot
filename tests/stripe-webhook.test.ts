import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { processStripeWebhookEvent, type StripeSubscriptionReader } from "@/server/billing";

function subscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_123",
    object: "subscription",
    status: "active",
    customer: "cus_123",
    metadata: { userId: "user-1" },
    cancel_at_period_end: false,
    items: { data: [{ current_period_end: 1_800_000_000 }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function event(type: Stripe.Event.Type, object: unknown, id = `evt_${type}`): Stripe.Event {
  return {
    id,
    object: "event",
    type,
    created: 1_700_000_000,
    data: { object },
  } as Stripe.Event;
}

function createWebhookDb() {
  const processed = new Set<string>();
  const subscriptions: unknown[][] = [];
  const deletedCheckoutSessions: string[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            first: async <T>() => (
              sql.startsWith("SELECT event_id") && processed.has(String(values[0]))
                ? { event_id: String(values[0]) } as T
                : null
            ),
            run: async () => {
              if (sql.startsWith("INSERT OR IGNORE INTO stripe_events")) processed.add(String(values[0]));
              if (sql.startsWith("INSERT INTO subscriptions")) subscriptions.push(values);
              if (sql.startsWith("DELETE FROM billing_checkout_sessions")) deletedCheckoutSessions.push(String(values[0]));
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, processed, subscriptions, deletedCheckoutSessions };
}

describe("Stripe webhook processing", () => {
  it("records an event only after successful processing so a failed event can be retried", async () => {
    const state = createWebhookDb();
    let attempts = 0;
    const reader: StripeSubscriptionReader = {
      async retrieve() {
        attempts += 1;
        if (attempts === 1) throw new Error("temporary Stripe failure");
        return subscription();
      },
    };
    const input = event("customer.subscription.updated", subscription(), "evt_retry");

    await expect(processStripeWebhookEvent(state.db, reader, input)).rejects.toThrow("temporary Stripe failure");
    expect(state.processed.has("evt_retry")).toBe(false);

    await expect(processStripeWebhookEvent(state.db, reader, input)).resolves.toEqual({ duplicate: false });
    expect(state.processed.has("evt_retry")).toBe(true);
    expect(state.subscriptions).toHaveLength(1);
  });

  it("does not process the same event twice", async () => {
    const state = createWebhookDb();
    const reader: StripeSubscriptionReader = { retrieve: async () => subscription() };
    const input = event("customer.subscription.updated", subscription(), "evt_duplicate");

    await processStripeWebhookEvent(state.db, reader, input);
    await expect(processStripeWebhookEvent(state.db, reader, input)).resolves.toEqual({ duplicate: true });
    expect(state.subscriptions).toHaveLength(1);
  });

  it("syncs invoice payment failures from the invoice parent subscription", async () => {
    const state = createWebhookDb();
    const requested: string[] = [];
    const reader: StripeSubscriptionReader = {
      async retrieve(id) {
        requested.push(id);
        return subscription({ status: "past_due" });
      },
    };
    const invoice = {
      parent: { type: "subscription_details", subscription_details: { subscription: "sub_invoice" } },
    } as Stripe.Invoice;

    await processStripeWebhookEvent(state.db, reader, event("invoice.payment_failed", invoice));

    expect(requested).toEqual(["sub_invoice"]);
    expect(state.subscriptions[0][3]).toBe("past_due");
  });

  it("does not grant premium access for an unpaid completed Checkout Session", async () => {
    const state = createWebhookDb();
    let retrieveCount = 0;
    const reader: StripeSubscriptionReader = {
      async retrieve() {
        retrieveCount += 1;
        return subscription();
      },
    };
    const session = { id: "cs_unpaid", payment_status: "unpaid", subscription: "sub_unpaid" } as Stripe.Checkout.Session;

    await processStripeWebhookEvent(state.db, reader, event("checkout.session.completed", session));

    expect(retrieveCount).toBe(0);
    expect(state.subscriptions).toHaveLength(0);
    expect(state.deletedCheckoutSessions).toEqual(["cs_unpaid"]);
  });

  it("syncs asynchronous Checkout success and clears the pending session", async () => {
    const state = createWebhookDb();
    const reader: StripeSubscriptionReader = { retrieve: async () => subscription({ status: "trialing" }) };
    const session = { id: "cs_async", payment_status: "paid", subscription: "sub_async" } as Stripe.Checkout.Session;

    await processStripeWebhookEvent(state.db, reader, event("checkout.session.async_payment_succeeded", session));

    expect(state.subscriptions[0][3]).toBe("trialing");
    expect(state.deletedCheckoutSessions).toEqual(["cs_async"]);
  });

  it("stores a deleted subscription as canceled without retrieving it again", async () => {
    const state = createWebhookDb();
    let retrieveCount = 0;
    const reader: StripeSubscriptionReader = {
      async retrieve() {
        retrieveCount += 1;
        return subscription();
      },
    };

    await processStripeWebhookEvent(
      state.db,
      reader,
      event("customer.subscription.deleted", subscription({ cancel_at_period_end: true })),
    );

    expect(retrieveCount).toBe(0);
    expect(state.subscriptions[0][3]).toBe("canceled");
    expect(state.subscriptions[0][5]).toBe(0);
  });
});
