"use client";

import { FormEvent, useState } from "react";

type PreviewCard = {
  term: string;
  translation: string | null;
  sentence: string | null;
  existing: boolean;
};

export function AddCardsForm({
  bookId,
  bookTitle,
  onCancel,
  onAdded,
}: {
  bookId: string;
  bookTitle: string;
  onCancel: () => void;
  onAdded: (addedCount: number, skippedTerms: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewCard[] | null>(null);

  async function previewCards(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}/cards/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await response.json() as { cards?: PreviewCard[]; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "訳と例文を確認できませんでした");
      setPreview(data.cards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "訳と例文を確認できませんでした");
    } finally {
      setLoading(false);
    }
  }

  async function addCards(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await response.json() as { cards?: unknown[]; error?: { message?: string }; skippedTerms?: string[] };
      if (!response.ok) throw new Error(data.error?.message ?? "単語を追加できませんでした");
      onAdded(data.cards?.length ?? 0, data.skippedTerms ?? []);
      setInput("");
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "単語を追加できませんでした");
    } finally {
      setLoading(false);
    }
  }

  return <form className="panel pop-shadow stack" onSubmit={preview ? addCards : previewCards}>
    <div className="form-header"><div><p className="eyebrow">ADD WORDS</p><h2>{bookTitle}に単語を追加</h2></div><span className="badge">最大100語</span></div>
    {!preview ? <>
      <p className="form-note">改行またはカンマ区切りで入力してください。訳と例文を確認してから追加できます。</p>
      <label>英単語・熟語リスト<textarea required value={input} onChange={(event) => setInput(event.target.value)} placeholder={"review\nmake progress"} /></label>
    </> : <section className="preview-list" aria-live="polite">
      <div><h3>追加内容を確認</h3><p className="form-note">日本語訳と例文が正しければ、追加ボタンを押してください。</p></div>
      {preview.map((card) => <article className="preview-card" key={card.term}>
        <div className="preview-card-header"><h4>{card.term}</h4>{card.existing && <span className="badge">登録済み・スキップ</span>}</div>
        <dl>
          <div><dt>日本語訳</dt><dd>{card.translation ?? "見つかりませんでした"}</dd></div>
          <div><dt>例文</dt><dd>{card.sentence ?? "見つかりませんでした"}</dd></div>
        </dl>
      </article>)}
    </section>}
    {error && <p className="error">{error}</p>}
    <div className="actions"><button className="button" disabled={loading}>{loading ? (preview ? "追加中…" : "確認中…") : (preview ? "この内容で追加" : "訳・例文を確認")}</button>{preview && <button className="button secondary" type="button" onClick={() => { setPreview(null); setError(null); }} disabled={loading}>入力を修正</button>}<button className="button secondary" type="button" onClick={onCancel} disabled={loading}>キャンセル</button></div>
  </form>;
}
