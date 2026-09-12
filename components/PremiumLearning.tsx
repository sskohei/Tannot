"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Preferences = { daily_review_limit: number; daily_new_card_limit: number; review_order: "new_first" | "due_first" };
type Reminder = { enabled: number; reminder_time: string };
type Activity = { day: string; count: number };
type Stats = { totalReviews: number; last7Days: number; last30Days: number; masteredCards: number; ratings: Record<string, number>; activity: Activity[] };

const sampleRatings = { again: 24, hard: 38, good: 310, easy: 148 };

function recentDayKey(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

const sampleActivity: Activity[] = [4, 8, 6, 11, 7, 13, 9].map((count, index) => ({ day: recentDayKey(index - 6), count }));

function ActivityChart({ activity }: { activity: Activity[] }) {
  const activityByDay = new Map(activity.map((item) => [item.day, item.count]));
  const points = Array.from({ length: 7 }, (_, index) => {
    const day = recentDayKey(index - 6);
    const date = new Date(`${day}T00:00:00Z`);
    return { day, label: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`, count: activityByDay.get(day) ?? 0 };
  });
  const max = Math.max(...points.map((point) => point.count), 1);

  return <div className="chart-block">
    <div className="chart-heading"><h3>直近7日の復習推移</h3><span>復習回数</span></div>
    <div className="activity-chart" role="img" aria-label="直近7日間の復習回数を表す棒グラフ">
      {points.map((point) => <div className="activity-column" key={point.day}>
        <span className="chart-count">{point.count}</span>
        <div className="bar-track"><span className="activity-bar" style={{ height: `${Math.max((point.count / max) * 100, point.count ? 8 : 0)}%` }} /></div>
        <span className="chart-label">{point.label}</span>
      </div>)}
    </div>
  </div>;
}

function RatingChart({ ratings }: { ratings: Record<string, number> }) {
  const items = [
    { key: "again", label: "もう一度" },
    { key: "hard", label: "難しい" },
    { key: "good", label: "普通" },
    { key: "easy", label: "簡単" },
  ];
  const total = Math.max(items.reduce((sum, item) => sum + (ratings[item.key] ?? 0), 0), 1);

  return <div className="chart-block">
    <div className="chart-heading"><h3>評価の内訳</h3><span>回答回数</span></div>
    <div className="rating-chart" role="img" aria-label="学習カードの評価分布を表す棒グラフ">
      {items.map((item) => {
        const count = ratings[item.key] ?? 0;
        return <div className="rating-row" key={item.key}>
          <div className="rating-label"><span>{item.label}</span><strong>{count}</strong></div>
          <div className="rating-track"><span className={`rating-bar rating-${item.key}`} style={{ width: `${(count / total) * 100}%` }} /></div>
        </div>;
      })}
    </div>
  </div>;
}

function StatsCharts({ activity, ratings }: { activity: Activity[]; ratings: Record<string, number> }) {
  return <div className="stats-charts"><ActivityChart activity={activity} /><RatingChart ratings={ratings} /></div>;
}

export function PremiumUpgradeModal({ featureName, onClose }: { featureName: string; onClose: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="premium-upgrade-title">
      <button className="modal-close" type="button" aria-label="閉じる" onClick={onClose}>×</button>
      <span className="premium-label">PREMIUM</span>
      <h2 id="premium-upgrade-title">{featureName}はプレミアム限定です</h2>
      <p className="muted">プレミアムに登録すると、この機能を使って学習をもっと続けやすくできます。</p>
      <div className="actions">
        <Link className="button" href="/settings">7日間無料で試す</Link>
        <Link className="button secondary" href="/pricing">料金を見る</Link>
      </div>
    </section>
  </div>;
}

export function PremiumFeaturesPreview() {
  const [featureName, setFeatureName] = useState<string | null>(null);

  return <section className="premium-preview stack" aria-labelledby="premium-features-title">
    <div>
      <p className="eyebrow">PREMIUM FEATURES</p>
      <h2 id="premium-features-title">プレミアムでできること</h2>
      <p className="muted">学習のペースを整えたり、上達の様子を詳しく振り返ったりできます。</p>
    </div>
    <div className="premium-feature-grid">
      <button className="premium-feature-card" type="button" onClick={() => setFeatureName("学習設定とリマインダー")}>
        <span className="premium-label">PREMIUM</span>
        <h3>学習設定とリマインダー</h3>
        <p>1日の学習量や出題順を調整し、復習の通知を受け取れます。</p>
        <span className="text-button">詳しく見る</span>
      </button>
      <button className="premium-feature-card" type="button" onClick={() => setFeatureName("学習統計")}>
        <span className="premium-label">PREMIUM</span>
        <h3>学習統計</h3>
        <p>復習回数、定着したカード数、評価の傾向を確認できます。</p>
        <span className="text-button">詳しく見る</span>
      </button>
    </div>
    {featureName && <PremiumUpgradeModal featureName={featureName} onClose={() => setFeatureName(null)} />}
  </section>;
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init); const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? "読み込めませんでした"); return data;
}

export function PremiumStats() {
  const [stats, setStats] = useState<Stats | null>(null); const [locked, setLocked] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  useEffect(() => { void json<{ stats: Stats }>("/api/study/stats").then((data) => { setStats(data.stats); setLocked(false); }).catch(() => setLocked(true)); }, []);
  if (locked) return <>
    <section className="panel stack" id="learning-stats">
      <div>
        <h2>学習統計 <span className="premium-label">PREMIUM</span></h2>
        <p className="muted">復習回数、定着したカード数、評価の傾向を確認できます。</p>
        <button className="text-button" type="button" onClick={() => setShowUpgrade(true)}>プレミアムで使う</button>
      </div>
      <div className="stats-preview" aria-label="プレミアム学習統計の表示例">
        <p className="preview-label">課金後の表示例</p>
        <div className="stats-grid">
          <p><strong>42</strong><span>直近7日の復習</span></p>
          <p><strong>168</strong><span>直近30日の復習</span></p>
          <p><strong>35</strong><span>定着カード</span></p>
          <p><strong>520</strong><span>総復習回数</span></p>
        </div>
        <p className="muted">評価: もう一度 24 · 難しい 38 · 普通 310 · 簡単 148</p>
        <StatsCharts activity={sampleActivity} ratings={sampleRatings} />
        <p className="form-note">数値は表示イメージです。プレミアム登録後は、あなたの学習履歴が表示されます。</p>
      </div>
    </section>
    {showUpgrade && <PremiumUpgradeModal featureName="学習統計" onClose={() => setShowUpgrade(false)} />}
  </>;
  if (!stats) return null;
  return <section className="panel stack" id="learning-stats"><h2>学習統計 <span className="premium-label">PREMIUM</span></h2><div className="stats-grid"><p><strong>{stats.last7Days}</strong><span>直近7日の復習</span></p><p><strong>{stats.last30Days}</strong><span>直近30日の復習</span></p><p><strong>{stats.masteredCards}</strong><span>定着カード</span></p><p><strong>{stats.totalReviews}</strong><span>総復習回数</span></p></div><p className="muted">評価: もう一度 {stats.ratings.again ?? 0} · 難しい {stats.ratings.hard ?? 0} · 普通 {stats.ratings.good ?? 0} · 簡単 {stats.ratings.easy ?? 0}</p><StatsCharts activity={stats.activity} ratings={stats.ratings} /></section>;
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
