# Research: WordPress 風の管理画面 UI — 004-admin-ui-shell

**Date**: 2026-07-17 | **Plan**: [plan.md](./plan.md)

## Decision 1: シェルはネストレイアウト（`(authenticated)/layout.tsx`）に 1 度だけ配置

- **Decision**: `(authenticated)/layout.tsx`（Server Component・既存の認証ガードを維持）で子を `AdminShell` に包む。ページ遷移時は Next.js のネストレイアウトによりレイアウトが保持され、コンテンツ（children）だけが差し替わる。
- **Rationale**: FR-002 / SC-002（遷移でシェルが再描画されない・現在地ハイライトが正しい）を framework 標準の仕組みで満たす。認証ガードは Server 側のまま維持できる。
- **Alternatives considered**: 各ページで個別にシェルを描画 → 遷移ごとに再マウントされ状態・スクロールが飛ぶ。却下。

## Decision 2: Header/Footer を公開領域へ移設し、認証領域と分離

- **Decision**: 現在ルートレイアウト（`app/layout.tsx`）が全ページに付けている `Header`/`Footer` を撤去し、Providers + テーマ初期化スクリプトのみにする。公開トップ（`app/page.tsx`）は自前で Header/Footer を内包する。認証領域は AdminShell が枠を提供する。
- **Rationale**: spec Assumptions「シェルは認証領域のみ・公開ページは現状維持」を満たすには、全ページ共通の Header/Footer をルートから外す必要がある。ログイン/新規登録（`(auth)`）は既に中央寄せの独立枠なので影響小。
- **Alternatives considered**: ルートに Header を残し認証領域で二重に隠す → DOM の二重ヘッダーと a11y ランドマーク重複。却下。

## Decision 3: サイドバー開閉状態は Cookie に保存（SSR ちらつき防止）

- **Decision**: デスクトップの「折りたたみ/展開」状態を Cookie（例 `admin-sidebar-collapsed`）に保存し、`(authenticated)/layout.tsx`（Server）で読み取って初期クラスを決める。クライアントはトグル時に Cookie を更新する。モバイルの一時的な開閉（Sheet）は状態を永続化しない。
- **Rationale**: FR-010（開閉状態の保持）+ SSR 初期描画で展開/折りたたみが正しく出る（localStorage だと初回にちらつく）。001 のテーマ初期化スクリプトと同じ「サーバーで初期状態を確定」方針に揃う。
- **Alternatives considered**: localStorage + クライアント初期化 → FOUC（初回ちらつき）。DB 保存 → UI 設定に永続ストアは過剰。却下。

## Decision 4: モバイルのサイドバーは既存 `@repo/ui` Sheet ラッパーを使う

- **Decision**: 狭い画面ではサイドバーを常設せず、ハンバーガーで `Sheet`（`shared/components/ui/Sheet`）を開いてメニューを表示する。Sheet は role="dialog"・フォーカストラップ・Esc クローズ・トリガー復帰を備える。デスクトップは常設 nav + 折りたたみトグル。
- **Rationale**: FR-009 / a11y（キーボード・SR 対応）を実績ある部品で満たす。002/003 の ConfirmDialog と同じ `@repo/ui` ラッパー経由の方針。
- **Alternatives considered**: 自前のドロワー実装 → フォーカストラップ等を再実装するコスト。却下。

## Decision 5: アクティブ判定は `usePathname` + メニュー定義の match ルール

- **Decision**: メニューは `shared/config/nav.ts` に定義（label / icon / href / match）。アクティブ判定は `usePathname()` が `href` に前方一致するかで行い、詳細ページ（例 `/imports/[id]`）では親メニュー（`/imports`）をハイライトする（FR-003 / Edge Case）。現在項目は `aria-current="page"`。
- **Rationale**: 宣言的なメニュー定義に集約でき、テストしやすい（純粋な match 関数を単体テスト）。
- **Alternatives considered**: 各リンクに active フラグを手書き → 追加漏れ・詳細ページの親ハイライトが崩れる。却下。

## Decision 6: 共通部品は shared/components の用途別サブグループに新設（admin-front の設計に倣う）

- **Decision**: `PageHeader`（見出し + アクション）・`Card`（メタボックス）・`Notice`（通知バナー・`role="status"`/`"alert"`）・`DataTable`（見出し行 + 行 + 行内アクションスロット）を `shared/components/{layout,surface,data}` に新規作成する。既存の `Heading`・`Button`・`ConfirmDialog` は流用。
- **Rationale**: 構成規約（`arch/`・folder-structure）で admin-front が持つ想定の DataTable/AdminShell 系を service-front に相当物として用意する。汎用部品なので feature に置かず shared に置く。
- **Alternatives considered**: 各ページに直書き → 一貫性（US3）が崩れテストも重複。却下。

## Decision 7: ダッシュボードは新 feature `dashboard` に集約（feature 間依存の回避）

- **Decision**: ダッシュボードのウィジェット（Instagram サマリ・インポートサマリ）は新 feature `features/dashboard` に置き、002 `getInstagramAccount` / 003 `listImports` の結果を **app 層（home/page.tsx）で取得して props 注入**する。dashboard feature は instagram/follower-import を直接 import しない。
- **Rationale**: `arch/feature-based.md` の「feature 間 import 禁止・横断は app 層で組み立て」に従う（001/002 の home 実装と同じパターン）。
- **Alternatives considered**: dashboard から各 feature を import → feature 間依存でアーキ違反。却下。

## Decision 8: WordPress "風" の範囲 — 構造・操作パターンのみ、配色は既存トークン

- **Decision**: 参照するのは WP 管理画面の**レイアウト構造**（左サイドバー + 上部バー + メタボックス + リストテーブル + 通知）と操作パターン（折りたたみ・アクティブ表示）まで。色・タイポは 既存のテーマトークン（`--primary` 等・ライト/ダーク対応）を使い、WP の配色/ロゴ/商標は複製しない。
- **Rationale**: spec Assumptions のとおり。ブランド模倣を避けつつ「見慣れた管理画面」の操作性を得る。既存のダークモード対応（SC-004）も自然に満たす。
- **Alternatives considered**: WP の配色まで寄せる → ブランド・商標の懸念 + 既存テーマと二重管理。却下。
