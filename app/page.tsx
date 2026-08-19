import Link from "next/link";

export default function HomePage() {
  return (
    <section className="hero">
      <p className="muted">Tannot · Vocabulary + spaced repetition</p>
      <h1>英単語を、使える記憶に。</h1>
      <p>英単語リストから訳・例文・音声付きの単語帳を作り、忘れかけたタイミングで効率よく復習できます。</p>
      <div className="actions"><Link className="button" href="/books">単語帳を作る</Link><Link className="button secondary" href="/login">ログイン</Link></div>
    </section>
  );
}
