# Implementation Plan: WordPress 風の管理画面 UI（サイト全体のシェル構築）

**Branch**: `004-admin-ui-shell` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-admin-ui-shell/spec.md`

## Summary

ログイン後の領域（`(authenticated)`）を WordPress 管理画面風のシェル（左サイドバー + 上部管理バー + コンテンツ領域）に再構成する。ダッシュボードをウィジェットカードの集約画面にし、既存機能（Instagram 連携・フォロワーインポート）を共通の画面部品（PageHeader / Card / DataTable / Notice）に載せ替える。新規ドメイン機能・DB 変更はなし。

技術アプローチ: シェルは `(authenticated)/layout.tsx`（Server Component・認証ガードは維持）に `AdminShell`（client・サイドバー開閉状態を持つ）を差し込む。**Header/Footer をルートレイアウトから公開領域へ移設**し、認証領域はルートレイアウトの共通枠から独立させる。サイドバーのアクティブ判定は `usePathname`。開閉状態は Cookie に保存してサーバー初期描画のちらつきを防ぐ。

## Technical Context

**Language/Version**: TypeScript 5.x（strict）/ Node.js 24

**Primary Dependencies**: Next.js（App Router / ネストレイアウト）/ Tailwind CSS 4 / `@repo/ui`（Sheet = モバイルサイドバー・Button）/ lucide-react（メニューアイコン・既存採用）

**Storage**: なし（DB マイグレーション・新規テーブルなし）。サイドバー開閉状態のみ Cookie

**Testing**: Vitest（AdminShell / ナビ / 共通部品 / ダッシュボードウィジェット）/ Storybook / Playwright + axe-core（シェル・各ページをライト/ダーク両テーマでスキャン）

**Target Platform**: Web（service-front）。モバイル幅〜デスクトップ幅のレスポンシブ

**Project Type**: 既存 service-front の UI 再構成（`shared/components/layout` にシェル部品を追加、`(authenticated)` レイアウトと各機能コンポーネントを載せ替え）

**Performance Goals**: ページ間遷移でシェルが再マウントされない（ネストレイアウトで担保）。体感即時

**Constraints**: 既存機能のデグレ 0 件（SC-006）。WCAG 2.1 AA・ライト/ダーク両テーマで違反 0 件（SC-004）。WordPress のブランド要素は複製しない（既存テーマトークンを使用）

**Scale/Scope**: 新規共通部品 5〜7（AdminShell / AdminSidebar / AdminTopBar / PageHeader / Card / DataTable / Notice）+ ダッシュボードウィジェット 2〜3 + 既存ページ 3 の載せ替え。マイグレーションなし

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. Spec-Driven Development | ✅ Pass | spec.md 承認済み（checklist 16/16） |
| II. Server Components First | ✅ Pass | レイアウト・ページ・ダッシュボードは Server Component。client は開閉状態を持つ AdminShell（サイドバー）と既存の操作ボタンのみ |
| III. Test-First | ✅ Pass | 共通部品・ナビのアクティブ判定・ウィジェットは Vitest 先行。新規コンポーネントは `/generate-with-tests` |
| IV. Security & RLS by Default | ✅ Pass（該当範囲なし） | DB 変更なし。認証ガード（`(authenticated)/layout` + proxy）は維持（FR-011） |
| V. Accessibility | ✅ Pass | ランドマーク（nav/main/header）・`aria-current` でメニュー現在地・折りたたみトグルの `aria-expanded`・Sheet のフォーカストラップ。ライト/ダーク両テーマで axe |
| VI. Coding Standards | ✅ Pass | フォルダ構成規約・`@repo/ui` はラッパー経由・Tailwind utility-first・Heading 使用 |

**Post-Design Re-check（Phase 1 完了後）**: ✅ Pass — 違反なし → Complexity Tracking 記載事項なし。

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-ui-shell/
├── spec.md / plan.md / research.md / quickstart.md
├── contracts/ui-contracts.md   # 共通部品の Props 契約・ナビ定義・レイアウト契約
├── screens/admin-shell.md      # シェル・ダッシュボード・各ページの画面仕様
└── checklists/requirements.md
```

（data-model.md は作成しない: 永続エンティティが無い UI 機能のため。ナビ項目・ウィジェットは contracts に定義する）

### Source Code (repository root)

```text
service-front/src/
├── app/
│   ├── layout.tsx                       # ルート: Header/Footer を除去し Providers + テーマ初期化のみに
│   ├── page.tsx                         # 公開トップ: Header/Footer を自前で内包（または公開用レイアウトに移設）
│   ├── (auth)/layout.tsx                # 認証画面の枠（現状のシンプルな中央寄せを維持）
│   └── (authenticated)/
│       ├── layout.tsx                   # 認証ガード（維持）+ AdminShell でラップ + サイドバー開閉 Cookie 読み取り
│       ├── home/page.tsx                # ダッシュボード（要約ウィジェット集約に刷新）
│       ├── instagram/page.tsx           # 新規: Instagram 連携専用ページ（002 の操作を /home から移設）
│       ├── imports/page.tsx・[id]/page.tsx  # PageHeader/Card/DataTable/Notice へ載せ替え
├── shared/components/
│   ├── layout/
│   │   ├── AdminShell/                  # client: サイドバー開閉状態 + レイアウト骨格（nav/header/main）
│   │   ├── AdminSidebar/                # メニュー（アクティブ判定 usePathname・折りたたみ・モバイルは Sheet）
│   │   ├── AdminTopBar/                 # サイト名 + ユーザー + ログアウト + ThemeToggle + サイドバートグル
│   │   ├── PageHeader/                  # ページ見出し + 右寄せアクション
│   │   ├── Header/ Footer/              # 公開領域用として存置（配置先を root → 公開領域へ）
│   ├── surface/
│   │   ├── Card/                        # メタボックス相当（見出し + 本文スロット）
│   │   └── Notice/                      # 通知バナー（success/error/info・role 付き）
│   ├── data/DataTable/                  # 一覧テーブル（見出し行・行・行内アクションスロット）
│   └── ...（Heading 等の既存 typography はそのまま利用）
├── shared/config/nav.ts                 # メニュー定義（ラベル・アイコン・href・アクティブ判定の match）
├── features/
│   ├── dashboard/components/server/     # ウィジェット（Instagram サマリ / インポートサマリ）※新 feature
│   ├── instagram/... follower-import/...# ページ内コンテンツを共通部品へ載せ替え（機能ロジックは不変）
```

**Structure Decision**: シェルは Next.js のネストレイアウト（`(authenticated)/layout.tsx`）で 1 度だけマウントし、ページ遷移で再描画されない構造にする（FR-002 / SC-002）。共通部品は `shared/components` の用途別サブグループ（layout / surface / data）に置き、フォルダ構成規約（`<Name>/<Name>.tsx` + index.ts + test）に従う。ダッシュボードのウィジェットは各機能のクエリ（002 `getInstagramAccount` / 003 `listImports`）を app 層で束ねて新 feature `dashboard` に集約し、feature 間依存を作らない。既存機能のサーバーロジック（actions/queries）は一切変更しない。

## Complexity Tracking

Constitution Check 違反なしのため記載事項なし。
