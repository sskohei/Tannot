# データベース設計

Cloudflare D1 は SQLite のため、スキーマ変更は `wrangler d1 migrations` で管理します。D1 はユーザー固有データ専用とし、辞書・例文は EJCSV と同じくオフラインで作成した読み取り専用データとして Worker の静的アセットに配布します。

| テーブル | 主なカラム | 目的 |
| --- | --- | --- |
| user / account / session / verification | Better Auth標準カラム | Google OAuthとセッション |
| users | id, email, name, created_at, terms_accepted_at, privacy_accepted_at, terms_version, privacy_version, eligibility_confirmed_at | アプリケーション側のユーザー参照とプレミアム購入時の規約版・年齢等の確認記録 |
| study_books | id, user_id, title, folder_name, sort_order, created_at, updated_at | 単語帳、フォルダと利用者指定の並び順 |
| cards | id, book_id, term, normalized_term, translation, sentence, sentence_source_id | 単語カードのスナップショットと出典。音声は保存しない |
| tags / card_tags | id, user_id, name / card_id, tag_id | 利用者ごとのカードタグと関連付け |
| reviews | id, card_id, user_id, rating, reviewed_at, due_at, interval_days, repetitions, fsrs_state, fsrs_stability, fsrs_difficulty, fsrs_elapsed_days, fsrs_learning_steps, fsrs_lapses | 学習履歴とFSRS状態。`ease_factor` は旧アルゴリズム互換用 |
| subscriptions | user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end, last_event_created_at | 課金状態とwebhookの順序管理 |
| stripe_events | event_id, received_at | webhook の冪等性 |
| billing_checkout_sessions | user_id, request_token, stripe_session_id, checkout_url, expires_at | Checkout作成ロックと未完了セッションURLの再利用 |
| learning_preferences | user_id, daily_review_limit, daily_new_card_limit, review_order | プレミアム利用者の出題順と1日上限 |
| reminder_preferences | user_id, enabled, reminder_time | プレミアム利用者のブラウザ通知時刻 |

## 辞書・例文データ

EJDict と Tatoeba の生データをリクエスト時に読み込まず、EJCSV のビルド済み SQLite (`ejcsv.db`) を `scripts/build-lookup-assets.ts` で単語の先頭文字ごとの JSON に変換します。生成物は `public/data/lookup/` に置かれ、Worker の静的アセットとして配信されます。D1 には辞書・例文を保存しません。

例文は EJCSV と同じく、オフラインビルド時に単語境界で一致する候補から1文へ絞り込みます。カード作成時に静的アセットを検索し、訳・例文・Tatoebaの出典URLをカードへスナップショット保存します。

旧MVPの `dictionary_entries` と `example_sentences` は migration `0004_remove_legacy_lookup_tables.sql` で削除します。カードのスナップショットは削除せず、既存の単語帳を維持します。

## 音声データ

音声はカードの`term`または`sentence`を入力として、再生時にブラウザのWeb Speech APIで読み上げます。音声ファイル本体、object key、固定URL、生成状態はD1に保存しません。

既存の音声key・statusカラムは、音声をブラウザ内で読み上げる構成への移行時に削除する。音声再生に対応しない環境でも、テキストカードと学習機能は利用可能にする。

## 認可

すべての単語帳・カード・レビュー操作は、ログイン中のユーザー ID をサーバーセッションから取得し、`user_id` を条件にした SQL で実行します。`book_id` や `card_id` 単独で取得してから認可する実装は避けます。D1 に PostgreSQL の RLS はないため、Hono のリポジトリ層・サービス層で同等の所有権チェックを徹底します。Better Authの `user` と、アプリケーションの `users` は同じIDを共有します。

## 整合性

- `study_books.user_id` と `reviews.user_id` は所有ユーザーを表す。
- カード削除時のレビュー削除は外部キーまたは明示的なトランザクションで保証する。
- レビュー送信には `request_id` またはクライアント側イベント ID を持たせ、二重送信を冪等に処理する。
- Stripe webhookイベントは処理成功後にだけ `stripe_events` へ記録し、失敗した処理を再送で回復できるようにする。
- Checkout作成は利用者単位の一時ロックとStripeのidempotency keyを併用し、有効期限内の未完了セッションを再利用する。
- 時刻は ISO 8601 または Unix epoch のどちらかに統一し、プロジェクト開始時に決定する。

## アカウントデータ

利用者は、自分の単語帳・カード・学習履歴をJSONで出力できる。アカウント削除は、有効なプレミアム契約がない場合に受け付ける。削除時は、単語帳、カード、レビュー、アプリケーション側のユーザー情報、認証セッションおよび契約状態を削除する。Stripeの請求情報やイベント受信記録は、請求・不正利用対応または法令上必要な期間に限り、各システムで保持され得る。
