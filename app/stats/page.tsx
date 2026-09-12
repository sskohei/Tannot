"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { PremiumStats } from "@/components/PremiumLearning";

export default function StatsPage() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <p className="muted" role="status">学習統計を読み込み中…</p>;
  if (!session) return <section className="panel pop-shadow stack"><h1>学習統計</h1><p>学習統計を見るにはログインしてください。</p><Link className="button" href="/login">Googleでログイン</Link></section>;

  return <div className="stack">
    <section className="page-heading">
      <div>
        <p className="eyebrow">LEARNING STATS</p>
        <h1>学習統計</h1>
        <p>これまでの学習の積み重ねを振り返りましょう。</p>
      </div>
    </section>
    <PremiumStats />
  </div>;
}
