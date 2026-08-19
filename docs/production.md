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

本番には `db/seed.sql` をそのまま投入しません。開発用seedには検証用の例文が含まれるため、本番データはライセンス確認済みのインポート手順を使います。

## 音声推論サービス

音声ファイルはR2などへ保存せず、再生時にWorkerからKokoro推論サービスへリクエストします。本番とステージングで推論サービスのURL・認証情報を分離し、`AUDIO_GENERATOR_URL` と認証secretはWorker secretまたは環境変数として設定します。

Kokoro-82Mの推論はWorkers内で実行せず、CPUまたはGPUを備えた外部サービスで実行します。Workerはカードの所有権を確認した上で音声レスポンスを中継し、音声ファイルやURLを保存しません。

## デプロイ前チェック

```bash
npm run check:production-config
npm run lint
npm run typecheck
npm test
npm run build
```

ステージングWorkerのデプロイは `npm run deploy -- --env staging` で実行します。デプロイ前に、ステージング用のCloudflare secret、Kokoro推論エンドポイント、OAuth/Stripe endpointを登録し、本番のsecret・データベース・推論サービス設定を共有していないことを確認します。

`CLOUDFLARE_API_TOKEN` がない場合、Wranglerのremote確認・migrationは実行できません。tokenとKokoro接続secretはリポジトリへ保存せず、CloudflareまたはCIのsecretとして設定します。
