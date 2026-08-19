"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookForm } from "@/components/BookForm";

type Book = { id: string; title: string; created_at: string };
export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch("/api/books").then(async (r) => { const data = await r.json() as { books?: Book[]; error?: { message?: string } }; if (!r.ok) throw new Error(data.error?.message); setBooks(data.books ?? []); }).catch((e) => setError(e.message ?? "読み込めませんでした")); }, []);
  return <div className="stack">
    <div><h1>単語帳</h1><p className="muted">新しい単語帳を作成するか、復習を始めましょう。</p></div>
    <BookForm />
    {error && <p className="error">{error}（ログインが必要な場合があります）</p>}
    <section className="stack"><h2>保存済み</h2><div className="book-grid">{books.map((book) => <article className="book-card" key={book.id}><h3>{book.title}</h3><p className="muted">{new Date(book.created_at).toLocaleDateString("ja-JP")}</p><div className="actions"><Link className="button secondary" href={`/books/${book.id}`}>詳細</Link><Link className="button" href={`/study/${book.id}`}>学習</Link></div></article>)}</div>{books.length === 0 && !error && <p className="muted">まだ単語帳がありません。</p>}</section>
  </div>;
}
