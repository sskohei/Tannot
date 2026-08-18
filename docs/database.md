# データベース設計

Cloudflare D1 は SQLite のため、スキーマ変更は `wrangler d1 migrations` で管理します。以下は MVP の論理モデルです。

| テーブル | 主なカラム | 目的 |
| --- | --- | --- |
| users | id, email, name, created_at | Better Auth のユーザー |
| study_books | id, user_id, title, created_at, updated_at | 単語帳 |
| cards | id, book_id, term, normalized_term, translation, sentence, sentence_source_id, term_audio_url, sentence_audio_url | 単語カードと出典 |
| reviews | id, card_id, user_id, rating, reviewed_at, due_at, interval_days, ease_factor, repetitions | 学習状態 |
| subscriptions | user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end | 課金状態 |
| stripe_events | event_id, received_at | webhook の冪等性 |

## 認可

すべての単語帳・カード・レビュー操作は、ログイン中のユーザー ID をサーバーセッションから取得し、`user_id` を条件にした SQL で実行します。`book_id` や `card_id` 単独で取得してから認可する実装は避けます。D1 に PostgreSQL の RLS はないため、Hono のリポジトリ層・サービス層で同等の所有権チェックを徹底します。

## 整合性

- `study_books.user_id` と `reviews.user_id` は所有ユーザーを表す。
- カード削除時のレビュー削除は外部キーまたは明示的なトランザクションで保証する。
- レビュー送信には `request_id` またはクライアント側イベント ID を持たせ、二重送信を冪等に処理する。
- 時刻は ISO 8601 または Unix epoch のどちらかに統一し、プロジェクト開始時に決定する。

