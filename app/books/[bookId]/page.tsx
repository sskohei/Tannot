"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditableCard, type EditableCardData } from "@/components/EditableCard";

type Book = { id: string; title: string; folder_name: string; cards: EditableCardData[] };

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");
  const [folderName, setFolderName] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [bulkTags, setBulkTags] = useState("");
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
      setFolderName(data.book.folder_name ?? "");
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
      body: JSON.stringify({ title, folderName }),
      });
      const data = await response.json() as { book?: { title: string }; error?: { message?: string } };
      if (!response.ok || !data.book) throw new Error(data.error?.message ?? "単語帳名を変更できませんでした");
      setBook((current) => current ? { ...current, title: data.book!.title, folder_name: folderName } : current);
      setRenaming(false);
      setNotice("単語帳名を変更しました");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "単語帳名を変更できませんでした");
    } finally {
      setLoading(false);
    }
  }

  async function applyTags() {
    if (!selectedCardIds.length) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}/cards/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardIds: selectedCardIds, tags: bulkTags }) });
      const data = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "タグを追加できませんでした");
      setSelectedCardIds([]); setBulkTags(""); setNotice("選択したカードにタグを追加しました"); setRefreshKey((key) => key + 1);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "タグを追加できませんでした"); }
    finally { setLoading(false); }
  }

  async function removeSelected() {
    if (!selectedCardIds.length || !window.confirm(`${selectedCardIds.length}枚のカードを削除しますか？`)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/books/${bookId}/cards`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardIds: selectedCardIds }) });
      if (!response.ok) throw new Error("カードを削除できませんでした");
      setBook((current) => current ? { ...current, cards: current.cards.filter((card) => !selectedCardIds.includes(card.id)) } : current);
      setSelectedCardIds([]); setNotice("選択したカードを削除しました");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "カードを削除できませんでした"); }
    finally { setLoading(false); }
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
      {renaming ? <form className="stack panel" onSubmit={rename}><label>単語帳名<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>フォルダ（任意）<input maxLength={40} value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="例: TOEIC" /></label><div className="actions"><button className="button" disabled={loading}>保存</button><button className="button secondary" type="button" onClick={() => { setRenaming(false); setTitle(book.title); setFolderName(book.folder_name ?? ""); }} disabled={loading}>キャンセル</button></div></form> : <div className="title-row"><h1>{book.title}</h1>{book.folder_name && <span className="tag">{book.folder_name}</span>}<button className="text-button" type="button" onClick={() => setRenaming(true)}>単語帳・フォルダを編集</button></div>}
      <p className="muted">{book.cards.length}枚の学習カード</p>
    </div>
    {notice && <p className="success" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><Link className="button" href={`/study/${bookId}`}>学習を始める</Link><button className="button danger" type="button" onClick={() => void removeBook()} disabled={loading}>単語帳を削除</button></div>
    <div className="section-toolbar">
      <div className="section-title"><h2>カード</h2></div>
      <label className="search-field"><span className="visually-hidden">カードを検索</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="単語・訳・例文を検索" /></label>
    </div>
    {selectedCardIds.length > 0 && <div className="panel bulk-toolbar"><strong>{selectedCardIds.length}枚を選択中</strong><label>タグを追加<input value={bulkTags} onChange={(event) => setBulkTags(event.target.value)} placeholder="例: 苦手, 動詞" /></label><button className="button secondary" onClick={() => void applyTags()} disabled={loading || !bulkTags.trim()}>タグを追加</button><button className="button danger" onClick={() => void removeSelected()} disabled={loading}>選択を削除</button></div>}
    <div className="card-list">{filteredCards.map((card) => <EditableCard
      key={card.id}
      bookId={bookId}
      card={card}
      selected={selectedCardIds.includes(card.id)}
      onSelected={(checked) => setSelectedCardIds((current) => checked ? [...new Set([...current, card.id])] : current.filter((id) => id !== card.id))}
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
