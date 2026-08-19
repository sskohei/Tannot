# アーキテクチャ

```text
Browser
  ├─ Next.js UI
  ├─ Better Auth session
  └─ Web Speech API（端末の音声合成）
          │
Cloudflare Workers
  └─ Hono API
      ├─ Auth / ownership checks
      ├─ Static dictionary & example lookup
      ├─ Stripe service / webhook
      └─ D1 repository
          └─ users / books / cards / reviews / billing

Worker static assets
  └─ public/data/lookup/*.json (EJDict + Tatoeba, read-only)
```

## 単語帳作成フロー

入力を検証・正規化し、Worker 静的アセットの検索用JSONから訳と例文を検索する。EJDict と Tatoeba の候補選定・正規化はオフラインで行い、Tatoeba の出典 ID を保持する。検索結果はカード作成時に D1 のカードへスナップショット保存する。学習画面では、表示済みの英単語または例文をブラウザのWeb Speech APIへ渡して読み上げる。読み上げに対応しないブラウザでも、テキストカードと学習機能は利用可能にする。

音声本体、object key、固定URL、生成状態はD1やオブジェクトストレージに保存しない。音声はカードのテキストがブラウザへ返された後、クライアント側だけで処理する。

データソースはアプリのリクエストごとに外部取得するのではなく、利用条件を確認した上でインポートした検索用データを優先する。元データの更新日とインポート手順を記録する。

## 境界

- Next.js: 表示、入力、Web Speech APIによる音声再生、API 呼び出し。
- Hono: 認証済みリクエストの検証、所有権確認、業務処理、D1 アクセス。
- 静的アセット: EJDict / Tatoeba の読み取り専用検索データ。ユーザー入力や学習状態は保存しない。
- D1: ユーザー、単語帳、カード、学習履歴、サブスクリプション状態。
- 端末の音声合成エンジン: Web Speech APIから渡された英単語・例文を読み上げる。利用できる声質・言語は端末やブラウザに依存する。

## 音声の保存・配信方針

- 音声は再生操作時にブラウザ内で合成し、WorkerやR2などの永続ストレージは使用しない。
- 読み上げ対象は認証済みAPIから取得し、解答前の訳・例文をブラウザへ渡さない既存の制約を維持する。
- 端末ごとに音声が異なるため、アプリケーションは特定の声質や音声ファイルの再現性を保証しない。

基本構成は「検索データは静的アセット、作成済みカードのスナップショットはD1、読み上げはブラウザのWeb Speech API」とする。
