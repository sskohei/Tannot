"use client";

import { FormEvent, useEffect, useState } from "react";

type Preferences = { daily_review_limit: number; daily_new_card_limit: number; review_order: "new_first" | "due_first" };
type Reminder = { enabled: number; reminder_time: string };
type Stats = { totalReviews: number; last7Days: number; last30Days: number; masteredCards: number; ratings: Record<string, number> };

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init); const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? "読み込めませんでした"); return data;
}

export function PremiumStats() {
  const [stats, setStats] = useState<Stats | null>(null); const [locked, setLocked] = useState(false);
  useEffect(() => { void json<{ stats: Stats }>("/api/study/stats").then((data) => setStats(data.stats)).catch(() => setLocked(true)); }, []);
  if (locked) return <section className="panel stack"><h2>学習統計 <span className="premium-label">PREMIUM</span></h2><p className="muted">復習回数、定着したカード数、評価の傾向を確認できます。</p></section>;
  if (!stats) return null;
  return <section className="panel stack"><h2>学習統計 <span className="premium-label">PREMIUM</span></h2><div className="stats-grid"><p><strong>{stats.last7Days}</strong><span>直近7日の復習</span></p><p><strong>{stats.last30Days}</strong><span>直近30日の復習</span></p><p><strong>{stats.masteredCards}</strong><span>定着カード</span></p><p><strong>{stats.totalReviews}</strong><span>総復習回数</span></p></div><p className="muted">評価: もう一度 {stats.ratings.again ?? 0} · 難しい {stats.ratings.hard ?? 0} · 普通 {stats.ratings.good ?? 0} · 簡単 {stats.ratings.easy ?? 0}</p></section>;
}

export function PremiumLearningSettings() {
  const [preferences, setPreferences] = useState<Preferences | null>(null); const [reminder, setReminder] = useState<Reminder | null>(null); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  useEffect(() => { void Promise.all([json<{ preferences: Preferences }>("/api/study/preferences"), json<{ reminder: Reminder }>("/api/study/reminder")]).then(([prefs, reminderData]) => { setPreferences(prefs.preferences); setReminder(reminderData.reminder); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "設定を読み込めませんでした")); }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!preferences || !reminder) return; setLoading(true); setMessage(null);
    try {
      if (reminder.enabled && "Notification" in window && Notification.permission === "default") await Notification.requestPermission();
      await Promise.all([
        json("/api/study/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dailyReviewLimit: preferences.daily_review_limit, dailyNewCardLimit: preferences.daily_new_card_limit, reviewOrder: preferences.review_order }) }),
        json("/api/study/reminder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: Boolean(reminder.enabled), reminderTime: reminder.reminder_time }) }),
      ]);
      setMessage("学習設定を保存しました");
    } catch (error) { setMessage(error instanceof Error ? error.message : "設定を保存できませんでした"); }
    finally { setLoading(false); }
  }
  if (!preferences || !reminder) return <p className="muted">プレミアム学習設定を読み込み中…</p>;
  return <section className="panel stack"><h2>学習設定 <span className="premium-label">PREMIUM</span></h2><form className="stack" onSubmit={save}><div className="settings-grid"><label>1日の復習上限<input type="number" min="1" max="500" value={preferences.daily_review_limit} onChange={(event) => setPreferences({ ...preferences, daily_review_limit: Number(event.target.value) })} /></label><label>1日の新規カード上限<input type="number" min="1" max="500" value={preferences.daily_new_card_limit} onChange={(event) => setPreferences({ ...preferences, daily_new_card_limit: Number(event.target.value) })} /></label></div><label>出題順<select value={preferences.review_order} onChange={(event) => setPreferences({ ...preferences, review_order: event.target.value as Preferences["review_order"] })}><option value="new_first">新規カードを先に出す</option><option value="due_first">期限が来た復習を先に出す</option></select></label><label className="consent"><input type="checkbox" checked={Boolean(reminder.enabled)} onChange={(event) => setReminder({ ...reminder, enabled: event.target.checked ? 1 : 0 })} /><span>復習リマインダーを有効にする</span></label><label>通知時刻<input type="time" value={reminder.reminder_time} onChange={(event) => setReminder({ ...reminder, reminder_time: event.target.value })} disabled={!reminder.enabled} /></label><p className="form-note">ブラウザ通知です。通知を許可し、Tannotを開いているときに未復習カードがあれば表示します。</p>{message && <p className={message.includes("保存しました") ? "success" : "error"} role="status">{message}</p>}<div className="actions"><button className="button" disabled={loading}>{loading ? "保存中…" : "学習設定を保存"}</button></div></form></section>;
}

export function DailyReminder({ totalDue }: { totalDue: number }) {
  useEffect(() => {
    if (!totalDue || !("Notification" in window) || Notification.permission !== "granted") return;
    void json<{ reminder: Reminder }>("/api/study/reminder").then(({ reminder }) => {
      if (!reminder.enabled) return;
      const now = new Date(); const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`; const key = `tannot-reminder-${now.toLocaleDateString("sv-SE")}`;
      if (time >= reminder.reminder_time && !localStorage.getItem(key)) { new Notification("Tannot", { body: `今日の復習が${totalDue}枚あります。` }); localStorage.setItem(key, "sent"); }
    }).catch(() => undefined);
  }, [totalDue]);
  return null;
}
