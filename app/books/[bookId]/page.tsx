"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Card = { id: string; term: string; translation: string | null; sentence: string | null; error_message: string | null; term_audio_status: string; sentence_audio_status: string };
type Book = { id: string; title: string; cards: Card[] };
export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>(); const router = useRouter();
  const [book, setBook] = useState<Book | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/books/${bookId}`).then(async (r) => { const data = await r.json() as { book?: Book; error?: { message?: string } }; if (!r.ok) throw new Error(data.error?.message); setBook(data.book ?? null); }).catch((e) => setError(e.message)); }, [bookId]);
  if (error) return <p className="error">{error}</p>;
  if (!book) return <p className="muted">読み込み中…</p>;
  async function remove() { if (!window.confirm("この単語帳を削除しますか？")) return; const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" }); if (response.ok) router.push("/books"); }
  return <div className="stack"><div><Link href="/books">← 単語帳一覧</Link><h1>{book.title}</h1><p className="muted">{book.cards.length}枚</p></div><div className="actions"><Link className="button" href={`/study/${bookId}`}>学習を始める</Link><button className="button danger" onClick={remove}>削除</button></div><div className="stack">{book.cards.map((card) => <article className="panel" key={card.id}><h2>{card.term}</h2><p>{card.translation ?? "訳が見つかりません"}</p><p className="muted">{card.sentence ?? "例文が見つかりません"}</p>{card.error_message && <p className="error">{card.error_message}</p>}<small className="muted">単語音声: {card.term_audio_status} / 例文音声: {card.sentence_audio_status}</small></article>)}</div></div>;
}
