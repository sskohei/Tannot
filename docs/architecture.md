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
      ├─ Audio service (Kokoro)
      ├─ Stripe service / webhook
      └─ D1 repository
```

## 単語帳作成フロー

入力を検証・正規化し、EJDict で訳を検索する。Tatoeba は入力語を含む英語例文から候補を選び、出典 ID と作者情報を保持する。その後、音声生成を同期または非同期で行い、音声が失敗した項目もテキストカードとして保存する。

データソースはアプリのリクエストごとに外部取得するのではなく、利用条件を確認した上でインポートした検索用データを優先する。元データの更新日とインポート手順を記録する。

## 境界

- Next.js: 表示、入力、音声再生、API 呼び出し。
- Hono: 認証済みリクエストの検証、所有権確認、業務処理、D1 アクセス。
- D1: ユーザー、単語帳、カード、学習履歴、サブスクリプション状態。
- 音声ストレージ: 音声バイナリそのもの。保存先は Workers から安全に参照できる構成（例: R2）を別途決定する。

Workers の CPU・実行時間制約を考慮し、Kokoro の推論は Workers 内に固定せず、非同期ジョブまたは対応する推論基盤を採用できる設計にする。

