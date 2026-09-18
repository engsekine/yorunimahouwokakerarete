# Implementation Plan: ユーザー認証（新規登録・ログイン）— Instagram フォロワー管理アプリ初期化

**Branch**: `001-user-auth` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-auth/spec.md`

## Summary

ダイビングログアプリからコピーされたリポジトリを Instagram フォロワー管理アプリ「yorunimahouwokakerarete」の土台としてリセットし、Supabase Auth（メール + パスワード）による新規登録・ログイン・ログアウト・ルート保護のみが動く最小構成を作る。

技術アプローチ: **全削除して書き直すのではなく、既存の認証基盤（`@supabase/ssr` ベースの `shared/lib/supabase` + `features/auth`）をトリミングして再利用**し、ダイビング固有の features・app ルート・マイグレーション・共有ユーティリティを削除する。DB は `public.users`（auth.users と 1:1）のみの新規マイグレーション 1 本に置き換える。

## Technical Context

**Language/Version**: TypeScript 5.x（strict mode）/ Node.js 24（volta 固定）

**Primary Dependencies**: Next.js（App Router・React Compiler）/ React / Tailwind CSS 4 / `@supabase/ssr` + `@supabase/supabase-js` / React Hook Form + yup / `@repo/ui`（shadcn ラッパーパッケージ）/ `@repo/supabase`（Supabase クライアント共有パッケージ）

**Storage**: Supabase（PostgreSQL + Auth + RLS）。ローカル開発は Supabase CLI（Docker）

**Testing**: Vitest（単体）/ Storybook（story）/ Playwright + axe-core（a11y）

**Target Platform**: Web（モバイルファーストのレスポンシブ）。dev サーバーは `service-front` = localhost:3000

**Project Type**: npm workspaces モノレポ（`service-front` + `packages/*`。`admin-front` は本フェーズ対象外・ディレクトリ未作成）

**Performance Goals**: 認証操作（ログイン送信→ホーム表示）が体感即時（SC-002: 30 秒以内はメール確認等の人間側操作込みの上限値）

**Constraints**: 旧アプリの画面・文言・スキーマの残存 0 件（SC-003/004）。認証フォームは WCAG 2.1 AA・axe 違反 0 件（SC-005）

**Scale/Scope**: 画面 4（トップ / ログイン / 新規登録 / ホーム）+ API ルート 1（認証コールバック）+ マイグレーション 1 本。削除対象: features 約 20 個・app ルート約 25 個・マイグレーション 34 本

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. Spec-Driven Development | ✅ Pass | spec.md 承認済み。本 plan → tasks → 実装の順で進行。旧 spec（docs/specs・specs/ 旧番号）は存在せず、削除対象は実装コードのみ |
| II. Server Components First | ✅ Pass | ページ（login/signup/home/top）は Server Components。フォームのみ `'use client'`（LoginForm / SignupForm）。metadata は `generatePageMetadata` を使用 |
| III. Test-First（テスト同梱） | ✅ Pass | 残存・改修するコンポーネントは既存の test/story/a11y テストを同期修正。新規コンポーネントは `/generate-with-tests` で生成。回帰はスキーマテスト（パスワード 8 文字）を先に書く |
| IV. Security & RLS by Default | ✅ Pass | 新マイグレーションで `public.users` に RLS 有効化・`(select auth.uid())` ポリシー・関数は `set search_path = ''`（旧 `handle_new_user` の `search_path = public` は `''` + スキーマ修飾に是正）。スキーマ変更はマイグレーションファイルのみ |
| V. Accessibility（WCAG 2.1 AA） | ✅ Pass | フォームは label 関連付け・`aria-invalid`・エラー `role="alert"`。Playwright + axe-core テストを同梱 |
| VI. Coding Standards | ✅ Pass | `rules/` 準拠（フォルダ構成・TypeScript strict・Tailwind utility-first・SQL snake_case） |

**注記**: plan 作成時点では constitution のタイトル・前文が旧プロダクト（ダイビングログアプリ）を指していたが、実装完了後に `/speckit-constitution` で 本アプリ向けに改定済み（v1.1.0・2026-07-16）。原則 I〜VI の規範内容は不変のため本 plan のゲート判定に影響はない。

**Post-Design Re-check（Phase 1 完了後）**: ✅ Pass — data-model.md は RLS / search_path / snake_case / timestamptz を満たし、contracts は Server Actions（Server Components First）前提。違反なし → Complexity Tracking 記載事項なし。

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── spec.md              # 機能仕様（承認済み）
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── routes.md        # ルート・リダイレクト契約
│   └── auth-actions.md  # Server Actions 契約
├── screens/
│   ├── login.md         # ログイン画面仕様
│   ├── signup.md        # 新規登録画面仕様
│   └── home.md          # ホーム画面仕様
├── checklists/requirements.md
└── tasks.md             # Phase 2 output（/speckit-tasks で生成）
```

### Source Code (repository root)

**残す / 作り直す構成（リセット後のゴール）**:

```text
service-front/src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx               # 認証画面共通レイアウト（既存流用）
│   │   ├── login/page.tsx           # ログイン
│   │   └── signup/page.tsx          # 新規登録（登録成功後はフォーム内の完了ビューで確認メール案内を表示）
│   ├── (authenticated)/
│   │   ├── layout.tsx               # 認証必須レイアウト（requireUser）
│   │   └── home/page.tsx            # ホーム（プレースホルダー: メールアドレス表示 + ログアウト）
│   ├── api/auth/callback/route.ts   # メール確認・コード交換コールバック（既存流用）
│   ├── layout.tsx / page.tsx        # ルートレイアウト・トップページ（文言を 本アプリに刷新）
│   ├── error.tsx / not-found.tsx / globals.css / sitemap.ts
├── features/auth/
│   ├── components/client/
│   │   ├── LoginForm/               # 既存流用（MFA 分岐を除去）
│   │   ├── SignupForm/              # 既存流用（規約同意・Google・プロフィール項目を除去し email + password のみに）
│   │   └── ResendConfirmationButton/ # 既存流用（メール未確認エッジケース用）
│   ├── schemas/                     # login.schema / signup.schema のみ
│   ├── server/actions.ts            # signIn / signUp / signOut / resendConfirmationEmail のみ
│   └── index.ts
├── shared/
│   ├── components/                  # form / feedback / layout / typography / ui / theme（残す）
│   │   └── form/PasswordField/      # 新規: マスク + 表示/非表示トグル付きパスワード入力（spec Edge Case 対応）
│   ├── config/metadata.ts           # サイト名を 本アプリに変更
│   ├── lib/
│   │   ├── supabase/                # browser / server / middleware（残す）
│   │   ├── auth/requireUser/        # 認証ガード（残す）
│   │   ├── react-query/ date/ number/ validation/  # 汎用（残す）
│   └── schemas/fields.ts            # emailField / passwordField（12 文字 + 英大小数字）を継続利用、規約同意等は削除
└── proxy.ts                         # 保護プレフィックスを ['/home'] に刷新

packages/
├── supabase/                        # Supabase クライアント共有（残す・型を再生成）
└── ui/                              # shadcn（残す・直接編集しない）

supabase/
├── migrations/20260716000000_create_users.sql   # 唯一のマイグレーション（旧 34 本は削除）
├── config.toml                     # 既存設定を継続（minimum_password_length = 12・enable_confirmations = true）
└── seed.sql.template               # テストユーザー 1 名のみの最小構成にリセット（旧プロフィール項目・admin を除去）
```

**削除する構成（ダイビング関連の全除去）**:

```text
service-front/src/features/{account, application-sheet, certifications, consent, contact,
    credits, dashboard, dive-sites, dives, guide, landing, mfa, notifications, plans,
    privacy-policy, regulators, shops, social, terms}/
service-front/src/app/(authenticated)/{dives, dive-sites, plans, settings, likes,
    application-sheet, shops, users, notifications}/
service-front/src/app/(onboarding)/ 全体（profile-completion）
service-front/src/app/(public)/ 全体（guide, contact, privacy-policy, lp, terms）
service-front/src/app/(auth)/{reset-password, update-password, login/verify}/
service-front/src/app/api/stripe/
service-front/src/features/auth/ 内の {GoogleAuthButton, TermsAgreementField,
    ResetPasswordForm, UpdatePasswordForm, ProfileCompletionForm, AuthNav,
    reset.schema, profile-completion.schema, mappers}/
service-front/src/shared/lib/{tide, dive-shop-ownership, profile-path}/
service-front/src/shared/stores/user-store.ts（AuthNav 専用のため）
supabase/migrations/*.sql（全 34 本）
readme copy.md（旧 README コピー）
```

**Structure Decision**: 既存の Feature-based + shared/ 構成（`app/` → `features/` → `shared/` の依存方向）をそのまま維持する。本機能は「構成の変更」ではなく「同一構成内での大規模な剪定 + 認証機能の最小化」。削除はビルド・テスト・型チェックが通ることを削除単位ごとに確認しながら進める（削除順序は tasks.md で規定）。

## Complexity Tracking

Constitution Check 違反なしのため記載事項なし。
