import lookupManifest from "@/public/data/lookup/manifest.json";

const mitLicense = `MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const packages = [
  ["ts-fsrs", "5.4.1", "Copyright (c) 2026 Open Spaced Repetition", "https://github.com/open-spaced-repetition/ts-fsrs", "https://github.com/open-spaced-repetition/ts-fsrs/blob/main/LICENSE"],
  ["@opennextjs/cloudflare", "1.20.2", "Copyright (c) 2020 Cloudflare, Inc.", "https://github.com/opennextjs/opennextjs-cloudflare", "https://github.com/opennextjs/opennextjs-cloudflare/blob/main/LICENSE"],
  ["@stripe/stripe-js", "7.9.0", "Copyright (c) 2017 Stripe", "https://github.com/stripe/stripe-js", "https://github.com/stripe/stripe-js/blob/master/LICENSE"],
  ["better-auth", "1.7.1", "Copyright (c) 2024 - present, Bereket Engida", "https://github.com/better-auth/better-auth", "https://github.com/better-auth/better-auth/blob/main/LICENSE.md"],
  ["hono", "4.13.3", "Copyright (c) 2021 - present, Yusuke Wada and Hono contributors", "https://github.com/honojs/hono", "https://github.com/honojs/hono/blob/main/LICENSE"],
  ["next", "16.3.1", "Copyright (c) 2025 Vercel, Inc.", "https://github.com/vercel/next.js", "https://github.com/vercel/next.js/blob/canary/license.md"],
  ["react", "19.2.8", "Copyright (c) Meta Platforms, Inc. and affiliates.", "https://github.com/facebook/react", "https://github.com/facebook/react/blob/main/LICENSE"],
  ["react-dom", "19.2.8", "Copyright (c) Meta Platforms, Inc. and affiliates.", "https://github.com/facebook/react", "https://github.com/facebook/react/blob/main/LICENSE"],
  ["stripe", "22.5.0", "Copyright (C) 2011 Ask Bjørn Hansen; Copyright (C) 2013 Stripe, Inc.", "https://github.com/stripe/stripe-node", "https://github.com/stripe/stripe-node/blob/master/LICENSE"],
] as const;

export default function LicensesPage() {
  return (
    <section className="stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPEN SOURCE</p>
          <h1>OSS・データのライセンス</h1>
          <p>本アプリで利用している第三者ソフトウェアとデータの帰属情報です。</p>
        </div>
      </div>

      <section className="info-panel stack">
        <div className="section-title"><h2>ソフトウェア</h2></div>
        <p>以下は、配布物に含まれる直接依存パッケージです。いずれもMITライセンスで提供されています。バージョンは公開中のロックファイルに基づきます。</p>
        <ul className="license-list">
          {packages.map(([name, version, copyright, source, licenseSource]) => (
            <li key={name}>
              <strong>{name}</strong> <span className="muted">v{version}</span>
              <br />{copyright} · <a href={source} target="_blank" rel="noopener noreferrer">公式リポジトリ</a> · <a href={licenseSource} target="_blank" rel="noopener noreferrer">ライセンス</a>
            </li>
          ))}
        </ul>
        <details>
          <summary>MIT License本文を表示</summary>
          <pre className="license-text">{mitLicense}</pre>
        </details>
      </section>

      <section className="info-panel stack">
        <div className="section-title"><h2>データ</h2></div>
        <p><a href="https://github.com/kujirahand/EJDict" target="_blank" rel="noopener noreferrer">EJDict</a>の辞書データは<a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0 1.0 Universal</a>です。本アプリではEJCSVに取り込んだ検索用データを利用しています。</p>
        <p><a href="https://tatoeba.org/" target="_blank" rel="noopener noreferrer">Tatoeba Project</a>の例文データは<a href="https://creativecommons.org/licenses/by/2.0/fr/" target="_blank" rel="noopener noreferrer">CC BY 2.0 FR</a>です。例文の出典リンクはカード上にも表示されます。</p>
        <p className="muted">公開中の検索アセット：{lookupManifest.source} {lookupManifest.sourceVersion}（生成日：{lookupManifest.generatedAt.slice(0, 10)}／{lookupManifest.entries.toLocaleString("ja-JP")}件）</p>
        <p className="muted">ユーザーが入力・編集した単語帳やカードに、このページの第三者ライセンスが付与されるものではありません。</p>
      </section>

      <section className="info-panel stack">
        <div className="section-title"><h2>プラットフォーム</h2></div>
        <p>Cloudflare Workers・D1、ブラウザのWeb Speech APIは実行環境・サービスとして利用しています。アプリケーションがそれらのソフトウェア本体を再配布するものではありません。</p>
      </section>
    </section>
  );
}
