# Data Model: フォロワーリストのインポートと差分表示 — 003-follower-import-diff

**Date**: 2026-07-17 | **Plan**: [plan.md](./plan.md)

マイグレーション: `supabase/migrations/20260717100000_create_follower_import_tables.sql`（2 テーブル・強い依存のため同一ファイル）

## follower_imports（取り込み）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `uuid` | PK `default gen_random_uuid()` | |
| `user_id` | `uuid` | `not null references public.users(id) on delete cascade` | 所有ユーザー（1 ユーザー N 取り込み） |
| `account_username` | `text` | `not null` | ユーザー申告の対象アカウント名（research Decision 8） |
| `followers_count` | `integer` | `not null default 0 check (followers_count >= 0)` | 取り込んだフォロワー件数 |
| `following_count` | `integer` | `not null default 0 check (following_count >= 0)` | 取り込んだフォロー中件数（0 = 未同梱） |
| `status` | `text` | `not null default 'processing' check (status in ('processing', 'completed'))` | 原子性の可視性制御（research Decision 7） |
| `imported_at` | `timestamptz` | `not null default now()` | 取込日時（差分の隣接判定・履歴の並びに使用） |
| `created_at` / `updated_at` | `timestamptz` | `not null default now()`・updated_at はトリガー | |

- インデックス: `idx_follower_imports_user_id_imported_at (user_id, imported_at desc)`
- RLS: 本人のみ select（`(select auth.uid()) = user_id` **かつ** `status = 'completed'`）。書き込みポリシー無し（service role のみ）
- GRANT: authenticated に select・service_role に select/insert/update/delete

## follower_import_entries（リストエントリ）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `uuid` | PK `default gen_random_uuid()` | |
| `import_id` | `uuid` | `not null references public.follower_imports(id) on delete cascade` | |
| `kind` | `text` | `not null check (kind in ('follower', 'following'))` | 一覧種別 |
| `username` | `text` | `not null` | 相手のユーザーネーム（小文字化・trim 済み。同定キー / research Decision 4） |
| `profile_url` | `text` | `not null` | プロフィール URL |
| `followed_at` | `timestamptz` | nullable | エクスポート上のフォロー日時（timestamp 由来） |
| `created_at` | `timestamptz` | `not null default now()` | ※不変データのため updated_at なし・トリガーなし |
| | | `unique (import_id, kind, username)` | 取り込み内の重複排除 + 差分クエリの index |

- RLS: 本人のみ select — `using (import_id in (select i.id from public.follower_imports i where i.user_id = (select auth.uid()) and i.status = 'completed'))`
- GRANT: authenticated に select・service_role に select/insert/delete

## 導出データ（テーブル化しない）

- **差分**: 隣接する 2 つの `completed` 取り込み（`imported_at` 順）の `kind = 'follower'` エントリ集合差。新規 = 今回のみに存在・解除 = 前回のみに存在
- **フォロー関係分析**: 同一取り込み内の `follower` と `following` の集合差（following_count = 0 の取り込みでは提供不可の案内）

## 状態遷移（取り込み）

```
（開始）--import 行 INSERT--> processing（本人からも不可視）
processing --全エントリ INSERT 成功--> completed（可視・差分計算対象）
processing --途中失敗--> 行削除（entries は cascade。痕跡を残さない / FR-009）
completed --ユーザー削除（確認付き）--> 行削除（前後の取り込みが新たに隣接し差分が再計算される / FR-007）
```

## バリデーション・整合性ルール

| ルール | 実装箇所 |
|---|---|
| ファイル上限 10MB・対象外ファイル拒否 | Server Action（クライアント側 accept 属性は補助） |
| 分割ファイル統合・重複排除 | パーサ lib + `unique (import_id, kind, username)` |
| アカウント名の不一致警告（FR-010） | Server Action（前回値との比較 + personal_information.json のベストエフォート照合） |
| 本人のみアクセス（FR-011） | RLS select ポリシー + service role 書き込み時の user_id 検証 |
| 差分 0 件・初回（比較対象なし）の明示 | クエリ結果の件数で画面分岐 |
