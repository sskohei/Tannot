"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState(false);
  return <section className="panel pop-shadow stack">
    <p className="eyebrow">WELCOME BACK</p>
    <h1>ログイン</h1>
    <p className="muted">Googleアカウントでログインすると単語帳を保存できます。</p>
    <label className="consent"><input type="checkbox" checked={eligible} onChange={(event) => setEligible(event.target.checked)} /> <span>私は13歳以上です。18歳未満の場合は、本サービスの利用について保護者の同意を得ています。<Link href="/legal/terms" target="_blank">利用規約</Link>も確認しました。</span></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="button" disabled={loading || !eligible} onClick={async () => {
      setLoading(true); setError(null);
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
      if (result.error) { setError("ログインを開始できませんでした"); setLoading(false); return; }
      router.push("/books");
    }}>{loading ? "移動中…" : "Googleでログイン"}</button>
  </section>;
}
