"use client";

import { useCallback, useEffect, useState } from "react";

type Card = { id: string; term: string; translation?: string | null; sentence?: string | null; termAudioKey?: string | null; sentenceAudioKey?: string | null; termAudioStatus?: string; sentenceAudioStatus?: string; sentenceSourceId?: string | null; sentenceAuthor?: string | null; sentenceSourceUrl?: string | null };
const labels = { again: "もう一度", hard: "難しい", good: "普通", easy: "簡単" } as const;
export function StudyClient({ bookId }: { bookId: string }) {
  const [card, setCard] = useState<Card | null>(null); const [answer, setAnswer] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (reveal = false) => { setLoading(true); setError(null); const response = await fetch(`/api/study/next?bookId=${encodeURIComponent(bookId)}${reveal ? "&reveal=true" : ""}`); const data = await response.json() as { card?: Card | null; error?: { message?: string } }; if (!response.ok) setError(data.error?.message ?? "カードを読み込めませんでした"); else { setCard(data.card ?? null); setAnswer(reveal); } setLoading(false); }, [bookId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function rate(rating: keyof typeof labels) { if (!card) return; setLoading(true); const response = await fetch("/api/study/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId: card.id, rating, requestId: crypto.randomUUID() }) }); if (!response.ok) { const data = await response.json() as { error?: { message?: string } }; setError(data.error?.message ?? "評価を保存できませんでした"); setLoading(false); return; } await load(); }
  if (error) return <section className="study-card"><p className="error">{error}</p><button className="button" onClick={() => void load()}>再試行</button></section>;
  if (loading && !card) return <p className="muted">学習カードを読み込み中…</p>;
  if (!card) return <section className="study-card"><h2>今日は完了です</h2><p className="muted">復習対象のカードはありません。</p></section>;
  return <section className="study-card"><p className="muted">{answer ? "解答" : "問題"}</p><h2>{card.term}</h2>{!answer ? <><button className="button" disabled={loading} onClick={() => void load(true)}>解答を見る</button>{card.termAudioStatus === "ready" && card.termAudioKey && <audio controls src={`/api/audio/${card.termAudioKey}`} />}</> : <><p>{card.translation ?? "訳が登録されていません"}</p><p>{card.sentence ?? "例文が登録されていません"}</p>{card.sentenceAudioStatus === "ready" && card.sentenceAudioKey && <audio controls src={`/api/audio/${card.sentenceAudioKey}`} />}<div className="rating-grid">{Object.entries(labels).map(([key, label]) => <button className="button secondary" disabled={loading} key={key} onClick={() => void rate(key as keyof typeof labels)}>{label}</button>)}</div></>}</section>;
}
