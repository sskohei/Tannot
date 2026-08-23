"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditableCard, type EditableCardData } from "@/components/EditableCard";

type Book = { id: string; title: string; cards: EditableCardData[] };

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/books/${bookId}`).then(async (response) => {
      const data = await response.json() as { book?: Book; error?: { message?: string } };
      if (!response.ok || !data.book) throw new Error(data.error?.message ?? "単語帳を読み込めませんでした");
      if (cancelled) return;
      setBook(data.book);
      setTitle(data.book.title);
      setError(null);
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "単語帳を読み込めませんでした");
    });
    return () => { cancelled = true; };
  }, [bookId, refreshKey]);

  const filteredCards = useMemo(() => {
    if (!book) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");
    if (!normalizedQuery) return book.cards;
    return book.cards.filter((card) => [card.term, card.translation, card.sentence]
      .some((value) => value?.toLocaleLowerCase("ja-JP").includes(normalizedQuery)));
  }, [book, query]);

  async function rename(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await response.json() as { book?: { title: string }; error?: { message?: string } };
      if (!response.ok || !data.book) throw new Error(data.error?.message ?? "単語帳名を変更できませんでした");
      setBook((current) => current ? { ...current, title: data.book!.title } : current);
      setRenaming(false);
      setNotice("単語帳名を変更しました");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "単語帳名を変更できませんでした");
    } finally {
      setLoading(false);
    }
  }

  async function removeBook() {
    if (!window.confirm("この単語帳とすべての学習履歴を削除しますか？")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "単語帳を削除できませんでした");
      }
      router.push("/books");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "単語帳を削除できませんでした");
      setLoading(false);
    }
  }

  if (error && !book) return <section className="panel stack"><p className="error" role="alert">{error}</p><button className="button secondary" type="button" onClick={() => setRefreshKey((key) => key + 1)}>再試行</button></section>;
  if (!book) return <p className="muted" role="status">読み込み中…</p>;

  return <div className="stack">
    <div>
      <Link className="back-link" href="/books">← 単語帳一覧</Link>
      {renaming ? <form className="inline-form" onSubmit={rename}><label><span className="visually-hidden">単語帳名</span><input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} /></label><button className="button" disabled={loading}>保存</button><button className="button secondary" type="button" onClick={() => { setRenaming(false); setTitle(book.title); }} disabled={loading}>キャンセル</button></form> : <div className="title-row"><h1>{book.title}</h1><button className="text-button" type="button" onClick={() => setRenaming(true)}>名前を変更</button></div>}
      <p className="muted">{book.cards.length}枚の学習カード</p>
    </div>
    {notice && <p className="success" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><Link className="button" href={`/study/${bookId}`}>学習を始める</Link><button className="button danger" type="button" onClick={() => void removeBook()} disabled={loading}>単語帳を削除</button></div>
    <div className="section-toolbar">
      <div className="section-title"><h2>カード</h2></div>
      <label className="search-field"><span className="visually-hidden">カードを検索</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="単語・訳・例文を検索" /></label>
    </div>
    <div className="card-list">{filteredCards.map((card) => <EditableCard
      key={card.id}
      bookId={bookId}
      card={card}
      onUpdated={(updated) => {
        setBook((current) => current ? { ...current, cards: current.cards.map((item) => item.id === updated.id ? updated : item) } : current);
        setNotice("カードを更新しました");
      }}
      onDeleted={(cardId) => {
        setBook((current) => current ? { ...current, cards: current.cards.filter((item) => item.id !== cardId) } : current);
        setNotice("カードを削除しました");
      }}
    />)}</div>
    {book.cards.length > 0 && filteredCards.length === 0 && <p className="muted">「{query}」に一致するカードはありません。</p>}
  </div>;
}
