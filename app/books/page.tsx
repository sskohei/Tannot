"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AddCardsForm } from "@/components/AddCardsForm";
import { BookForm } from "@/components/BookForm";

type Book = { id: string; title: string; created_at: string };
export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { fetch("/api/books").then(async (r) => { const data = await r.json() as { books?: Book[]; error?: { message?: string } }; if (!r.ok) throw new Error(data.error?.message); setBooks(data.books ?? []); setError(null); }).catch((e) => setError(e.message ?? "読み込めませんでした")); }, [refreshKey]);
  const selectedBook = books.find((book) => book.id === selectedBookId);
  return <div className="stack">
    <div className="page-heading"><div><p className="eyebrow">YOUR NOTEBOOKS</p><h1>単語帳</h1><p>単語帳を選んで学習したり、単語を追加したりできます。</p></div><button className="button" onClick={() => { setShowCreateForm((open) => !open); setSelectedBookId(null); setNotice(null); }}>{showCreateForm ? "閉じる" : "新しい単語帳を作成"}</button></div>
    {showCreateForm && <BookForm onCreated={() => { setShowCreateForm(false); setNotice("新しい単語帳を作成しました"); setRefreshKey((key) => key + 1); }} />}
    {selectedBook && <AddCardsForm bookId={selectedBook.id} bookTitle={selectedBook.title} onCancel={() => setSelectedBookId(null)} onAdded={(addedCount, skippedTerms) => { setSelectedBookId(null); setRefreshKey((key) => key + 1); setNotice(addedCount > 0 ? `${addedCount}語を追加しました${skippedTerms.length > 0 ? `（${skippedTerms.length}語は登録済み）` : ""}` : "入力した単語はすべて登録済みです"); }} />}
    {notice && <p className="success" role="status">{notice}</p>}
    {error && <p className="error">{error}（ログインが必要な場合があります）</p>}
    <section className="stack"><div className="section-title"><h2>保存済み</h2></div><div className="book-grid">{books.map((book) => <article className="book-card" key={book.id}><h3>{book.title}</h3><p className="muted">{new Date(book.created_at).toLocaleDateString("ja-JP")}</p><div className="actions"><button className="button secondary" onClick={() => { setSelectedBookId(book.id); setShowCreateForm(false); setNotice(null); }}>単語を追加</button><Link className="button secondary" href={`/books/${book.id}`}>詳細</Link><Link className="button" href={`/study/${book.id}`}>学習</Link></div></article>)}</div>{books.length === 0 && !error && <p className="muted">まだ単語帳がありません。</p>}</section>
  </div>;
}
