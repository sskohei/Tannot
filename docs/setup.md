# 開発・デプロイ手順

## ローカル開発

1. Node.js のプロジェクト推奨バージョンを確認する。
2. 依存関係をインストールする。
3. `.env.example` を `.env.local` にコピーし、Google OAuth、Better Auth、Stripe の値を設定する。
4. Wrangler にR2バケットを作成し、ローカル開発用のR2 Bindingを設定する。
5. Wrangler の D1 ローカルデータベースへマイグレーションを適用する。
6. 開発サーバーを起動する。

具体的なコマンドはアプリ実装時に `package.json` と `.env.example` に追加し、この文書と一致させます。秘密情報はコミットしません。

## 本番環境

- Cloudflare Workers の secret と環境変数を、本番・ステージングで分離する。
- D1 の本番マイグレーションは適用対象と順序を確認してから実行する。
- Google OAuth の redirect URI と Stripe webhook endpoint は環境ごとに登録する。
- R2バケットを本番・ステージング・ローカルで分離し、Workers にR2 Bindingを設定する。
- 本番音声はR2 Custom Domain経由で配信し、共有音声にCache Rulesを設定する。`r2.dev` は本番配信に使用しない。
- R2に保存する音声は、適切な `Content-Type`（例: `audio/mpeg`）とキャッシュ設定を付ける。
- デプロイ後にログイン、単語帳作成、音声再生、レビュー保存、Checkout、webhook を確認する。
- webhook は再送される前提で、`stripe_events` による冪等性を確認する。

## 必須情報の例

`BETTER_AUTH_SECRET`、Google OAuth の client ID/secret、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、D1 binding 名、R2 bucket binding 名、R2 Custom Domain。実際の変数名は実装の設定ファイルを正とします。
