"use client";

import { FormEvent, useState } from "react";

export type EditableCardData = {
  id: string;
  term: string;
  translation: string | null;
  sentence: string | null;
  sentence_source_url: string | null;
  error_message: string | null;
};

export function EditableCard({ bookId, card, onUpdated, onDeleted }: {
  bookId: string;
  card: EditableCardData;
  onUpdated: (card: EditableCardData) => void;
  onDeleted: (cardId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [term, setTerm] = useState(card.term);
  const [translation, setTranslation] = useState(card.translation ?? "");
  const [sentence, setSentence] = useState(card.sentence ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTerm(card.term);
    setTranslation(card.translation ?? "");
    setSentence(card.sentence ?? "");
    setError(null);
    setEditing(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, translation, sentence }),
      });
      const data = await response.json() as { card?: EditableCardData; error?: { message?: string } };
      if (!response.ok || !data.card) throw new Error(data.error?.message ?? "カードを更新できませんでした");
      onUpdated(data.card);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "カードを更新できませんでした");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!window.confirm(`「${card.term}」を削除しますか？ 学習履歴も削除されます。`)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}/cards/${card.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "カードを削除できませんでした");
      }
      onDeleted(card.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "カードを削除できませんでした");
      setLoading(false);
    }
  }

  if (editing) return <article className="panel editable-card">
    <form className="stack" onSubmit={save}>
      <label>英単語・熟語<input required maxLength={100} value={term} onChange={(event) => setTerm(event.target.value)} /></label>
      <label>日本語訳<textarea className="compact-textarea" maxLength={2000} value={translation} onChange={(event) => setTranslation(event.target.value)} /></label>
      <label>例文<textarea className="compact-textarea" maxLength={2000} value={sentence} onChange={(event) => setSentence(event.target.value)} /></label>
      <p className="form-note">編集すると、元の辞書・例文への出典情報はカードから外れます。</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><button className="button" disabled={loading}>{loading ? "保存中…" : "保存"}</button><button className="button secondary" type="button" onClick={reset} disabled={loading}>キャンセル</button></div>
    </form>
  </article>;

  return <article className="panel editable-card">
    <div className="card-copy"><h2>{card.term}</h2><p>{card.translation ?? "訳が設定されていません"}</p><p className="muted">{card.sentence ?? "例文が設定されていません"}</p></div>
    {card.sentence_source_url && <p className="form-note"><a href={card.sentence_source_url} target="_blank" rel="noopener noreferrer">例文の出典を見る</a></p>}
    {card.error_message && <p className="error">{card.error_message}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions card-actions"><button className="button secondary" type="button" onClick={() => setEditing(true)} disabled={loading}>編集</button><button className="button danger secondary-danger" type="button" onClick={() => void remove()} disabled={loading}>削除</button></div>
  </article>;
}
