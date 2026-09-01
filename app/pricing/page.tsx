import Link from "next/link";

export default function PricingPage() {
  return <div className="stack">
    <section className="page-heading"><div><p className="eyebrow">PRICING</p><h1>あなたのペースに合うプラン</h1><p>まずは無料で始めて、もっとたくさん学びたくなったらプレミアムへ。</p></div></section>
    <section className="pricing-grid">
      <article className="price-card panel"><p className="eyebrow">FREE</p><h2>無料プラン</h2><p className="price">¥0<span>/月</span></p><ul><li>単語帳は3冊まで</li><li>1冊につき100枚までのカード</li><li>音声読み上げと間隔反復学習</li></ul><Link className="button secondary" href="/books">無料で始める</Link></article>
      <article className="price-card panel pop-shadow"><p className="eyebrow">PREMIUM</p><h2>プレミアム</h2><p className="price">¥500<span>（税込）/月</span></p><ul><li>単語帳・カードを無制限に作成</li><li>学習統計などの追加機能を順次提供予定</li><li>7日間の無料トライアル</li></ul><Link className="button" href="/settings">7日間無料で試す</Link></article>
    </section>
    <section className="info-panel stack"><h2>お支払いと解約について</h2><p>プレミアムは7日間の無料トライアル終了後に初回課金され、以後は初回課金日と同じ日付に毎月自動更新されます。カード、Apple Pay、Google Payを利用できます。解約は設定画面の「決済・契約を管理」から、次回更新日時の24時間前までに行えます。解約後も、支払い済みの利用期間の終わりまでプレミアムを利用できます。</p><p><Link href="/legal/commercial-transactions">特定商取引法に基づく表記</Link>と<Link href="/legal/terms">利用規約</Link>をご確認ください。</p></section>
  </div>;
}
