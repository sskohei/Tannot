"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthButton() {
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  if (isPending) return <span className="muted">確認中…</span>;
  if (!session) return <Link className="button" href="/login">Googleでログイン</Link>;
  return (
    <button className="button secondary" disabled={loading} onClick={async () => {
      setLoading(true);
      await authClient.signOut();
      setLoading(false);
    }}>{loading ? "ログアウト中…" : "ログアウト"}</button>
  );
}
