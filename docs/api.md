# API 契約（MVP）

ベースパスは `/api` です。APIはHonoで実装し、Next.jsの `/app/api/[[...route]]` とCloudflare Workerの両方から同じルーターを利用します。認証が必要なエンドポイントは、未認証時に `401` を返します。

| Method | Path | 内容 |
| --- | --- | --- |
| GET | `/api/me` | 現在のユーザーと利用枠 |
| POST | `/api/account/consent` | 年齢等の確認と現在の規約版への同意を保存 |
| GET | `/api/account/export` | 単語帳・カード・学習履歴をJSONで出力 |
| DELETE | `/api/account` | 無料プランまたは利用終了後のアカウントを削除 |
| POST | `/api/books/preview` | 新しい単語帳の作成前に訳・例文を確認 |
| POST | `/api/books` | 入力リストから単語帳を作成 |
| GET | `/api/books` | 自分の単語帳一覧 |
| GET | `/api/books/:bookId` | 自分の単語帳詳細 |
| PATCH | `/api/books/:bookId` | 自分の単語帳名を変更 |
| POST | `/api/books/:bookId/cards/preview` | 追加前に訳・例文を確認 |
| POST | `/api/books/:bookId/cards` | 自分の単語帳に単語を追加 |
| PATCH | `/api/books/:bookId/cards/:cardId` | 自分のカードを編集 |
| DELETE | `/api/books/:bookId/cards/:cardId` | 自分のカードと学習履歴を削除 |
| DELETE | `/api/books/:bookId` | 自分の単語帳を削除 |
| GET | `/api/study/summary` | 単語帳ごとのカード数・現在の復習件数 |
| GET | `/api/study/next?bookId=` | 次に学習するカード |
| POST | `/api/study/reviews` | 評価を保存し次回復習日を返す |
| POST | `/api/billing/checkout` | Stripe Checkout セッション作成 |
| POST | `/api/billing/portal` | Stripe Customer Portal セッション作成 |
| POST | `/api/billing/webhook` | Stripe webhook（署名検証必須） |

`GET /api/study/next` は `reveal=true` を指定したときだけ訳・例文と各評価の次回復習間隔を返します。通常の取得では英単語とカードIDだけを返し、解答前の情報をクライアントへ渡しません。音声は、学習画面に表示済みの英単語または例文をブラウザのWeb Speech APIで読み上げます。音声データを返すAPIは提供しません。

`POST /api/study/reviews` の入力は `{ "cardId": "...", "rating": "again|hard|good|easy", "requestId": "..." }` です。評価結果はFSRSで次回日時を計算し、`requestId` は再送時にも同じ値を使ってレビューの二重適用を防ぎます。

復習アルゴリズムは無料・プレミアムで共通です。現在のFSRS設定は目標想起率95%、最大間隔365日、ファジングなし、短期学習・再学習ステップ10分です。

`POST /api/books` の入力は `{ "title": "...", "input": "run\\ngive up" }` です。入力は最大100件、1項目100文字、全体10,000文字に制限します。空行・重複は正規化して除外します。

`POST /api/books/preview` は同じ入力形式で、保存せずに日本語訳・例文を返します。確認後に `POST /api/books` を呼び出して単語帳を作成します。

`POST /api/books/:bookId/cards` の入力は `{ "input": "review\\nmake progress" }` です。単語帳の所有者だけが利用でき、単語の制限は単語帳作成時と同じです。既存カードと同じ単語はスキップし、追加されたカードとスキップされた単語を返します。

`POST /api/books/:bookId/cards/preview` は同じ入力形式で、保存せずに日本語訳・例文・既存カードかどうかを返します。確認後に `POST /api/books/:bookId/cards` を呼び出して保存します。

無料プランでは、単語帳は最大3冊、各単語帳のカードは最大100枚です。これらの制限は、作成・追加・プレビューのすべてでサーバー側に適用されます。プレミアムの契約状態はStripe webhookで同期し、`active` または `trialing` の場合のみ制限を解除します。

`PATCH /api/books/:bookId` は `{ "title": "変更後の名前" }`、`PATCH /api/books/:bookId/cards/:cardId` は `{ "term": "run", "translation": "走る", "sentence": "I run." }` を受け取ります。カードを編集すると、辞書・例文データと利用者の編集内容を混同しないため、保存済みの例文出典情報を外します。

`POST /api/billing/checkout` は `{ "termsAccepted": true, "eligibilityAccepted": true }` を受け取り、利用規約・プライバシーポリシーの版と同意日時、13歳以上かつ未成年の場合の保護者同意確認を保存したうえで、7日間の無料トライアル付き月額プランのStripe Checkoutを作成します。同じ利用者に有効な未完了セッションがある場合はそのURLを再利用し、連打や通信再送による重複セッション作成を防ぎます。決済手段はコードで固定せず、Stripe Dashboardの動的決済手段でカード、Apple Pay、Google Payを有効にします。`POST /api/billing/portal` は、支払い方法、請求書および解約を利用者自身で管理するためのCustomer Portalを返します。

`POST /api/billing/webhook` は署名検証後、Checkout完了・期限切れ・非同期決済結果、サブスクリプションの作成・更新・停止・再開・削除・トライアル終了予告、請求の成功・失敗・追加認証・確定失敗を処理します。契約状態は必要に応じてStripeから最新値を再取得して同期します。イベントIDは処理成功後だけ保存するため、一時障害で5xxになったイベントはStripeの再送で再処理されます。

## エラー形式

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "入力を確認してください" } }
```

内部エラーのスタック、SQL、秘密情報はレスポンスに含めません。入力件数・文字数・利用枠超過は `400` または `429` として明示します。
