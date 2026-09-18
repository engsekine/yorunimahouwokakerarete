# Research: ユーザー認証（新規登録・ログイン）— 001-user-auth

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

Technical Context に NEEDS CLARIFICATION は無いが、「リセット + 再実装」の進め方に複数の選択肢があるため、主要な設計判断を以下に記録する。

## Decision 1: リセット戦略 — 全削除ではなく「トリミング再利用」

- **Decision**: 認証基盤（`shared/lib/supabase`・`shared/lib/auth/requireUser`・`features/auth` の LoginForm / SignupForm / ResendConfirmationButton・`api/auth/callback`・`proxy.ts`）はトリミングして再利用し、ダイビング固有の features / ルート / マイグレーション / ユーティリティを削除する。
- **Rationale**: 既存の認証実装は spec の要件（Supabase Auth・メール確認・enumeration 対策・ルート保護・a11y 対応フォーム）をほぼ満たしており、テスト・story も同梱済み。ゼロから書き直すより品質・速度とも有利。削除の痕跡は git 履歴に残る（初期コミット済み）ため、アーカイブ用コピーは不要。
- **Alternatives considered**:
  - 全削除して `create-next-app` から再構築 → 検証済みの Supabase SSR 統合・共有 UI 基盤・テスト設定を捨てることになり工数増。却下。
  - 旧コードを `legacy/` に退避 → ビルド対象外でも検索ノイズ・依存の残存リスクになる。git 履歴で十分。却下。

## Decision 2: 認証方式 — Supabase Auth メール + パスワード（`@supabase/ssr` の Cookie セッション）

- **Decision**: `supabase.auth.signUp` / `signInWithPassword` / `signOut` を Server Actions から呼び、セッションは `@supabase/ssr` の Cookie ベース（既存 `shared/lib/supabase/{browser,server,middleware}` パターン）で管理する。
- **Rationale**: ユーザー指定（認証認可は Supabase）。Cookie セッションは Server Components でのユーザー取得・middleware でのルート保護と自然に統合でき、FR-006（再訪時のログイン維持）を Supabase のトークン自動リフレッシュで満たす。
- **Alternatives considered**: Google 等の OAuth 追加 → spec のスコープ外（Assumptions 明記）。既存 GoogleAuthButton は削除。

## Decision 3: メール確認フロー — confirmation 有効 + `/api/auth/callback` でコード交換

- **Decision**: `enable_confirmations = true`（既存 config.toml のまま）とし、確認メールのリンク → `/api/auth/callback?next=/home` で `exchangeCodeForSession` を行いホームへ誘導する。登録直後は SignupForm 内の完了ビュー（確認メール送信案内）に切り替える（専用ページにするとメールアドレスを URL クエリで渡す必要が生じるため、メモリ上で保持できるフォーム内ビューを採用）。未確認のままログインした場合のエラー分岐と `ResendConfirmationButton`（再送）は既存実装を流用する（spec Edge Case 対応）。
- **Rationale**: FR-003（メール実在確認）を Supabase 標準機能で実現。ローカル開発では Mailpit（localhost:54324）で確認メールを受信でき、quickstart の検証が完結する。
- **Alternatives considered**: 確認なし即ログイン → FR-003 に反する。Magic Link → パスワード方式が spec 要件。

## Decision 4: パスワードポリシー — 12 文字以上 + 英大小数字（既存ポリシーを採用、spec を是正済み）

- **Decision**: 既存の `passwordField`（最小 12・最大 72・英大文字/小文字/数字必須、NIST SP 800-63B 準拠）と `config.toml` の `minimum_password_length = 12` / `password_requirements` をそのまま採用する。spec 初稿の「8 文字以上」は実装済みのより強固なポリシーに合わせて FR-002 を更新した。
- **Rationale**: クライアント（yup）とサーバー（GoTrue）の要件が既に一致しており、変更するとテスト・設定の両方に不整合リスクが生じる。72 文字上限は GoTrue の bcrypt 制約由来。
- **Alternatives considered**: 8 文字に緩和 → セキュリティ後退かつ config / スキーマ / テストの 3 箇所変更が必要。メリットなし。却下。

## Decision 5: DB スキーマ — `public.users`（auth.users と 1:1）のみの単一マイグレーション

- **Decision**: 旧マイグレーション 34 本を全削除し、`supabase/migrations/<timestamp>_create_users.sql` 1 本に置き換える。内容: `public.users`（id = auth.users FK・created_at・updated_at）、`handle_updated_at` トリガー、`handle_new_user`（signup 時の自動 INSERT・`security definer` + `set search_path = ''` + スキーマ修飾）、RLS（select / update を本人のみ）。`seed.sql` は空にする。
- **Rationale**: FR-010（旧テーブル・関数の除去）と FR-011（本人のみアクセス）を最小構造で満たす。将来の Instagram アカウント連携・フォロワーデータはこのテーブルを親に拡張できる（spec の Key Entities）。旧 `handle_new_user` の `set search_path = public` は rules/sql.md 違反（search path injection リスク）のため `''` に是正する。
- **Alternatives considered**:
  - `public.users` を作らず auth.users のみ → 将来のフォロワー管理データの親テーブルが無くなり、次フェーズで必ず必要になる。RLS の実践枠組みも今のうちに敷く。却下。
  - 旧マイグレーションに削除マイグレーションを積む → ローカル/新環境では最初から不要なスキーマ。プロジェクト未リリース（初期コミットのみ）なので履歴ごと作り直すのが正。却下。

## Decision 6: ルート保護 — `proxy.ts`（middleware）の許可リスト刷新

- **Decision**: 既存の `proxy.ts` パターン（`updateSession` → 保護プレフィックス判定）を維持し、`APP_ROUTE_PREFIXES = ['/home']`・`AUTH_ROUTES = ['/login', '/signup']` に刷新する。トップ `/` は未ログインでも閲覧可能な公開ページに変更する（ログイン済みで `/login`・`/signup` へアクセスした場合は `/home` へ）。
- **Rationale**: FR-007 の双方向リダイレクトを 1 箇所で宣言的に満たす既存実装が優秀。旧仕様では `/` が認証必須だったが、新アプリではトップ = サービス紹介 + 認証導線とするのが自然（spec US4 シナリオ 1 の「トップページ」前提と一致）。
- **Alternatives considered**: 各ページの layout で個別ガード → 保護漏れ（SC-004）のリスクが分散する。middleware 一元化 + `(authenticated)/layout.tsx` の `requireUser` 二重防御を採用。

## Decision 7: ホーム画面 — 最小プレースホルダー + LogoutButton（新規クライアントコンポーネント）

- **Decision**: `/home` はログイン中ユーザーのメールアドレス表示 + ログアウトボタンのみの Server Component とし、ログアウト操作は新規の小さな `LogoutButton`（client）から `signOut` Server Action を呼ぶ。旧 `AuthNav`（ダイビング用ナビ・zustand user-store・profile-path 依存）と `shared/stores/user-store` は削除する。
- **Rationale**: spec Assumptions「ホーム画面は最小限のプレースホルダーで良い」。AuthNav は削除対象依存（profile-path・検索・資格等の導線）が本体のため流用よりも新規最小実装が安い。FR-008（ユーザー識別表示 + ログアウト導線）を満たす。
- **Alternatives considered**: AuthNav を改修して流用 → 依存剥がしのコストが新規作成を上回る。却下。

## Decision 8: ブランディング刷新 — アプリ名「yorunimahouwokakerarete」に統一

- **Decision**: リポジトリ名（yorunimahouwokakerarete）をプロダクト名として採用し、`shared/config/metadata.ts` のサイト名・トップページ文言・README・ルート `package.json` の `name`（現在 `claude-settings`）を「yorunimahouwokakerarete — Instagram フォロワー管理アプリ」に統一する。`readme copy.md` は削除する。
- **Rationale**: FR-009 / SC-003（ダイビング文言 0 件・新アプリ名で一貫）。`package.json` の `name: "claude-settings"` はコピー元の残骸。
- **Alternatives considered**: 名称を仮置き（"My App" 等）→ 文言統一チェック（SC-003）の基準が曖昧になる。リポジトリ名を正とする。

## Decision 9: 削除の安全確認 — 削除単位ごとに typecheck / test / build をゲートにする

- **Decision**: 「マイグレーション → features → app ルート → shared ユーティリティ → 依存パッケージ」の順で削除し、各段階で `tsc --noEmit`・`vitest run`・`next build` を通す。未使用になった依存（stripe・zustand 等）は最後に `package.json` から除去する。
- **Rationale**: 削除対象が features 約 20 個・ルート約 25 個と大きく、一括削除は参照切れの原因特定を困難にする。import 逆引き（rules/diff-scope.md のバレル名検索）で削除前に参照を確認する。
- **Alternatives considered**: 一括削除して壊れた所を直す → エラーが数百件単位で出て収束が読めない。却下。
