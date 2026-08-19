import Link from "next/link";

export default function HomePage() {
  return (
    <div className="stack">
      <section className="hero">
        <p className="eyebrow">ENGLISH → YOUR MEMORY</p>
        <h1>英単語を、ぽんっと単語帳に。<span>使える記憶へ、軽やかに。</span></h1>
        <p>英単語リストを入力するだけで、訳・例文・音声つきの単語帳を作れます。忘れかけたタイミングの復習まで、Tannotがそっと手伝います。</p>
        <div className="hero-actions"><Link className="button" href="/books">単語帳を作る</Link><Link className="button secondary" href="/login">Googleでログイン</Link></div>
      </section>
      <section className="info-panel">
        <div className="grid-copy">
          <div><h2>単語帳づくりを、もっと軽やかに。</h2><p>単語をまとめて入力すると、辞書データと例文から学習カードを作成。ブラウザの音声読み上げにも対応しています。</p></div>
          <div><h2>使い方</h2><ol><li>英単語や熟語を入力する</li><li>訳・例文つきのカードを作る</li><li>音声を聞きながら復習する</li></ol></div>
        </div>
      </section>
    </div>
  );
}
