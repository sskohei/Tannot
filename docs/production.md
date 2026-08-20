# 本番Cloudflareリソース

本番Workerは `wrangler.jsonc` のデフォルト設定、ステージングWorkerは `--env staging` を使います。ローカル用のD1データは `.wrangler/state` に保存され、本番・ステージングD1とは別です。

## D1

本番D1（Cloudflare上の名前 `tannot`）のdatabase IDは次の値を設定済みです。

```text
97d7b5bd-3c01-468c-ac2d-dfa5cb342c22
```

Cloudflare API tokenを設定した環境で、次のコマンドで情報を確認します。

```bash
npx wrangler d1 info tannot
npx wrangler d1 migrations apply tannot --remote
```

ステージングD1は `tannot-staging`（database ID: `83eb9c6e-25f3-439a-b224-83417cf9b4e8`）です。ステージングへ適用する場合は `--env staging` を付けます。

```bash
npx wrangler d1 info tannot-staging --env staging
npx wrangler d1 migrations apply tannot-staging --remote --env staging
```

本番には `db/seed.sql` をそのまま投入しません。辞書・例文はD1へ投入せず、ライセンス確認済みの静的検索アセットをWorkerへデプロイします。

## 音声読み上げ

音声ファイルはR2などへ保存せず、学習画面でブラウザのWeb Speech APIを使って読み上げます。音声合成は端末・OS・ブラウザが提供するため、本番・ステージングWorkerへ音声サービスのURLや認証secretを設定する必要はありません。

## デプロイ前チェック

```bash
npm run check:production-config
npm run lint
npm run typecheck
npm test
npm run build
```

## プレミアム公開前チェック

- Stripeの本番Product / Priceを「プレミアム・月額500円（税込）」として作成し、`STRIPE_PRICE_ID`を設定する。
- Stripe Checkoutの決済手段でカード、Apple Pay、Google Payを有効にする。Apple Pay・Google Payを表示する本番ドメインおよびステージングドメインは、Stripe DashboardのPayment method domainsへ登録する。
- Stripe Customer Portalで、支払い方法の更新、請求書の閲覧、期間末での解約を有効にし、返却先URLを本番ドメインへ設定する。
- `customer.subscription.created`、`customer.subscription.updated`、`customer.subscription.deleted`、`checkout.session.completed` を本番webhook endpointへ送信する。
- 料金、利用規約、プライバシーポリシー、特定商取引法に基づく表記を公開状態で確認する。

ステージングWorkerのデプロイは `npm run deploy -- --env staging` で実行します。デプロイ前に、ステージング用のCloudflare secret、OAuth/Stripe endpointを登録し、本番のsecret・データベース設定を共有していないことを確認します。

`CLOUDFLARE_API_TOKEN` がない場合、Wranglerのremote確認・migrationは実行できません。tokenはリポジトリへ保存せず、CloudflareまたはCIのsecretとして設定します。
