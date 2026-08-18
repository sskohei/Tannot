# API 契約（MVP）

実際のベースパスは実装時に確定します。以下のエンドポイントは Hono の契約案です。認証が必要なエンドポイントは、未認証時に `401` を返します。

| Method | Path | 内容 |
| --- | --- | --- |
| GET | `/api/me` | 現在のユーザーと利用枠 |
| POST | `/api/books` | 入力リストから単語帳を作成 |
| GET | `/api/books` | 自分の単語帳一覧 |
| GET | `/api/books/:bookId` | 自分の単語帳詳細 |
| DELETE | `/api/books/:bookId` | 自分の単語帳を削除 |
| GET | `/api/study/next?bookId=` | 次に学習するカード |
| POST | `/api/study/reviews` | 評価を保存し次回復習日を返す |
| POST | `/api/billing/checkout` | Stripe Checkout セッション作成 |
| POST | `/api/billing/webhook` | Stripe webhook（署名検証必須） |

## エラー形式

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "入力を確認してください" } }
```

内部エラーのスタック、SQL、秘密情報はレスポンスに含めません。入力件数・文字数・利用枠超過は `400` または `429` として明示します。

