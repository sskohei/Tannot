# データベース設計

Cloudflare D1 は SQLite のため、スキーマ変更は `wrangler d1 migrations` で管理します。D1 はユーザー固有データ専用とし、辞書・例文は EJCSV と同じくオフラインで作成した読み取り専用データとして Worker の静的アセットに配布します。

| テーブル | 主なカラム | 目的 |
| --- | --- | --- |
| user / account / session / verification | Better Auth標準カラム | Google OAuthとセッション |
| users | id, email, name, created_at | アプリケーション側のユーザー参照 |
| study_books | id, user_id, title, created_at, updated_at | 単語帳 |
| cards | id, book_id, term, normalized_term, translation, sentence, sentence_source_id | 単語カードのスナップショットと出典。音声は保存しない |
| reviews | id, card_id, user_id, rating, reviewed_at, due_at, interval_days, repetitions, fsrs_state, fsrs_stability, fsrs_difficulty, fsrs_elapsed_days, fsrs_learning_steps, fsrs_lapses | 学習履歴とFSRS状態。`ease_factor` は旧アルゴリズム互換用 |
| subscriptions | user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end | 課金状態 |
| stripe_events | event_id, received_at | webhook の冪等性 |

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
- 時刻は ISO 8601 または Unix epoch のどちらかに統一し、プロジェクト開始時に決定する。
