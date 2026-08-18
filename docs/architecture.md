# アーキテクチャ

```text
Browser
  ├─ Next.js UI
  └─ Better Auth session
          │
Cloudflare Workers
  └─ Hono API
      ├─ Auth / ownership checks
      ├─ Dictionary & example service
      ├─ Audio service (Kokoro → R2)
      ├─ Stripe service / webhook
      ├─ D1 repository
      └─ R2 repository
```

## 単語帳作成フロー

入力を検証・正規化し、EJDict で訳を検索する。Tatoeba は入力語を含む英語例文から候補を選び、出典 ID と作者情報を保持する。その後、Kokoro-82M で英単語と例文の音声を生成し、R2 に保存する。音声生成を非同期で行う場合は、音声が完成する前にテキストカードを保存し、生成状態を更新する。音声が失敗した項目もテキストカードとして利用できるようにする。

音声オブジェクトは、音声本文・音声種別・モデルバージョン・生成設定からハッシュを作り、同じ音声の重複生成を避ける。R2 の object key は D1 に保存し、D1 に音声バイナリや固定 URL を保存しない。

データソースはアプリのリクエストごとに外部取得するのではなく、利用条件を確認した上でインポートした検索用データを優先する。元データの更新日とインポート手順を記録する。

## 境界

- Next.js: 表示、入力、音声再生、API 呼び出し。
- Hono: 認証済みリクエストの検証、所有権確認、業務処理、D1 アクセス。
- D1: ユーザー、単語帳、カード、学習履歴、サブスクリプション状態。
- R2: 生成済み音声（MP3 など）の保存。Workers の R2 Binding から読み書きする。
- Cloudflare Cache: 本番の共有音声を Custom Domain 経由でキャッシュする。

## 音声の保存・配信方針

- 開発環境では `r2.dev` を使用してよいが、本番ではR2のCustom Domainを使用する。
- 本番の共有音声は、長い `Cache-Control` と不変のハッシュ付き object key を設定してキャッシュする。
- 音声がユーザー固有または将来有料限定になる場合は、公開バケットにせず、Honoで認証してから配信するか期限付きURLを発行する。
- `r2.dev` は開発用途とし、本番のアクセス制御・WAF・キャッシュを必要とする配信には使用しない。
- Workers の CPU・実行時間制約を考慮し、Kokoro の推論はWorkers内に固定せず、非同期ジョブまたは対応する推論基盤を採用できる設計にする。

基本構成は「音声本体はR2、音声の参照情報と生成状態はD1、配信はCustom Domain＋Cache」とする。
