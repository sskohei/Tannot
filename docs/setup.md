# 開発・デプロイ手順

## ローカル開発

1. Node.js 22 以上を用意する。
2. `npm ci` で依存関係をインストールする。
3. `.env.example` を `.env.local` にコピーし、Google OAuth、Better Auth、Stripe の値を設定する。
4. `npx wrangler d1 migrations apply tannot --local` でローカルD1へマイグレーションを適用する。
5. `npx wrangler d1 execute tannot --local --file=db/seed.sql` で開発用データを投入する。
6. `npm run dev` でNext.jsを起動する。Cloudflare Worker相当の環境で確認する場合は `npm run preview` を使う。

### ローカルのStripe決済テスト

**Checkoutの完了だけではローカルのプランは更新されません。** 契約状態は `/api/billing/webhook` が受信したイベントからD1へ保存します。Stripeからlocalhostへ直接配信はできないため、決済前から別ターミナルでStripe CLIの転送を起動し、テスト中は動かし続けてください。

1. `.env.local` のStripeキーと価格が同じテスト環境のものになっていることを確認します。Stripe CLIも `stripe login` で同じアカウント・テスト環境を使用します。
2. 次のコマンドで転送を開始します。開発サーバーが3000以外のポートを使用している場合は、転送先も合わせます。

```bash
stripe listen \
  --events checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed,customer.subscription.trial_will_end,invoice.paid,invoice.payment_failed,invoice.payment_action_required,invoice.finalization_failed \
  --forward-to http://localhost:3000/api/billing/webhook
```

3. `stripe listen` に表示されたローカル用の署名シークレットを `.env.local` の `STRIPE_WEBHOOK_SECRET` へ設定し、Next.jsを再起動します。DashboardのWebhookエンドポイント用シークレットとは異なります。値をログ・PR・チャットへ貼り付けないでください。
4. アプリにログインし、設定画面からCheckoutへ進みます。`stripe trigger` の汎用データではアプリのユーザーに紐付く契約を検証できません。
5. 転送ターミナルで `checkout.session.completed` または `customer.subscription.created` に対するHTTP 200を確認します。
6. 設定画面を再読み込みし、「プレミアム（無料トライアル中）」または「プレミアム」になることを確認します。現在の設定画面は契約情報を初回表示時に取得するため、戻った直後にWebhook処理がまだ終わっていない場合は再読み込みが必要です。

### Checkout完了後も無料プランのままの場合

再度Checkoutを作成する前に、イベントの反映状況を確認してください。Stripe側にすでに契約がある状態で申込みを繰り返すと、重複契約につながります。

| 確認結果 | 確認・対処すること |
| --- | --- |
| CLIにイベントが表示されない | 決済時に転送が動いていたか、Stripeキー・価格・CLIのテスト環境が一致しているかを確認する。決済後に `stripe listen` を起動しても過去のイベントは自動では転送されない。 |
| 接続エラー・404 | 開発サーバーの実際のポートと `/api/billing/webhook` の転送先を確認する。Windows側でCLIを動かす場合は、その端末からWSLの開発サーバーへ到達できることも確認する。 |
| 400 `INVALID_SIGNATURE` | `stripe listen` の署名シークレットが設定されているか確認し、変更後はNext.jsを再起動する。 |
| 503 `BILLING_NOT_CONFIGURED` | ローカルの `STRIPE_SECRET_KEY` と `STRIPE_WEBHOOK_SECRET` が読み込まれているか確認する。 |
| 500 | サーバーログの `stripe_webhook_failed`、D1のマイグレーション適用状況、Stripe APIへの接続・権限を確認する。失敗イベントは処理済みにならないため、原因解消後に再送できる。 |
| 200でも表示が変わらない | 設定画面を再読み込みする。契約の `metadata.userId` がログイン中ユーザーと一致するか、アプリと確認先D1が同じ環境かを確認する。 |

ローカルDBの件数と契約状態は、個人情報やキーを表示せずに確認できます。

```bash
npx wrangler d1 execute tannot --local --command="SELECT status, COUNT(*) AS count FROM subscriptions GROUP BY status; SELECT COUNT(*) AS processed_events FROM stripe_events;"
```

Stripe側の契約が `active` / `trialing` で、ローカルの `subscriptions` と `stripe_events` が両方空なら、Webhookが正常に処理されていない状態です。Checkoutの戻り先URLにある `billing=success` は決済の証明として使用しません。

取り逃したイベントを復旧する場合は、実際にアプリから作成したテスト用Checkoutに対応するイベントを使用します。登録済みWebhook宛ての再送はStripeのWorkbenchまたは `stripe events resend` で行えますが、`stripe listen` のローカル転送先は登録済みエンドポイントとは別です。ローカルへ再現する際は、対象イベントがテストモード・対象ユーザーのものと確認したうえで、ローカル用署名を付けて再送します。DBを手動で `active` に書き換えたり、署名検証を無効化したりしないでください。

参考: [ローカルWebhook転送](https://docs.stripe.com/webhooks#test-locally-without-a-registered-url)、[署名検証のトラブルシューティング](https://docs.stripe.com/webhooks/signature)。

秘密情報はコミットしません。Cloudflare Workersへデプロイする場合は `npm run deploy` を使います。ステージングは `npm run deploy -- --env staging` を使います。

## 本番環境

- Cloudflare Workers の secret と環境変数を、本番・ステージングで分離する。
- D1 の本番マイグレーションは適用対象と順序を確認してから実行する。
- Google OAuth の redirect URI と Stripe webhook endpoint は環境ごとに登録する。
- 音声ファイルは保存せず、ブラウザのWeb Speech APIで再生時に読み上げる。
- Web Speech APIは端末・OS・ブラウザの音声合成エンジンを利用するため、音声サービス用のWorker secretは不要とする。
- 本番リソースのdatabase_idとremote migration手順は [`docs/production.md`](./production.md) を確認する。
- デプロイ後にログイン、単語帳作成、音声再生、レビュー保存、Checkout、webhook を確認する。
- webhook は再送される前提で、処理成功後だけ `stripe_events` に記録され、処理失敗時の再送で回復できることを確認する。
- Stripe Dashboardの動的決済手段でカード、Apple Pay、Google Payを有効化し、本番・ステージングそれぞれのHTTPSドメインをPayment method domainsとして登録する。Customer Portalでは、支払い方法の更新、請求書の閲覧、期間末での解約を有効化する。

## 必須情報の例

`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_ID`、`FREE_BOOK_LIMIT`、`FREE_CARDS_PER_BOOK_LIMIT`、D1 binding名。実際の変数名は `.env.example` と `wrangler.jsonc` を正とします。

## Google OAuth redirect URI

- ローカル: `http://localhost:3000/api/auth/callback/google`
- 本番: `https://<本番ドメイン>/api/auth/callback/google`

## データ取り込み

EJCSV のビルド済み SQLite (`ejcsv.db`) を取得した場合は、`npx tsx scripts/build-lookup-assets.ts path/to/ejcsv.db public/data/lookup <EJCSVのコミットまたは版>` で Worker 用の検索アセットを生成できます。生成物を確認してからデプロイしてください。辞書・例文データの D1 migration や D1 への投入は行いません。

検索データを更新する場合は、EJCSV のデータビルド版を更新してから同じコマンドで静的アセットを再生成します。生成された `manifest.json` の版と、ライセンス・取得日を `docs/data-and-licenses.md` に記録します。
