import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import Stripe from "stripe";
import { isPremiumStatus, isWithinFreeCardLimit } from "@/lib/billing";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/policies";
import { calculateReview } from "@/lib/review";
import { normalizeTerm, parseCardCopy, parseCardTerm, parseRating, parseRequestId, parseTerms, parseTitle } from "@/lib/validation";
import type { Bindings } from "@/lib/types";
import { createAuth, getEnvValue } from "@/server/auth";
import { processStripeWebhookEvent } from "@/server/billing";
import { findLookupResults } from "@/server/lookup-data";
import {
  addCards,
  countUserBooks,
  createBook,
  deleteCard,
  deleteUserData,
  deleteBook,
  ensureUser,
  exportUserData,
  findPendingCheckoutSession,
  findPolicyAcceptance,
  findStudyCard,
  findSubscription,
  getBook,
  latestReview,
  listBooks,
  recordPolicyAcceptance,
  claimPendingCheckoutSession,
  releasePendingCheckoutSession,
  savePendingCheckoutSession,
  saveReview,
  updateBookTitle,
  updateCard,
} from "@/server/db";
import { jsonError, toErrorResponse } from "@/server/errors";

type Variables = { user: { id: string; email: string; name: string } };
export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.onError((error) => toErrorResponse(error));

app.all("/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
}

function checkoutIntegrationIdentifier(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const random = crypto.getRandomValues(new Uint8Array(8));
  return `tannot_checkout_${Array.from(random, (value) => alphabet[value % alphabet.length]).join("")}`;
}

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
  const policyAcceptance = await findPolicyAcceptance(c.env.DB, user.id);
  const limit = Number(c.env.FREE_BOOK_LIMIT ?? 3);
  return c.json({
    user,
    usage: { books: bookCount, freeBookLimit: limit },
    subscription,
    policyAcceptance,
    currentPolicies: { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION },
  });
});

app.post("/api/account/consent", async (c) => {
  const user = await requireUser(c);
  const body = await c.req.json<{ termsAccepted?: unknown; eligibilityAccepted?: unknown }>()
    .catch((): { termsAccepted?: unknown; eligibilityAccepted?: unknown } => ({}));
  if (body.termsAccepted !== true) return jsonError("TERMS_REQUIRED", "利用規約とプライバシーポリシーへの同意が必要です", 400);
  if (body.eligibilityAccepted !== true) {
    return jsonError("ELIGIBILITY_REQUIRED", "13歳以上であることと、未成年の場合は保護者の同意が必要です", 400);
  }
  await recordPolicyAcceptance(c.env.DB, user.id, {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    confirmEligibility: true,
  });
  return c.json({ accepted: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION });
});

app.post("/api/books/preview", async (c) => {
  const user = await requireUser(c);
  const body = await c.req.json<{ title?: unknown; input?: unknown }>();
  const title = parseTitle(body.title);
  const terms = parseTerms(body.input);
  const freeLimit = Number(c.env.FREE_BOOK_LIMIT ?? 3);
  const subscription = await findSubscription(c.env.DB, user.id);
  const isPaid = isPremiumStatus(subscription?.status);
  if (!isPaid && (await countUserBooks(c.env.DB, user.id)) >= freeLimit) {
    return jsonError("QUOTA_EXCEEDED", "無料利用枠を超えています", 429);
  }
  const freeCardLimit = Number(c.env.FREE_CARDS_PER_BOOK_LIMIT ?? 100);
  if (!isPaid && !isWithinFreeCardLimit(0, terms.length, freeCardLimit)) {
    return jsonError("QUOTA_EXCEEDED", `無料プランでは単語帳1つにつき${freeCardLimit}枚までです`, 429);
  }

  const normalizedTerms = terms.map(normalizeTerm);
  const results = await findLookupResults(c.env.ASSETS, c.req.url, normalizedTerms);
  return c.json({
    title,
    cards: terms.map((term, index) => ({
      term,
      translation: results[index].translation,
      sentence: results[index].sentence,
    })),
  });
});

app.post("/api/books", async (c) => {
  const user = await requireUser(c);
  const body = await c.req.json<{ title?: unknown; input?: unknown }>();
  const title = parseTitle(body.title);
  const terms = parseTerms(body.input);
  const freeLimit = Number(c.env.FREE_BOOK_LIMIT ?? 3);
  const subscription = await findSubscription(c.env.DB, user.id);
  const isPaid = isPremiumStatus(subscription?.status);
  if (!isPaid && (await countUserBooks(c.env.DB, user.id)) >= freeLimit) {
    return jsonError("QUOTA_EXCEEDED", "無料利用枠を超えています", 429);
  }
  const freeCardLimit = Number(c.env.FREE_CARDS_PER_BOOK_LIMIT ?? 100);
  if (!isPaid && !isWithinFreeCardLimit(0, terms.length, freeCardLimit)) {
    return jsonError("QUOTA_EXCEEDED", `無料プランでは単語帳1つにつき${freeCardLimit}枚までです`, 429);
  }

  const normalizedTerms = terms.map(normalizeTerm);
  const results = await findLookupResults(c.env.ASSETS, c.req.url, normalizedTerms);
  const cards = terms.map((term, index) => ({
    term,
    normalizedTerm: normalizedTerms[index],
    result: results[index],
  }));
  const book = await createBook(c.env.DB, user.id, title, cards);
  return c.json({ book, cards: cards.map((card) => ({ term: card.term, ...card.result })) }, 201);
});

app.get("/api/books", async (c) => {
  const user = await requireUser(c);
  return c.json({ books: await listBooks(c.env.DB, user.id) });
});

app.get("/api/study/summary", async (c) => {
  const user = await requireUser(c);
  const books = await listBooks(c.env.DB, user.id);
  return c.json({
    totalDue: books.reduce((total, book) => total + Number(book.due_count), 0),
    totalCards: books.reduce((total, book) => total + Number(book.card_count), 0),
    books,
  });
});

app.post("/api/books/:bookId/cards", async (c) => {
  const user = await requireUser(c);
  const bookId = c.req.param("bookId");
  const book = await getBook(c.env.DB, user.id, bookId);
  if (!book) return jsonError("NOT_FOUND", "単語帳が見つかりません", 404);

  const body = await c.req.json<{ input?: unknown }>();
  const terms = parseTerms(body.input);
  const normalizedTerms = terms.map(normalizeTerm);
  const subscription = await findSubscription(c.env.DB, user.id);
  if (!isPremiumStatus(subscription?.status)) {
    const freeCardLimit = Number(c.env.FREE_CARDS_PER_BOOK_LIMIT ?? 100);
    const existingTerms = new Set(book.cards.map((card) => card.normalized_term));
    const additions = normalizedTerms.filter((term) => !existingTerms.has(term));
    if (!isWithinFreeCardLimit(book.cards.length, additions.length, freeCardLimit)) {
      return jsonError("QUOTA_EXCEEDED", `無料プランでは単語帳1つにつき${freeCardLimit}枚までです`, 429);
    }
  }
  const results = await findLookupResults(c.env.ASSETS, c.req.url, normalizedTerms);
  const added = await addCards(c.env.DB, user.id, bookId, terms.map((term, index) => ({
    term,
    normalizedTerm: normalizedTerms[index],
    result: results[index],
  })));
  if (!added) return jsonError("NOT_FOUND", "単語帳が見つかりません", 404);
  return c.json({ book: added.book, cards: added.addedCards, skippedTerms: added.skippedTerms }, 201);
});

app.post("/api/books/:bookId/cards/preview", async (c) => {
  const user = await requireUser(c);
  const book = await getBook(c.env.DB, user.id, c.req.param("bookId"));
  if (!book) return jsonError("NOT_FOUND", "単語帳が見つかりません", 404);

  const body = await c.req.json<{ input?: unknown }>();
  const terms = parseTerms(body.input);
  const normalizedTerms = terms.map(normalizeTerm);
  const subscription = await findSubscription(c.env.DB, user.id);
  if (!isPremiumStatus(subscription?.status)) {
    const freeCardLimit = Number(c.env.FREE_CARDS_PER_BOOK_LIMIT ?? 100);
    const existingTerms = new Set(book.cards.map((card) => card.normalized_term));
    const additions = normalizedTerms.filter((term) => !existingTerms.has(term));
    if (!isWithinFreeCardLimit(book.cards.length, additions.length, freeCardLimit)) {
      return jsonError("QUOTA_EXCEEDED", `無料プランでは単語帳1つにつき${freeCardLimit}枚までです`, 429);
    }
  }
  const results = await findLookupResults(c.env.ASSETS, c.req.url, normalizedTerms);
  const existingTerms = new Set(book.cards.map((card) => card.normalized_term));

  return c.json({
    cards: terms.map((term, index) => ({
      term,
      translation: results[index].translation,
      sentence: results[index].sentence,
      existing: existingTerms.has(normalizedTerms[index]),
    })),
  });
});

app.get("/api/books/:bookId", async (c) => {
  const user = await requireUser(c);
  const book = await getBook(c.env.DB, user.id, c.req.param("bookId"));
  if (!book) return jsonError("NOT_FOUND", "単語帳が見つかりません", 404);
  return c.json({ book });
});

app.patch("/api/books/:bookId", async (c) => {
  const user = await requireUser(c);
  const body = await c.req.json<{ title?: unknown }>();
  const book = await updateBookTitle(c.env.DB, user.id, c.req.param("bookId"), parseTitle(body.title));
  if (!book) return jsonError("NOT_FOUND", "単語帳が見つかりません", 404);
  return c.json({ book });
});

app.patch("/api/books/:bookId/cards/:cardId", async (c) => {
  const user = await requireUser(c);
  const body = await c.req.json<{ term?: unknown; translation?: unknown; sentence?: unknown }>();
  const term = parseCardTerm(body.term);
  const updated = await updateCard(c.env.DB, user.id, c.req.param("bookId"), c.req.param("cardId"), {
    term,
    normalizedTerm: normalizeTerm(term),
    translation: parseCardCopy(body.translation, "日本語訳"),
    sentence: parseCardCopy(body.sentence, "例文"),
  });
  if (updated.duplicate) return jsonError("DUPLICATE_TERM", "同じ単語がこの単語帳に登録されています", 409);
  if (!updated.card) return jsonError("NOT_FOUND", "学習カードが見つかりません", 404);
  return c.json({ card: updated.card });
});

app.delete("/api/books/:bookId/cards/:cardId", async (c) => {
  const user = await requireUser(c);
  const deleted = await deleteCard(c.env.DB, user.id, c.req.param("bookId"), c.req.param("cardId"));
  if (!deleted) return jsonError("NOT_FOUND", "学習カードが見つかりません", 404);
  return c.body(null, 204);
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
  const previous = await latestReview(c.env.DB, user.id, cardId);
  const now = new Date();
  const state = calculateReview(rating, previous, now);
  const saved = await saveReview(c.env.DB, user.id, cardId, requestId, {
    rating,
    reviewedAt: now.toISOString(),
    dueAt: state.dueAt.toISOString(),
    intervalDays: state.intervalDays,
    state: state.state,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsedDays: state.elapsedDays,
    learningSteps: state.learningSteps,
    lapses: state.lapses,
    repetitions: state.repetitions,
  });
  if (!saved) return jsonError("NOT_FOUND", "学習カードが見つかりません", 404);
  return c.json({ reviewId: saved.id, duplicate: saved.duplicate, nextDueAt: state.dueAt.toISOString() }, saved.duplicate ? 200 : 201);
});

app.post("/api/billing/checkout", async (c) => {
  const user = await requireUser(c);
  const stripeSecretKey = getEnvValue(c.env, "STRIPE_SECRET_KEY");
  const stripePriceId = getEnvValue(c.env, "STRIPE_PRICE_ID");
  const appUrl = getEnvValue(c.env, "BETTER_AUTH_URL");
  if (!stripeSecretKey || !stripePriceId || !appUrl) return jsonError("BILLING_NOT_CONFIGURED", "決済機能はまだ設定されていません", 503);
  const body = await c.req.json<{ termsAccepted?: unknown; eligibilityAccepted?: unknown }>()
    .catch((): { termsAccepted?: unknown; eligibilityAccepted?: unknown } => ({}));
  if (body.termsAccepted !== true) return jsonError("TERMS_REQUIRED", "利用規約とプライバシーポリシーへの同意が必要です", 400);
  if (body.eligibilityAccepted !== true) {
    return jsonError("ELIGIBILITY_REQUIRED", "13歳以上であることと、未成年の場合は保護者の同意が必要です", 400);
  }
  const existingSubscription = await findSubscription(c.env.DB, user.id);
  if (isPremiumStatus(existingSubscription?.status)) return jsonError("ALREADY_SUBSCRIBED", "すでにプレミアムプランをご利用中です", 409);
  await recordPolicyAcceptance(c.env.DB, user.id, {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    confirmEligibility: true,
  });

  const now = new Date();
  const pendingSession = await findPendingCheckoutSession(c.env.DB, user.id, now.toISOString());
  if (pendingSession?.checkout_url) return c.json({ url: pendingSession.checkout_url, reused: true });
  if (pendingSession) return jsonError("CHECKOUT_IN_PROGRESS", "決済画面を準備しています。少し待って再度お試しください", 409);

  const requestToken = crypto.randomUUID();
  const lockExpiresAt = new Date(now.getTime() + 2 * 60 * 1000).toISOString();
  const claimed = await claimPendingCheckoutSession(c.env.DB, {
    userId: user.id,
    requestToken,
    expiresAt: lockExpiresAt,
    now: now.toISOString(),
  });
  if (!claimed) return jsonError("CHECKOUT_IN_PROGRESS", "決済画面を準備しています。少し待って再度お試しください", 409);

  const stripe = createStripeClient(stripeSecretKey);
  const checkoutExpiresAt = Math.floor(now.getTime() / 1000) + 31 * 60;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      integration_identifier: checkoutIntegrationIdentifier(),
      line_items: [{ price: stripePriceId, quantity: 1 }],
      ...(existingSubscription?.stripe_customer_id ? { customer: existingSubscription.stripe_customer_id } : { customer_email: user.email }),
      client_reference_id: user.id,
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancelled`,
      expires_at: checkoutExpiresAt,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id }, trial_period_days: 7 },
    }, { idempotencyKey: `checkout:${user.id}:${requestToken}` });
    if (!session.url) throw new Error("Stripe Checkout session did not include a URL");
    const saved = await savePendingCheckoutSession(c.env.DB, {
      userId: user.id,
      requestToken,
      sessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: new Date(checkoutExpiresAt * 1000).toISOString(),
    });
    if (!saved) throw new Error("Checkout session claim was lost before it could be saved");
    return c.json({ url: session.url, reused: false });
  } catch (error) {
    await releasePendingCheckoutSession(c.env.DB, user.id, requestToken);
    throw error;
  }
});

app.post("/api/billing/portal", async (c) => {
  const user = await requireUser(c);
  const stripeSecretKey = getEnvValue(c.env, "STRIPE_SECRET_KEY");
  const appUrl = getEnvValue(c.env, "BETTER_AUTH_URL");
  if (!stripeSecretKey || !appUrl) return jsonError("BILLING_NOT_CONFIGURED", "決済機能はまだ設定されていません", 503);
  const subscription = await findSubscription(c.env.DB, user.id);
  if (!subscription?.stripe_customer_id) return jsonError("BILLING_NOT_FOUND", "管理できる契約がありません", 404);
  const stripe = createStripeClient(stripeSecretKey);
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  });
  return c.json({ url: session.url });
});

app.get("/api/account/export", async (c) => {
  const user = await requireUser(c);
  return c.json(await exportUserData(c.env.DB, user.id), 200, {
    "Content-Disposition": `attachment; filename="tannot-data-${new Date().toISOString().slice(0, 10)}.json"`,
  });
});

app.delete("/api/account", async (c) => {
  const user = await requireUser(c);
  const subscription = await findSubscription(c.env.DB, user.id);
  if (isPremiumStatus(subscription?.status)) {
    return jsonError("ACTIVE_SUBSCRIPTION", "プレミアムプランを解約し、利用期間が終了してからアカウントを削除してください", 409);
  }
  await deleteUserData(c.env.DB, user.id);
  return c.body(null, 204);
});

app.post("/api/billing/webhook", async (c) => {
  const stripeSecretKey = getEnvValue(c.env, "STRIPE_SECRET_KEY");
  const stripeWebhookSecret = getEnvValue(c.env, "STRIPE_WEBHOOK_SECRET");
  if (!stripeSecretKey || !stripeWebhookSecret) return jsonError("BILLING_NOT_CONFIGURED", "決済機能はまだ設定されていません", 503);
  const signature = c.req.header("stripe-signature");
  if (!signature) return jsonError("INVALID_SIGNATURE", "署名がありません", 400);
  const rawBody = await c.req.text();
  const stripe = createStripeClient(stripeSecretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch {
    return jsonError("INVALID_SIGNATURE", "webhookの署名を検証できません", 400);
  }
  try {
    const result = await processStripeWebhookEvent(c.env.DB, stripe.subscriptions, event);
    return c.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    console.error("stripe_webhook_failed", {
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "unknown error",
    });
    throw error;
  }
});

app.get("/health", (c) => c.json({ ok: true }));
