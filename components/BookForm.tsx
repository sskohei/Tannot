"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function BookForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, input }) });
      const data = await response.json() as { error?: { message?: string }; book?: { id: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "単語帳を作成できませんでした");
      if (!data.book) throw new Error("作成結果を取得できませんでした");
      router.push(`/books/${data.book.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "単語帳を作成できませんでした"); setLoading(false); }
  }
  return <form className="panel stack" onSubmit={submit}>
    <label>単語帳名<input required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="旅行で使う英語" /></label>
    <label>英単語・熟語リスト<textarea required value={input} onChange={(e) => setInput(e.target.value)} placeholder={"run\ngive up\nlook forward to"} /></label>
    <p className="muted">改行またはカンマ区切り。重複と空行は自動で整理します（最大100件）。</p>
    {error && <p className="error">{error}</p>}
    <button className="button" disabled={loading}>{loading ? "作成中…" : "単語帳を作成"}</button>
  </form>;
}
