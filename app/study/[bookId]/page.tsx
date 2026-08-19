"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StudyClient } from "@/components/StudyClient";

export default function StudyPage() {
  const { bookId } = useParams<{ bookId: string }>();
  return <div className="stack"><Link className="back-link" href={`/books/${bookId}`}>← 単語帳へ戻る</Link><StudyClient bookId={bookId} /></div>;
}
