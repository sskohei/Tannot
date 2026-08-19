"use client";

import { FormEvent, useState } from "react";

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

  async function submit(event: FormEvent) {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "単語を追加できませんでした");
    } finally {
      setLoading(false);
    }
  }

  return <form className="panel pop-shadow stack" onSubmit={submit}>
    <div className="form-header"><div><p className="eyebrow">ADD WORDS</p><h2>{bookTitle}に単語を追加</h2></div><span className="badge">最大100語</span></div>
    <p className="form-note">改行またはカンマ区切りで入力してください。すでに登録されている単語はスキップします。</p>
    <label>英単語・熟語リスト<textarea required value={input} onChange={(event) => setInput(event.target.value)} placeholder={"review\nmake progress"} /></label>
    {error && <p className="error">{error}</p>}
    <div className="actions"><button className="button" disabled={loading}>{loading ? "追加中…" : "単語を追加"}</button><button className="button secondary" type="button" onClick={onCancel} disabled={loading}>キャンセル</button></div>
  </form>;
}
