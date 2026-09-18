# Data Model: ユーザー認証（新規登録・ログイン）— 001-user-auth

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

旧アプリのマイグレーション 34 本（dives / dive_sites / certifications / regulators / shops / admin_* ほか）は**全削除**し、以下の単一マイグレーションに置き換える（[research.md](./research.md) Decision 5）。

## エンティティ

### auth.users（Supabase Auth 管理・変更しない）

認証の主体。メールアドレス・パスワードハッシュ・メール確認状態（`email_confirmed_at`）・登録日時は Supabase Auth が管理する。アプリ側からは直接参照せず、セッション経由の `auth.uid()` / `user.email` を使う。

### public.users（新規マイグレーションで作成）

アカウントに 1:1 で紐づくアプリ側プロフィールの器。本フェーズでは識別子とタイムスタンプのみの最小構成とし、将来の Instagram アカウント連携・フォロワーデータの親テーブルとする。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `uuid` | PK・`references auth.users(id) on delete cascade` | auth.users と主キーを共有 |
| `created_at` | `timestamptz` | `not null default now()` | 作成日時 |
| `updated_at` | `timestamptz` | `not null default now()`・トリガーで自動更新 | 更新日時 |

## トリガー・関数

| 名前 | 種別 | 内容 |
|---|---|---|
| `public.handle_updated_at()` | 汎用トリガー関数 | `before update` で `updated_at = now()`。`language plpgsql` + `set search_path = ''` |
| `users_handle_updated_at` | トリガー | `before update on public.users` で上記を実行 |
| `public.handle_new_user()` | トリガー関数 | `after insert on auth.users` で `public.users (id)` に自動 INSERT。`security definer` + **`set search_path = ''`**（旧実装の `search_path = public` は search path injection リスクのため是正）。本体の参照はすべてスキーマ修飾（`public.users`） |
| `on_auth_user_created` | トリガー | `after insert on auth.users` で上記を実行 |

## RLS ポリシー

`public.users` で RLS を有効化する。INSERT は `handle_new_user`（security definer）経由のみのため、insert ポリシーは定義しない（デフォルト deny）。DELETE は auth.users の cascade のみ。

| ポリシー | 操作 | 条件 |
|---|---|---|
| `"users can view own profile"` | select | `using ((select auth.uid()) = id)` |
| `"users can update own profile"` | update | `using ((select auth.uid()) = id)` `with check ((select auth.uid()) = id)` |

`auth.uid()` は必ず `(select ...)` で包む（`auth_rls_initplan` 対策・rules/sql.md 準拠）。

## マイグレーションファイル

```
supabase/migrations/20260716000000_create_users.sql   # 上記すべてを含む 1 本（強い依存関係のため同一ファイル）
supabase/seed.sql                                     # 空にリセット（旧マスタデータを除去）
```

## 状態遷移（ユーザーアカウント）

```
未登録 --signUp--> メール未確認（email_confirmed_at = null・ログイン不可）
       --確認リンク（/api/auth/callback）--> 確認済み（ログイン可能）
確認済み --signIn--> セッションあり --signOut / 期限切れ--> セッションなし
```

- メール未確認状態でのログイン試行は Supabase がエラー（`email_not_confirmed`）を返し、アプリは再送導線（ResendConfirmationButton）を提示する
- `public.users` 行は signUp 時（auth.users INSERT 時）にトリガーで作成され、メール確認状態とは独立して存在する

## バリデーションルール（クライアント + サーバー整合）

| 項目 | ルール | 実装箇所 |
|---|---|---|
| メールアドレス | 形式検証・必須 | yup `emailField`（shared/schemas/fields.ts）+ Supabase Auth |
| パスワード（登録時） | 12〜72 文字・英大文字/小文字/数字必須 | yup `passwordField` + config.toml `minimum_password_length = 12` / `password_requirements` |
| パスワード（ログイン時） | 必須のみ（長さ検証しない） | login.schema（既存ユーザーの互換のため） |
