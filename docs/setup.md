# 開発・デプロイ手順

## ローカル開発

1. Node.js のプロジェクト推奨バージョンを確認する。
2. 依存関係をインストールする。
3. `.env.example` を `.env.local` にコピーし、Google OAuth、Better Auth、Stripe の値を設定する。
4. Wrangler の D1 ローカルデータベースへマイグレーションを適用する。
5. 開発サーバーを起動する。

具体的なコマンドはアプリ実装時に `package.json` と `.env.example` に追加し、この文書と一致させます。秘密情報はコミットしません。

## 本番環境

- Cloudflare Workers の secret と環境変数を、本番・ステージングで分離する。
- D1 の本番マイグレーションは適用対象と順序を確認してから実行する。
- Google OAuth の redirect URI と Stripe webhook endpoint は環境ごとに登録する。
- デプロイ後にログイン、単語帳作成、音声再生、レビュー保存、Checkout、webhook を確認する。
- webhook は再送される前提で、`stripe_events` による冪等性を確認する。

## 必須情報の例

`BETTER_AUTH_SECRET`、Google OAuth の client ID/secret、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、D1 binding 名、音声ストレージの binding 名。実際の変数名は実装の設定ファイルを正とします。

