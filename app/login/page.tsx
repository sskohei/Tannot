"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return <section className="panel stack">
    <h1>ログイン</h1>
    <p className="muted">Googleアカウントでログインすると単語帳を保存できます。</p>
    {error && <p className="error">{error}</p>}
    <button className="button" disabled={loading} onClick={async () => {
      setLoading(true); setError(null);
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/books" });
      if (result.error) { setError("ログインを開始できませんでした"); setLoading(false); return; }
      router.push("/books");
    }}>{loading ? "移動中…" : "Googleでログイン"}</button>
  </section>;
}
