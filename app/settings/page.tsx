"use client";

import { useState } from "react";
export default function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null);
  async function checkout() { setMessage(null); const response = await fetch("/api/billing/checkout", { method: "POST" }); const data = await response.json() as { url?: string; error?: { message?: string } }; if (!response.ok) { setMessage(data.error?.message ?? "Checkoutを開始できません"); return; } if (data.url) window.location.assign(data.url); }
  return <section className="panel pop-shadow stack"><p className="eyebrow">YOUR PLAN</p><h1>設定・プラン</h1><p>有料プランでは無料利用枠を超えて単語帳を作成できます。</p>{message && <p className="error">{message}</p>}<button className="button" onClick={checkout}>有料プランを開始</button></section>;
}
