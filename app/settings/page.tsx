"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Subscription = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: number;
};

type Me = {
  user: { name: string; email: string } | null;
  usage: { books: number; freeBookLimit: number };
  subscription: Subscription | null;
};

function isPremium(subscription: Subscription | null): boolean {
  return subscription?.status === "active" || subscription?.status === "trialing";
}

function subscriptionLabel(subscription: Subscription | null): string {
  if (!subscription) return "無料プラン";
  if (subscription.status === "trialing") return "プレミアム（無料トライアル中）";
  if (subscription.status === "active") return subscription.cancel_at_period_end ? "プレミアム（解約予定）" : "プレミアム";
  return "無料プラン";
}

export default function SettingsPage() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const userId = session?.user.id;
  const [me, setMe] = useState<Me | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!userId) return;
    setIsLoadingSettings(true);
    setMessage(null);
    try {
      const response = await fetch("/api/me", { credentials: "include" });
      const data = await response.json() as Me & { error?: { message?: string } };
      if (!response.ok || !data.user) throw new Error(data.error?.message ?? "設定を読み込めませんでした");
      setMe(data);
    } catch (error) {
      setMe(null);
      setMessage(error instanceof Error ? error.message : "設定を読み込めませんでした");
    } finally {
      setIsLoadingSettings(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isSessionPending) return;
    if (!userId) {
      setMe(null);
      setIsLoadingSettings(false);
      return;
    }
    void loadSettings();
  }, [isSessionPending, loadSettings, userId]);

  async function openBilling(path: "/api/billing/checkout" | "/api/billing/portal") {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        ...(path === "/api/billing/checkout" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ termsAccepted: acceptedTerms }) } : {}),
      });
      const data = await response.json() as { url?: string; error?: { message?: string } };
      if (!response.ok || !data.url) throw new Error(data.error?.message ?? "決済画面を開始できません");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "決済画面を開始できません");
      setLoading(false);
    }
  }

  async function downloadData() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        const data = await response.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "データを出力できません");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tannot-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "データを出力できません");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("単語帳・カード・学習履歴を削除します。この操作は取り消せません。")) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json() as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "アカウントを削除できません");
      }
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "アカウントを削除できません");
      setLoading(false);
    }
  }

  if (isSessionPending || (session && isLoadingSettings)) return <p className="muted">設定を読み込み中…</p>;
  if (!session) return <section className="panel pop-shadow stack"><h1>設定・プラン</h1><p>プランとデータを管理するにはログインしてください。</p><Link className="button" href="/login">Googleでログイン</Link></section>;
  if (!me) return <section className="panel pop-shadow stack"><h1>設定・プラン</h1><p>ログイン状態は確認できましたが、プラン情報を取得できませんでした。</p>{message && <p className="error" role="alert">{message}</p>}<div className="actions"><button className="button" onClick={() => void loadSettings()}>再試行</button><Link className="button secondary" href="/books">単語帳へ戻る</Link></div></section>;

  const premium = isPremium(me.subscription);
  const periodEnd = me.subscription?.current_period_end ? new Date(me.subscription.current_period_end).toLocaleDateString("ja-JP") : null;
  return <div className="stack">
    <section className="panel pop-shadow stack">
      <p className="eyebrow">YOUR PLAN</p>
      <h1>設定・プラン</h1>
      <p><strong>{subscriptionLabel(me.subscription)}</strong></p>
      <p className="muted">無料プランは単語帳{me.usage.freeBookLimit}冊まで、1冊につき100枚までのカードを作成できます。</p>
      {premium && periodEnd && <p className="form-note">{me.subscription?.cancel_at_period_end ? `プレミアムは${periodEnd}まで利用できます。` : `次回の請求予定日は${periodEnd}です。`}</p>}
      {message && <p className="error" role="alert">{message}</p>}
      <div className="actions">
        {!premium && <button className="button" onClick={() => void openBilling("/api/billing/checkout")} disabled={loading || !acceptedTerms}>7日間無料でプレミアムを試す</button>}
        {premium && <button className="button secondary" onClick={() => void openBilling("/api/billing/portal")} disabled={loading}>決済・契約を管理</button>}
        <Link className="button secondary" href="/pricing">料金を見る</Link>
      </div>
      {!premium && <label className="consent"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /> <span><Link href="/legal/terms" target="_blank">利用規約</Link>、<Link href="/legal/privacy" target="_blank">プライバシーポリシー</Link>および<Link href="/legal/commercial-transactions" target="_blank">特定商取引法に基づく表記</Link>を確認し、同意します。</span></label>}
      <p className="form-note">プレミアムは月額500円（税込）です。7日間の無料トライアル後、初回課金日と同じ日付に毎月自動更新されます。カード、Apple Pay、Google Payに対応しています。</p>
    </section>
    <section className="panel stack">
      <h2>データ管理</h2>
      <p className="muted">単語帳、カード、学習履歴をJSON形式でダウンロードできます。</p>
      <div className="actions"><button className="button secondary" onClick={() => void downloadData()} disabled={loading}>データをダウンロード</button></div>
    </section>
    <section className="panel stack danger-panel">
      <h2>アカウント削除</h2>
      <p className="muted">アカウントを削除すると、単語帳・カード・学習履歴は削除されます。プレミアム契約中は、先に「決済・契約を管理」から解約し、利用期間終了後に削除してください。</p>
      <div className="actions"><button className="button danger" onClick={() => void deleteAccount()} disabled={loading}>アカウントを削除</button></div>
    </section>
  </div>;
}
