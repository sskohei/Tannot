# Tannot

英単語リストから、音声付きの単語帳を作って学習できる Web アプリです。`run,give up` のように入力すると、辞書データと例文データを組み合わせてカードを生成します。

## 主な体験

1. 利用者が英単語・熟語のリストを入力する。
2. EJDict から日本語訳を取得し、Tatoeba から例文を取得する。
3. ブラウザのWeb Speech APIで英単語または例文を読み上げる。
4. 作成された単語帳を学習する。最初は英単語と英単語音声だけを表示する。
5. 「解答」を押すと日本語訳・例文・例文音声を表示し、4段階評価で次回復習日を更新する。

## 技術スタック

| 領域 | 採用技術 |
| --- | --- |
| 辞書 | EJDict（CC0） |
| 例文 | Tatoeba（CC BY 2.0 FR） |
| 音声 | Web Speech API（端末の音声合成エンジン） |
| フロントエンド | Next.js / TypeScript |
| API | Hono.js |
| 実行・デプロイ | Cloudflare Workers |
| データベース | Cloudflare D1（SQLite） |
| 音声生成・配信 | ブラウザ上で再生時に読み上げ（音声ファイルは保存しない） |
| 認証 | Better Auth（Google OAuth のみ） |
| 決済 | Stripe |

## 開発を始める

現時点では設計文書を先に整備した段階です。アプリ本体が追加された後は、プロジェクトの `package.json` に定義されたコマンドを使用してください。環境変数の名前とローカル起動手順は [`docs/setup.md`](./docs/setup.md) に集約します。

## 文書

- [`docs/requirements.md`](./docs/requirements.md): 要件、画面、受け入れ条件
- [`docs/architecture.md`](./docs/architecture.md): システム構成と処理フロー
- [`docs/database.md`](./docs/database.md): D1 のデータモデルと認可方針
- [`docs/api.md`](./docs/api.md): API の公開契約
- [`docs/learning.md`](./docs/learning.md): 間隔反復とカード状態
- [`docs/data-and-licenses.md`](./docs/data-and-licenses.md): データ出典・帰属・配布時の注意
- [`docs/setup.md`](./docs/setup.md): 開発・デプロイ・秘密情報の管理
- [`docs/production.md`](./docs/production.md): 本番Cloudflareリソースとデプロイ前チェック

## ライセンス・データ表示

アプリケーションコードのライセンスは未決定です。第三者データの利用条件はコードのライセンスとは別に適用されます。EJDict、Tatoeba の出典とライセンス表示を削除しないでください。詳細は [`docs/data-and-licenses.md`](./docs/data-and-licenses.md) を参照してください。
