import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import Stripe from "stripe";
import { calculateReview } from "@/lib/review";
import { normalizeTerm, parseRating, parseRequestId, parseTerms, parseTitle } from "@/lib/validation";
import type { Bindings } from "@/lib/types";
import { createAuth } from "@/server/auth";
import {
  countUserBooks,
  createBook,
  deleteBook,
  ensureUser,
  findDictionaryResult,
  findAudioText,
  findStudyCard,
  findSubscription,
  getBook,
  latestReview,
  listBooks,
  saveReview,
} from "@/server/db";
import { jsonError, toErrorResponse } from "@/server/errors";

type Variables = { user: { id: string; email: string; name: string } };
export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.onError((error) => toErrorResponse(error));

app.all("/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

async function requireUser(c: AppContext) {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HTTPException(401, { res: jsonError("UNAUTHENTICATED", "ログインが必要です", 401) });
  const user = { id: session.user.id, email: session.user.email, name: session.user.name };
  await ensureUser(c.env.DB, user);
  c.set("user", user);
  return user;
}

app.get("/api/me", async (c) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ user: null });
  const user = { id: session.user.id, email: session.user.email, name: session.user.name };
  await ensureUser(c.env.DB, user);
  const bookCount = await countUserBooks(c.env.DB, user.id);
  const subscription = await findSubscription(c.env.DB, user.id);
  const limit = Number(c.env.FREE_BOOK_LIMIT ?? 3);
  return c.json({ user, usage: { books: bookCount, freeBookLimit: limit }, subscription });
});

app.post("/api/books", async (c) => {
  const user = await requireUser(c);
  const body = await c.req.json<{ title?: unknown; input?: unknown }>();
  const title = parseTitle(body.title);
  const terms = parseTerms(body.input);
  const freeLimit = Number(c.env.FREE_BOOK_LIMIT ?? 3);
  const subscription = await findSubscription(c.env.DB, user.id);
  const isPaid = subscription?.status === "active" || subscription?.status === "trialing";
  if (!isPaid && (await countUserBooks(c.env.DB, user.id)) >= freeLimit) {
    return jsonError("QUOTA_EXCEEDED", "無料利用枠を超えています", 429);
  }

  const cards = await Promise.all(terms.map(async (term) => {
    const normalizedTerm = normalizeTerm(term);
    return {
      term,
      normalizedTerm,
      result: await findDictionaryResult(c.env.DB, normalizedTerm),
    };
  }));
  const book = await createBook(c.env.DB, user.id, title, cards);
  return c.json({ book, cards: cards.map((card) => ({ term: card.term, ...card.result })) }, 201);
});

app.get("/api/books", async (c) => {
  const user = await requireUser(c);
  return c.json({ books: await listBooks(c.env.DB, user.id) });
});

app.get("/api/books/:bookId", async (c) => {
  const user = await requireUser(c);
  const book = await getBook(c.env.DB, user.id, c.req.param("bookId"));
  if (!book) return jsonError("NOT_FOUND", "単語帳が見つかりません", 404);
  return c.json({ book });
});

app.delete("/api/books/:bookId", async (c) => {
  const user = await requireUser(c);
  const deleted = await deleteBook(c.env.DB, user.id, c.req.param("bookId"));
  if (!deleted) return jsonError("NOT_FOUND", "単語帳が見つかりません", 404);
  return c.body(null, 204);
});

app.get("/api/study/next", async (c) => {
  const user = await requireUser(c);
  const bookId = c.req.query("bookId");
  if (!bookId) return jsonError("VALIDATION_ERROR", "bookIdが必要です", 400);
  const reveal = c.req.query("reveal") === "true";
  const card = await findStudyCard(c.env.DB, user.id, bookId, reveal);
  return c.json({ card });
});

app.post("/api/study/reviews", async (c) => {
  const user = await requireUser(c);
  const body = await c.req.json<{ cardId?: unknown; rating?: unknown; requestId?: unknown }>();
  const cardId = typeof body.cardId === "string" ? body.cardId : "";
  if (!cardId) return jsonError("VALIDATION_ERROR", "cardIdが必要です", 400);
  const rating = parseRating(body.rating);
  const requestId = parseRequestId(body.requestId);
  const previous = (await latestReview(c.env.DB, user.id, cardId)) ?? { intervalDays: 0, easeFactor: 2.5, repetitions: 0 };
  const now = new Date();
  const state = calculateReview(rating, previous, now);
  const saved = await saveReview(c.env.DB, user.id, cardId, requestId, {
    rating,
    reviewedAt: now.toISOString(),
    dueAt: state.dueAt.toISOString(),
    intervalDays: state.intervalDays,
    easeFactor: state.easeFactor,
    repetitions: state.repetitions,
  });
  if (!saved) return jsonError("NOT_FOUND", "学習カードが見つかりません", 404);
  return c.json({ reviewId: saved.id, duplicate: saved.duplicate, nextDueAt: state.dueAt.toISOString() }, saved.duplicate ? 200 : 201);
});

app.post("/api/billing/checkout", async (c) => {
  const user = await requireUser(c);
  if (!c.env.STRIPE_SECRET_KEY || !c.env.STRIPE_PRICE_ID) return jsonError("BILLING_NOT_CONFIGURED", "決済機能はまだ設定されていません", 503);
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: c.env.STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: user.email,
    success_url: `${c.env.BETTER_AUTH_URL}/settings?billing=success`,
    cancel_url: `${c.env.BETTER_AUTH_URL}/settings?billing=cancelled`,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  });
  return c.json({ url: session.url });
});

app.post("/api/billing/webhook", async (c) => {
  if (!c.env.STRIPE_SECRET_KEY || !c.env.STRIPE_WEBHOOK_SECRET) return jsonError("BILLING_NOT_CONFIGURED", "決済機能はまだ設定されていません", 503);
  const signature = c.req.header("stripe-signature");
  if (!signature) return jsonError("INVALID_SIGNATURE", "署名がありません", 400);
  const rawBody = await c.req.text();
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, c.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return jsonError("INVALID_SIGNATURE", "webhookの署名を検証できません", 400);
  }
  const inserted = await c.env.DB.prepare("INSERT OR IGNORE INTO stripe_events (event_id) VALUES (?)").bind(event.id).run();
  if (inserted.meta.changes === 0) return c.json({ received: true, duplicate: true });

  const object = event.data.object as unknown as { metadata?: { userId?: string }; customer?: string; subscription?: string; status?: string; current_period_end?: number };
  const userId = object.metadata?.userId;
  if (userId && ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    const status = event.type === "customer.subscription.deleted" ? "canceled" : object.status ?? "active";
    await c.env.DB.prepare(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id, status = excluded.status,
       current_period_end = excluded.current_period_end`,
    ).bind(userId, object.customer ?? null, object.subscription ?? null, status, object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null).run();
  }
  return c.json({ received: true });
});

const audioHandler = async (c: AppContext) => {
  const user = await requireUser(c);
  const cardId = c.req.param("cardId");
  const kind = c.req.param("kind");
  if (!cardId || (kind !== "term" && kind !== "sentence")) return jsonError("NOT_FOUND", "音声が見つかりません", 404);
  if (!c.env.AUDIO_GENERATOR_URL) return jsonError("AUDIO_NOT_CONFIGURED", "音声機能はまだ設定されていません", 503);

  const text = await findAudioText(c.env.DB, user.id, cardId, kind);
  if (!text) return jsonError("NOT_FOUND", "音声が見つかりません", 404);

  try {
    const response = await fetch(c.env.AUDIO_GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "en", modelVersion: "v1" }),
    });
    if (!response.ok) {
      console.error("audio_generator_failed", response.status);
      return jsonError("AUDIO_GENERATION_FAILED", "音声を生成できませんでした", 502);
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type")?.startsWith("audio/") ? response.headers.get("Content-Type")! : "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("audio_generator_unreachable", error instanceof Error ? error.message : "unknown error");
    return jsonError("AUDIO_GENERATION_FAILED", "音声を生成できませんでした", 502);
  }
};

app.get("/api/audio/:cardId/:kind", audioHandler);

app.get("/health", (c) => c.json({ ok: true }));
