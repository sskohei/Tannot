# 開発・デプロイ手順

## ローカル開発

1. Node.js 22 以上を用意する。
2. `npm ci` で依存関係をインストールする。
3. `.env.example` を `.env.local` にコピーし、Google OAuth、Better Auth、Stripe の値を設定する。
4. `npx wrangler d1 migrations apply tannot --local` でローカルD1へマイグレーションを適用する。
5. `npx wrangler d1 execute tannot --local --file=db/seed.sql` で開発用データを投入する。
6. `npm run dev` でNext.jsを起動する。Cloudflare Worker相当の環境で確認する場合は `npm run preview` を使う。

Stripe webhookをローカルで確認する場合は別ターミナルでStripe CLIを起動し、表示されたローカル用の`whsec_...`を`.env.local`の`STRIPE_WEBHOOK_SECRET`へ設定します。

```bash
stripe listen \
  --events checkout.session.completed,checkout.session.expired,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.trial_will_end,invoice.paid,invoice.payment_failed,invoice.payment_action_required,invoice.finalization_failed \
  --forward-to http://localhost:3000/api/billing/webhook
```

秘密情報はコミットしません。Cloudflare Workersへデプロイする場合は `npm run deploy` を使います。ステージングは `npm run deploy -- --env staging` を使います。

## 本番環境

- Cloudflare Workers の secret と環境変数を、本番・ステージングで分離する。
- D1 の本番マイグレーションは適用対象と順序を確認してから実行する。
- Google OAuth の redirect URI と Stripe webhook endpoint は環境ごとに登録する。
- 音声ファイルは保存せず、ブラウザのWeb Speech APIで再生時に読み上げる。
- Web Speech APIは端末・OS・ブラウザの音声合成エンジンを利用するため、音声サービス用のWorker secretは不要とする。
- 本番リソースのdatabase_idとremote migration手順は [`docs/production.md`](./production.md) を確認する。
- デプロイ後にログイン、単語帳作成、音声再生、レビュー保存、Checkout、webhook を確認する。
- webhook は再送される前提で、`stripe_events` による冪等性を確認する。
- Stripe Dashboardの動的決済手段でカード、Apple Pay、Google Payを有効化し、本番・ステージングそれぞれのHTTPSドメインをPayment method domainsとして登録する。Customer Portalでは、支払い方法の更新、請求書の閲覧、期間末での解約を有効化する。

## 必須情報の例

`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_ID`、`FREE_BOOK_LIMIT`、`FREE_CARDS_PER_BOOK_LIMIT`、D1 binding名。実際の変数名は `.env.example` と `wrangler.jsonc` を正とします。

## Google OAuth redirect URI

- ローカル: `http://localhost:3000/api/auth/callback/google`
- 本番: `https://<本番ドメイン>/api/auth/callback/google`

## データ取り込み

EJCSV のビルド済み SQLite (`ejcsv.db`) を取得した場合は、`npx tsx scripts/build-lookup-assets.ts path/to/ejcsv.db public/data/lookup <EJCSVのコミットまたは版>` で Worker 用の検索アセットを生成できます。生成物を確認してからデプロイしてください。辞書・例文データの D1 migration や D1 への投入は行いません。

検索データを更新する場合は、EJCSV のデータビルド版を更新してから同じコマンドで静的アセットを再生成します。生成された `manifest.json` の版と、ライセンス・取得日を `docs/data-and-licenses.md` に記録します。
