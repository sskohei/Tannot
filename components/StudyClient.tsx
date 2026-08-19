"use client";

import { useCallback, useEffect, useState } from "react";
import { SpeechButton } from "@/components/SpeechButton";

type Card = { id: string; term: string; translation?: string | null; sentence?: string | null; sentenceSourceId?: string | null; sentenceAuthor?: string | null; sentenceSourceUrl?: string | null };
const labels = { again: "もう一度", hard: "難しい", good: "普通", easy: "簡単" } as const;
type ReviewInterval = { intervalDays: number; intervalMinutes: number | null };
type CardWithIntervals = Card & { reviewIntervals?: Partial<Record<keyof typeof labels, ReviewInterval>> };

function intervalLabel(interval?: ReviewInterval): string {
  if (!interval) return "次回間隔を計算中";
  if (interval.intervalMinutes !== null) return `${interval.intervalMinutes}分後`;
  return `${interval.intervalDays}日後`;
}

export function StudyClient({ bookId }: { bookId: string }) {
  const [card, setCard] = useState<CardWithIntervals | null>(null); const [answer, setAnswer] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (reveal = false) => { setLoading(true); setError(null); const response = await fetch(`/api/study/next?bookId=${encodeURIComponent(bookId)}${reveal ? "&reveal=true" : ""}`); const data = await response.json() as { card?: CardWithIntervals | null; error?: { message?: string } }; if (!response.ok) setError(data.error?.message ?? "カードを読み込めませんでした"); else { setCard(data.card ?? null); setAnswer(reveal); } setLoading(false); }, [bookId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function rate(rating: keyof typeof labels) { if (!card) return; setLoading(true); const response = await fetch("/api/study/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId: card.id, rating, requestId: crypto.randomUUID() }) }); if (!response.ok) { const data = await response.json() as { error?: { message?: string } }; setError(data.error?.message ?? "評価を保存できませんでした"); setLoading(false); return; } await load(); }
  if (error) return <section className="study-card"><p className="error">{error}</p><button className="button" onClick={() => void load()}>再試行</button></section>;
  if (loading && !card) return <p className="muted">学習カードを読み込み中…</p>;
  if (!card) return <section className="study-card"><p className="eyebrow">ALL DONE</p><h2>今日は完了です</h2><p className="muted">復習対象のカードはありません。</p></section>;
  return <section className="study-card pop-shadow"><p className="eyebrow">{answer ? "ANSWER" : "QUESTION"}</p><h2>{card.term}</h2>{!answer ? <><div className="speech-actions"><button className="button" disabled={loading} onClick={() => void load(true)}>解答を見る</button><SpeechButton text={card.term} label="単語を読み上げる" /></div></> : <><p className="answer-copy">{card.translation ?? "訳が登録されていません"}</p><p className="answer-copy">{card.sentence ?? "例文が登録されていません"}</p>{card.sentence && <SpeechButton text={card.sentence} label="例文を読み上げる" />}<div className="rating-grid">{Object.entries(labels).map(([key, label]) => { const rating = key as keyof typeof labels; return <button className="button secondary" disabled={loading} key={key} onClick={() => void rate(rating)}><span>{label}</span><small>{intervalLabel(card.reviewIntervals?.[rating])}</small></button>; })}</div></>}</section>;
}
