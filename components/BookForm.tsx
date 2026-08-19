"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LookupPreviewTable, type LookupPreviewItem } from "@/components/LookupPreviewTable";

export function BookForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<LookupPreviewItem[] | null>(null);

  async function previewCards(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/books/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, input }) });
      const data = await response.json() as { error?: { message?: string }; cards?: LookupPreviewItem[] };
      if (!response.ok) throw new Error(data.error?.message ?? "訳と例文を確認できませんでした");
      setPreview(data.cards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "訳と例文を確認できませんでした");
    } finally { setLoading(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, input }) });
      const data = await response.json() as { error?: { message?: string }; book?: { id: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "単語帳を作成できませんでした");
      if (!data.book) throw new Error("作成結果を取得できませんでした");
      if (onCreated) onCreated();
      else router.push(`/books/${data.book.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "単語帳を作成できませんでした"); setLoading(false); }
  }
  return <form className="panel pop-shadow stack" onSubmit={preview ? submit : previewCards}>
    <div className="form-header"><div><p className="eyebrow">STEP 1</p><h2>英単語リスト</h2></div><span className="badge">最大100語</span></div>
    {!preview ? <>
      <p className="form-note">改行またはカンマ区切りで入力してください（例: run, give up, listen）</p>
      <label>単語帳名<input required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="旅行で使う英語" /></label>
      <label>英単語・熟語リスト<textarea required value={input} onChange={(e) => setInput(e.target.value)} placeholder={"run\ngive up\nlook forward to"} /></label>
      <p className="form-note">重複と空行は自動で整理します。訳と例文を確認してから単語帳を作成できます。</p>
    </> : <section className="preview-list" aria-live="polite">
      <div><h3>「{title}」の作成内容を確認</h3><p className="form-note">日本語訳と例文が正しければ、単語帳作成ボタンを押してください。</p></div>
      <LookupPreviewTable items={preview} />
    </section>}
    {error && <p className="error">{error}</p>}
    <div className="actions"><button className="button" disabled={loading}>{loading ? (preview ? "作成中…" : "確認中…") : (preview ? "この内容で単語帳を作成" : "訳・例文を確認")}</button>{preview && <button className="button secondary" type="button" onClick={() => { setPreview(null); setError(null); }} disabled={loading}>入力を修正</button>}</div>
  </form>;
}
