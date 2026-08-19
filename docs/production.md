# 本番Cloudflareリソース

本番Workerは `wrangler.jsonc` を使います。ローカル用のD1データは `.wrangler/state` に保存され、本番D1とは別です。

## D1

本番D1のdatabase IDは次の値を設定済みです。

```text
97d7b5bd-3c01-468c-ac2d-dfa5cb342c22
```

Cloudflare API tokenを設定した環境で、次のコマンドで情報を確認します。

```bash
npx wrangler d1 info tannot-db
npx wrangler d1 migrations apply tannot-db --remote
```

本番には `db/seed.sql` をそのまま投入しません。開発用seedには検証用の例文が含まれるため、本番データはライセンス確認済みのインポート手順を使います。

## R2

本番音声バケット名は `tannot-audio` です。Cloudflareアカウントに未作成の場合だけ、次のコマンドで作成します。

```bash
npx wrangler r2 bucket list
npx wrangler r2 bucket create tannot-audio
```

R2 Custom Domain、DNS、Cache Rulesは本番ドメインに合わせてCloudflare Dashboardで設定します。`r2.dev` とlocalhostは本番設定に使用しません。

## デプロイ前チェック

```bash
npm run check:production-config
npm run lint
npm run typecheck
npm test
npm run build
```

`CLOUDFLARE_API_TOKEN` がない場合、Wranglerのremote確認・migration・R2操作は実行できません。tokenはリポジトリへ保存せず、CloudflareまたはCIのsecretとして設定します。
