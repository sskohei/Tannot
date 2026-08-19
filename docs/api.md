# API 契約（MVP）

ベースパスは `/api` です。APIはHonoで実装し、Next.jsの `/app/api/[[...route]]` とCloudflare Workerの両方から同じルーターを利用します。認証が必要なエンドポイントは、未認証時に `401` を返します。

| Method | Path | 内容 |
| --- | --- | --- |
| GET | `/api/me` | 現在のユーザーと利用枠 |
| POST | `/api/books` | 入力リストから単語帳を作成 |
| GET | `/api/books` | 自分の単語帳一覧 |
| GET | `/api/books/:bookId` | 自分の単語帳詳細 |
| POST | `/api/books/:bookId/cards` | 自分の単語帳に単語を追加 |
| DELETE | `/api/books/:bookId` | 自分の単語帳を削除 |
| GET | `/api/study/next?bookId=` | 次に学習するカード |
| POST | `/api/study/reviews` | 評価を保存し次回復習日を返す |
| POST | `/api/billing/checkout` | Stripe Checkout セッション作成 |
| POST | `/api/billing/webhook` | Stripe webhook（署名検証必須） |

`GET /api/study/next` は `reveal=true` を指定したときだけ訳・例文を返します。通常の取得では英単語とカードIDだけを返し、解答前の情報をクライアントへ渡しません。音声は、学習画面に表示済みの英単語または例文をブラウザのWeb Speech APIで読み上げます。音声データを返すAPIは提供しません。

`POST /api/study/reviews` の入力は `{ "cardId": "...", "rating": "again|hard|good|easy", "requestId": "..." }` です。`requestId` は再送時にも同じ値を使い、レビューの二重適用を防ぎます。

`POST /api/books` の入力は `{ "title": "...", "input": "run\\ngive up" }` です。入力は最大100件、1項目100文字、全体10,000文字に制限します。空行・重複は正規化して除外します。

`POST /api/books/:bookId/cards` の入力は `{ "input": "review\\nmake progress" }` です。単語帳の所有者だけが利用でき、単語の制限は単語帳作成時と同じです。既存カードと同じ単語はスキップし、追加されたカードとスキップされた単語を返します。

## エラー形式

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "入力を確認してください" } }
```

内部エラーのスタック、SQL、秘密情報はレスポンスに含めません。入力件数・文字数・利用枠超過は `400` または `429` として明示します。
