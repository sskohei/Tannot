"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddCardsForm } from "@/components/AddCardsForm";
import { BookForm } from "@/components/BookForm";

type Book = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  card_count: number;
  due_count: number;
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/books").then(async (response) => {
      const data = await response.json() as { books?: Book[]; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message);
      setBooks(data.books ?? []);
      setError(null);
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "読み込めませんでした");
    });
  }, [refreshKey]);

  const selectedBook = books.find((book) => book.id === selectedBookId);
  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");
    if (!normalizedQuery) return books;
    return books.filter((book) => book.title.toLocaleLowerCase("ja-JP").includes(normalizedQuery));
  }, [books, query]);

  return <div className="stack">
    <div className="page-heading">
      <div><p className="eyebrow">YOUR NOTEBOOKS</p><h1>単語帳</h1><p>単語帳を選んで学習したり、単語を追加したりできます。</p></div>
      <button className="button" type="button" onClick={() => {
        setShowCreateForm((open) => !open);
        setSelectedBookId(null);
        setNotice(null);
      }}>{showCreateForm ? "閉じる" : "新しい単語帳を作成"}</button>
    </div>
    {showCreateForm && <BookForm onCreated={() => {
      setShowCreateForm(false);
      setNotice("新しい単語帳を作成しました");
      setRefreshKey((key) => key + 1);
    }} />}
    {selectedBook && <AddCardsForm
      bookId={selectedBook.id}
      bookTitle={selectedBook.title}
      onCancel={() => setSelectedBookId(null)}
      onAdded={(addedCount, skippedTerms) => {
        setSelectedBookId(null);
        setRefreshKey((key) => key + 1);
        setNotice(addedCount > 0
          ? `${addedCount}語を追加しました${skippedTerms.length > 0 ? `（${skippedTerms.length}語は登録済み）` : ""}`
          : "入力した単語はすべて登録済みです");
      }}
    />}
    {notice && <p className="success" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <section className="stack" aria-labelledby="saved-books-title">
      <div className="section-toolbar">
        <div className="section-title"><h2 id="saved-books-title">保存済み</h2></div>
        <label className="search-field"><span className="visually-hidden">単語帳を検索</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="単語帳名で検索" /></label>
      </div>
      <div className="book-grid">{filteredBooks.map((book) => <article className="book-card" key={book.id}>
        <h3>{book.title}</h3>
        <p className="book-stats"><strong>{Number(book.due_count)}枚</strong> 復習 · 全{Number(book.card_count)}枚</p>
        <p className="muted">更新日 {new Date(book.updated_at).toLocaleDateString("ja-JP")}</p>
        <div className="actions">
          <button className="button secondary" type="button" onClick={() => { setSelectedBookId(book.id); setShowCreateForm(false); setNotice(null); }}>単語を追加</button>
          <Link className="button secondary" href={`/books/${book.id}`}>詳細</Link>
          <Link className="button" href={`/study/${book.id}`}>{Number(book.due_count) > 0 ? "復習する" : "学習"}</Link>
        </div>
      </article>)}</div>
      {books.length === 0 && !error && <p className="muted">まだ単語帳がありません。</p>}
      {books.length > 0 && filteredBooks.length === 0 && <p className="muted">「{query}」に一致する単語帳はありません。</p>}
    </section>
  </div>;
}
