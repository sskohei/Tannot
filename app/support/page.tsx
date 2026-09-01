"use client";

import { FormEvent, useState } from "react";

const supportEmail = "k.kuro.2007@gmail.com";

export default function SupportPage() {
  const [category, setCategory] = useState("サービスの使い方");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function openEmail(event: FormEvent) {
    event.preventDefault();
    const body = [`お問い合わせ種別: ${category}`, "", message].join("\n");
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(`[Tannot] ${subject}`)}&body=${encodeURIComponent(body)}`;
  }

  return <article className="legal-page stack">
    <div><p className="eyebrow">SUPPORT</p><h1>お問い合わせ</h1><p className="muted">平日10:00〜17:00（日本時間）に受け付け、3営業日以内を目安に回答します。</p></div>
    <section className="panel stack">
      <h2>メールを作成</h2>
      <p className="form-note">送信ボタンを押すと端末のメールアプリが開きます。決済カード番号、パスワード、APIキーなどの秘密情報は入力しないでください。</p>
      <form className="stack" onSubmit={openEmail}>
        <label>お問い合わせ種別<select value={category} onChange={(event) => setCategory(event.target.value)}><option>サービスの使い方</option><option>ログイン・アカウント</option><option>料金・決済</option><option>不具合の報告</option><option>個人情報に関する請求</option><option>その他</option></select></label>
        <label>件名<input required maxLength={100} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="お問い合わせの概要" /></label>
        <label>内容<textarea required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="発生した画面、操作、表示されたメッセージなどをご記入ください" /></label>
        <button className="button">メールアプリを開く</button>
      </form>
      <p className="form-note">メールアプリが開かない場合は、<a href={`mailto:${supportEmail}`}>{supportEmail}</a>へ直接お送りください。</p>
    </section>
  </article>;
}
