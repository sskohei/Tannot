"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DailyReminder, PremiumStats } from "@/components/PremiumLearning";

type SummaryBook = { id: string; title: string; card_count: number; due_count: number };
type Summary = { totalDue: number; totalCards: number; books: SummaryBook[] };

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/study/summary").then(async (response) => {
      const data = await response.json() as Summary & { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "学習状況を読み込めませんでした");
      setSummary(data);
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "学習状況を読み込めませんでした"));
  }, []);

  if (error) return <section className="panel stack"><p className="error" role="alert">{error}</p><Link className="button secondary" href="/login">ログイン画面へ</Link></section>;
  if (!summary) return <p className="muted" role="status">学習状況を読み込み中…</p>;

  return <div className="stack">
    <DailyReminder totalDue={summary.totalDue} />
    <section className="dashboard-hero panel pop-shadow">
      <div><p className="eyebrow">TODAY</p><h1>今日の復習</h1><p className="muted">忘れかけたカードから、少しずつ進めましょう。</p></div>
      <div className="due-total" aria-label={`今日の復習は${summary.totalDue}枚`}><strong>{summary.totalDue}</strong><span>枚</span></div>
    </section>
    <section className="stack" aria-labelledby="due-books-title">
      <div className="section-toolbar"><div className="section-title"><h2 id="due-books-title">単語帳ごとの復習</h2></div><p className="muted">登録カード 全{summary.totalCards}枚</p></div>
      <div className="book-grid">{summary.books.map((book) => <article className="book-card" key={book.id}>
        <h3>{book.title}</h3>
        <p className="book-stats"><strong>{Number(book.due_count)}枚</strong> 復習 · 全{Number(book.card_count)}枚</p>
        <div className="actions"><Link className="button" href={`/study/${book.id}`}>{Number(book.due_count) > 0 ? "復習する" : "学習状況を見る"}</Link><Link className="button secondary" href={`/books/${book.id}`}>カードを見る</Link></div>
      </article>)}</div>
      {summary.books.length === 0 && <section className="info-panel stack"><p>単語帳を作ると、ここに今日の復習件数が表示されます。</p><Link className="button" href="/books">最初の単語帳を作る</Link></section>}
      {summary.books.length > 0 && summary.totalDue === 0 && <p className="success" role="status">今日の復習は完了です。おつかれさまでした。</p>}
    </section>
    <PremiumStats />
  </div>;
}
