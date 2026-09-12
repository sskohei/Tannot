import Link from "next/link";
import type { Metadata } from "next";
import { LandingDemo } from "@/components/LandingDemo";
import { StartLearningLink } from "@/components/StartLearningLink";

export const metadata: Metadata = {
  title: "Tannot | 英単語を、使える記憶に。",
  description: "英単語をまとめて入力して、訳・例文・音声つきの単語帳に。Tannotなら、カードづくりから忘れかけた頃の復習まで、軽やかに続けられます。",
};

const features = [
  { number: "01", label: "MAKE IT YOURS", title: "単語を入れたら、\n自分だけの単語帳。", description: "覚えたい英単語や熟語をまとめて入力。辞書の訳と例文を探して、学習カードにまとめます。調べて書き写す手間を、学ぶ時間に。", illustration: "words" },
  { number: "02", label: "LISTEN & LEARN", title: "目で見て、耳で聞いて。\n使う場面まで覚える。", description: "単語だけでなく、例文も音声で確認。意味と使い方を一緒に学べるから、ひとつの単語が、使える言葉に近づきます。", illustration: "sound" },
  { number: "03", label: "LITTLE BY LITTLE", title: "忘れかけた頃が、\n次の学びどき。", description: "覚え具合を4段階で答えると、次の復習日を調整。今日の復習を開くだけで、その日に取り組むカードがわかります。", illustration: "review" },
];

export default function HomePage() {
  return (
    <div className="landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">ENGLISH → YOUR MEMORY</p>
          <h1 id="landing-title">英単語を、<br />ぽんっと単語帳に。<span>使える記憶へ、軽やかに。</span></h1>
          <p className="landing-lead">覚えたい言葉を集めたら、訳・例文・音声つきのカードに。<br />つくる時間も、復習のタイミングも。<br />Tannotが、あなたの学びをそっと手伝います。</p>
          <div className="hero-actions"><StartLearningLink /><a className="button secondary" href="#how-it-works">使い方を見る <span aria-hidden="true">↓</span></a></div>
          <p className="landing-note">無料プランで、単語帳3冊・各100枚まで。</p>
        </div>
        <LandingDemo />
      </section>

      <div className="landing-intro" aria-label="Tannotの学習サイクル"><span>あなたの「覚えたい」を、</span><p><strong>集める</strong><span aria-hidden="true">→</span><strong>聞く</strong><span aria-hidden="true">→</span><strong>思い出す</strong></p><span>毎日の小さな習慣に。</span></div>

      <section className="landing-section" id="features" aria-labelledby="features-title">
        <div className="landing-section-heading"><p className="eyebrow">LESS PREP, MORE LEARNING</p><h2 id="features-title">準備は少なく。<br />学びは、あなたのペースで。</h2><p>単語帳をつくって終わりにしない。覚えるところまで、ひとつの場所で。</p></div>
        <div className="landing-features">
          {features.map((feature) => <article className="panel landing-feature" key={feature.number}>
            <div className={`landing-feature-art landing-art-${feature.illustration}`} aria-hidden="true">
              {feature.illustration === "words" && <><span className="landing-word-chip">discover</span><span className="landing-word-chip">一枚のカードに ↗</span></>}
              {feature.illustration === "sound" && <><span className="landing-sound-word">Hello!</span><div className="landing-wave">{[18, 32, 48, 26, 40, 56, 32, 18, 36].map((height, index) => <i key={index} style={{ height }} />)}</div></>}
              {feature.illustration === "review" && <><div className="landing-review-days"><span>今日</span><span>数日後</span><span>その先</span></div><span className="landing-review-line">● · · · ● · · · · · ●</span><span className="landing-review-note">覚え具合に合わせて、少しずつ。</span></>}
            </div>
            <p className="landing-feature-label">{feature.number} / {feature.label}</p><h3>{feature.title}</h3><p>{feature.description}</p>
          </article>)}
        </div>
      </section>

      <section className="landing-section landing-how panel" id="how-it-works" aria-labelledby="how-title">
        <div className="landing-section-heading"><p className="eyebrow">READY, SET, LEARN!</p><h2 id="how-title">はじめの一歩は、<br />覚えたい単語から。</h2><p>授業で出会った言葉も、映画で気になったフレーズも。<br />あなたに必要な言葉で、学びを始めましょう。</p><StartLearningLink label="自分の単語帳を作る" /></div>
        <ol className="landing-steps">
          <li><span className="landing-step-number" aria-hidden="true">1</span><div><h3>覚えたい言葉を、まとめて入力。</h3><p>ログインして単語帳を作ったら、英単語や熟語を改行・カンマ区切りで入力します。</p><div className="landing-input-example">discover, little by little, remember</div></div></li>
          <li><span className="landing-step-number" aria-hidden="true">2</span><div><h3>訳と例文を確認して、カードに。</h3><p>検索結果を確認して追加。自分に合う訳や例文に編集することもできます。</p></div></li>
          <li><span className="landing-step-number" aria-hidden="true">3</span><div><h3>聞いて、思い出して、また明日。</h3><p>音声を聞き、意味を思い出して答え合わせ。覚え具合に合わせて、次の復習へつなげます。</p></div></li>
        </ol>
      </section>

      <section className="landing-section landing-faq" aria-labelledby="faq-title">
        <div className="landing-section-heading"><p className="eyebrow">GOOD TO KNOW</p><h2 id="faq-title">はじめる前に、<br />気になること。</h2><Link className="text-button" href="/support">お問い合わせ <span aria-hidden="true">↗</span></Link></div>
        <div className="landing-questions">
          <details><summary>無料でも使えますか？</summary><p>無料プランで単語帳3冊、1冊につき100枚まで作れます。音声読み上げと間隔反復学習も利用できます。さらにたくさん学びたい方にはプレミアムをご用意しています。<Link href="/pricing">料金プランを見る</Link></p></details>
          <details><summary>何を用意すれば始められますか？</summary><p>Googleアカウントと、覚えたい英単語があれば始められます。アプリのインストールは不要で、ブラウザから使えます。</p></details>
          <details><summary>どんな単語でもカードにできますか？</summary><p>英単語や熟語を入力できます。辞書や例文が見つからない場合は検索結果でお知らせします。追加したカードの訳や例文は、あとから編集できます。</p></details>
          <details><summary>スマートフォンでも音声を聞けますか？</summary><p>音声読み上げに対応したブラウザで利用できます。声や発音は端末・ブラウザによって異なります。音声が使えない環境でも、文字での学習は続けられます。</p></details>
        </div>
      </section>

      <section className="landing-cta panel pop-shadow" aria-labelledby="start-title">
        <span className="landing-cta-spark" aria-hidden="true">✦</span><p className="eyebrow">ONE WORD AT A TIME</p><h2 id="start-title">今日のひとことを、<br />明日の「わかる」に。</h2><p>まずは気になる単語をひとつ。あなたの単語帳を育ててみませんか。</p>
        <div className="hero-actions"><StartLearningLink /><Link className="button secondary" href="/pricing">料金プランを見る</Link></div>
      </section>
    </div>
  );
}
