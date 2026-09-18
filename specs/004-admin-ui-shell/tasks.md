# Tasks: WordPress 風の管理画面 UI（サイト全体のシェル構築）

**Input**: Design documents from `/specs/004-admin-ui-shell/`

**Prerequisites**: plan.md, spec.md（clarify 済み）, research.md, contracts/, screens/, quickstart.md

**Tests**: constitution III に基づきテストタスクを含む。純関数（ナビの match）・共通部品・ウィジェットは Vitest 先行。新規コンポーネントは作成後に `/generate-with-tests` でテスト類を生成する。**DB 変更なし・既存サーバーロジック不変**の UI 再構成のため、既存 E2E（002/003）を緑のまま保つデグレ防止が最重要（SC-006）。

**Organization**: ユーザーストーリー単位でフェーズ分割。共通部品・シェル土台は全ストーリーが依存するため Phase 2（Foundational）に置く。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル・未完了依存なし）/ **[Story]**: US1〜US4

## Phase 1: Setup

- [X] T001 ベースライン確認: `npx tsc --noEmit -p service-front`・`npm run test --workspace=service-front`・`npx playwright test`（service-front）が green であることを記録する（UI 刷新前の基準・デグレ判定用）

---

## Phase 2: Foundational（シェル土台・共通部品・ナビ定義）

**⚠️ このフェーズ完了までユーザーストーリー実装に着手しない**

- [X] T002 [P] ナビ定義 `service-front/src/shared/config/nav.ts` を作成する（contracts の `NavItem`・`NAV_ITEMS`（ダッシュボード /home exact・Instagram 連携 /instagram prefix・インポート /imports prefix）・`resolveActiveHref(pathname, items)` 純関数）
- [X] T003 [P] `service-front/src/shared/config/nav.test.ts` を書く: `resolveActiveHref` が exact/prefix を正しく判定し、詳細ページ（/imports/xxx）で親（/imports）を返すこと
- [X] T004 [P] 共通部品 `PageHeader`（`shared/components/layout/PageHeader/`・title=Heading level1 + description + actions スロット）を作成し `/generate-with-tests <PageHeader.tsx 絶対パス>` を実行する
- [X] T005 [P] 共通部品 `Card`（`shared/components/surface/Card/`・title=Heading level2 任意 + actions + children）を作成し `/generate-with-tests <絶対パス>` を実行する
- [X] T006 [P] 共通部品 `Notice`（`shared/components/surface/Notice/`・variant success/info=role status・error=role alert・色は既存トークン）を作成し `/generate-with-tests <絶対パス>` を実行する
- [X] T007 [P] 共通部品 `DataTable`（`shared/components/data/DataTable/`・columns/rows/getRowKey/emptyText・table セマンティクス・th scope=col・srOnlyHeader 対応）を作成し `/generate-with-tests <絶対パス>` を実行する
- [X] T008 [US1 準備] `AdminSidebar`（`shared/components/layout/AdminSidebar/`・`NAV_ITEMS` 描画・`usePathname` + `resolveActiveHref` でハイライト + `aria-current="page"`・collapsed でアイコンのみ（ラベルは sr-only 保持）・`onNavigate`）を作成し `/generate-with-tests <絶対パス>` を実行する
- [X] T009 [US1 準備] `AdminTopBar`（`shared/components/layout/AdminTopBar/`・サイト名 + サイドバートグル（aria-expanded）+ ThemeToggle（既存）+ user email + LogoutButton（既存）)を作成し `/generate-with-tests <絶対パス>` を実行する
- [X] T010 [US1 準備] `AdminShell`（`shared/components/layout/AdminShell/`・client・`AdminShellProps { user, defaultCollapsed, children }`・grid で nav/header/main 構成・折りたたみ状態を保持し Cookie `admin-sidebar-collapsed` を更新・モバイルは `@repo/ui` Sheet でサイドバー開閉・状態変化を localStorage でなく Cookie 永続）を作成し `/generate-with-tests <絶対パス>` を実行する
- [X] T011 チェックポイント: `npx tsc --noEmit -p service-front` + `npm run test --workspace=service-front` green（共通部品・ナビが単体で通る）

**Checkpoint**: シェル部品・共通部品・ナビが揃い、ページに組み込める

---

## Phase 3: User Story 1 - 管理画面シェルの中で操作する (Priority: P1) 🎯 MVP

**Goal**: 認証領域を AdminShell でラップし、公開領域と分離。遷移でシェルが保たれメニューがハイライトされる

**Independent Test**: quickstart.md シナリオ 1

### Implementation for User Story 1

- [X] T012 [US1] `service-front/src/app/layout.tsx` から `Header`/`Footer`/`ThemeToggle` の共通配置を除去し、Providers + テーマ初期化スクリプトのみにする（research Decision 2）
- [X] T013 [US1] 公開トップ `service-front/src/app/page.tsx` に `Header`/`Footer` を自前で内包させ、従来の見た目を維持する（`(auth)` 配下は中央寄せのまま影響なしを確認）
- [X] T014 [US1] `service-front/src/app/(authenticated)/layout.tsx` を改修する（既存の認証ガード・メール未確認弾きは維持したまま、Cookie `admin-sidebar-collapsed` を読み、`getUser()` の email とともに `AdminShell` で children をラップ）
- [X] T015 [US1] チェックポイント: quickstart.md シナリオ 1 を手動実行する（シェル表示・遷移でシェル保持・親ハイライト・ログアウト・未ログイン弾き・公開ページはシェルなし）

**Checkpoint**: 認証領域がシェル化され、既存ページがシェル内に表示される（MVP）

---

## Phase 4: User Story 2 - ダッシュボードで全体像を把握する (Priority: P1)

**Goal**: /home をウィジェット集約のダッシュボードに刷新（要約 + 導線・実操作は各専用ページ）

**Independent Test**: quickstart.md シナリオ 2

### Tests for User Story 2（先に書いて fail を確認）

- [X] T016 [P] [US2] `features/dashboard` のウィジェット（サーバーコンポーネント）に対する Vitest を書く: Instagram サマリ（接続済み/未接続/取得失敗）とインポートサマリ（あり/なし）の各状態表示 + 専用ページ導線。props 注入型で検証

### Implementation for User Story 2

- [X] T017 [US2] `features/dashboard/components/server/InstagramSummaryWidget/`（002 `InstagramAccountView` を props で受け、Card で要約 + `/instagram` への導線・失敗時 Notice(info)）を作成する — T016 の該当分を green にする
- [X] T018 [US2] `features/dashboard/components/server/ImportSummaryWidget/`（003 の最新取り込みサマリを props で受け、Card で要約 + `/imports` への導線・0 件時は導線のみ）を作成する — T016 の該当分を green にする
- [X] T019 [US2] `service-front/src/app/(authenticated)/home/page.tsx` をダッシュボードに刷新する（app 層で 002 `getInstagramAccount` / 003 `listImports`（+ 必要なら getImportDiff）を取得し各ウィジェットへ注入・feature 間 import は作らない・一方の取得失敗が全体を壊さない）
- [X] T020 [US2] チェックポイント: quickstart.md シナリオ 2 を手動実行する（ウィジェット並び・導線・未設定表示・片側失敗でも非破綻）

**Checkpoint**: US1 + US2 でダッシュボード管理画面が成立

---

## Phase 5: User Story 3 - 一貫した画面部品でコンテンツが構成される (Priority: P2)

**Goal**: Instagram 連携を専用ページ `/instagram` に移設し、各機能ページを共通部品へ載せ替え

**Independent Test**: quickstart.md シナリオ 3

### Implementation for User Story 3

- [X] T021 [US3] `service-front/src/app/(authenticated)/instagram/page.tsx` を新規作成し、002 の `InstagramAccountSection`（接続/更新/解除・状態表示は**機能不変**）を PageHeader + Card 構成で表示する（clarify: 専用ページ化）
- [X] T022 [US3] Instagram コールバックの戻り先を `/home` から `/instagram` に変更する（`app/api/instagram/callback/route.ts` の handler 呼び出し・`callback-handler.ts` の `redirectPath` の `/home?instagram_error=` → `/instagram?instagram_error=`、`connect/route.ts` の `next`、`InstagramAccountSection` の error 解釈箇所）。002 の actions テスト・callback-handler テストの期待値を同期更新する
- [X] T023 [US3] `/home` に残っていた IG カード直置き・imports 導線リンク・LogoutButton（シェルへ移設済み）を撤去し、ダッシュボード（US2）に一本化する。関連の重複を除去
- [X] T024 [US3] `service-front/src/app/(authenticated)/imports/page.tsx`・`[id]/page.tsx` を共通部品へ載せ替える（PageHeader + Card + `ImportHistoryList` を DataTable ベースに・Notice 統一。取り込み・差分・削除・分析の**機能は不変**）。既存 `ImportHistoryList`/`ImportDiffView` のテストを同期更新
- [X] T025 [US3] `service-front/src/proxy.ts` の `APP_ROUTE_PREFIXES` に `/instagram` を追加する
- [X] T026 [US3] チェックポイント: quickstart.md シナリオ 3 を手動実行する（PageHeader/Card/DataTable/Notice の一貫表示・IG 専用ページの接続/更新/解除）

**Checkpoint**: 全ページが共通部品で統一され、IG 連携が専用ページで動作

---

## Phase 6: User Story 4 - 画面サイズに応じて操作できる (Priority: P2)

**Goal**: モバイルのサイドバー Sheet 開閉・デスクトップ折りたたみ・状態保持

**Independent Test**: quickstart.md シナリオ 4

### Implementation for User Story 4

- [X] T027 [US4] `AdminShell`/`AdminSidebar`/`AdminTopBar` のレスポンシブ挙動を仕上げる（モバイル: Sheet 開閉 + メニュー選択で自動クローズ / デスクトップ: 折りたたみトグルでアイコンのみ ↔ ラベル付き）。`AdminShell.test.tsx` に開閉トグル・aria-expanded の検証を追加
- [X] T028 [US4] 折りたたみ/開閉状態の Cookie 永続を検証・調整する（ページ移動をまたいで保持・SSR 初期描画が Cookie 値と一致してちらつかない）
- [X] T029 [US4] チェックポイント: quickstart.md シナリオ 4 を手動実行する（モバイル Sheet・デスクトップ折りたたみ・状態保持）

**Checkpoint**: 全ストーリー完成

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T030 [P] Storybook: 主要な新規部品（AdminShell/AdminSidebar/PageHeader/Card/Notice/DataTable）の story が生成済みか確認し、不足を補う（ライト/ダーク両テーマの見え方確認）
- [X] T031 Playwright E2E `service-front/tests/admin-shell.spec.ts` を作成する（シェル表示・メニュー遷移とハイライト・ダッシュボードウィジェット・モバイル Sheet 開閉を自動化。`/home`・`/instagram`・`/imports` をライト/ダーク両テーマで axe スキャン違反 0 件（SC-004））
- [X] T032 デグレ確認: 既存 E2E（`instagram-connect-flow.spec.ts`・`follower-import-flow.spec.ts`）を実行し、IG コールバックの `/instagram` 移設・UI 載せ替え後も**全て緑**であることを確認する（SC-006）。壊れたセレクタ・遷移先は spec の意図に沿って各 spec を更新
- [X] T033 全品質ゲート: `npx tsc --noEmit -p service-front`・`npm run test --workspace=service-front`・`npx playwright test`・`npm run build --workspace=service-front`・`npx biome check --write .`・`npm run lint:markup --workspace=service-front` をすべて green にする
- [X] T034 quickstart.md シナリオ 1〜5 を通しで実行し、SC-001〜SC-006 の達成を確認する
- [X] T035 `/sync-spec` を実行して実装と specs/004-admin-ui-shell の整合を最終確認し、ズレは仕様書側を実装に合わせて更新する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2** は Phase 1 後。全ストーリーをブロック（T002〜T007 は並列可、T008/T009/T010 は共通部品に依存し順次寄り）
- **Phase 3（US1）**: Phase 2 完了後。T012→T013（Header 移設）→ T014（シェル組み込み）
- **Phase 4（US2）**: US1 でシェルが入った後（ダッシュボードはシェル内に描画）。T016→T017/T018→T019
- **Phase 5（US3）**: US1 後。T021（IG 専用ページ）→ T022（コールバック移設）→ T023（/home 整理）。T024（imports 載せ替え）は US1 後いつでも
- **Phase 6（US4）**: AdminShell（T010）実装後。US1 のシェル組み込み後に総仕上げ
- **Phase 7**: 全ストーリー後。**T032 のデグレ確認は必須**

### Task-level 注意

- T022 は 002 の実コード（callback-handler・actions・InstagramAccountSection）とそのテストを触るため、002 のテスト期待値（`/home?instagram_error=` → `/instagram?instagram_error=`）を同時に更新する
- 既存 E2E（002/003）の遷移先 URL アサーションは T022/T024 で影響を受ける可能性大 → T032 で必ず追随

### Parallel Opportunities

- Phase 2 の共通部品 T004〜T007 は別ファイルで並列可
- Phase 4 のウィジェット T017/T018 は別ファイルで並列可
- Phase 7 の T030 は T031 と並列可

## Parallel Example: Foundational

```bash
# 共通部品を並列作成（各 /generate-with-tests 込み）:
Task: "PageHeader を作成"   # T004
Task: "Card を作成"         # T005
Task: "Notice を作成"       # T006
Task: "DataTable を作成"    # T007
```

---

## Implementation Strategy

### MVP First（Phase 1 → 2 → 3）

1. Foundational で共通部品 + シェル部品を固める
2. US1（シェル化）で認証領域を AdminShell に載せ、公開領域と分離 → **MVP**（既存ページがシェル内で動く）
3. US2（ダッシュボード）→ US3（共通部品化 + IG 専用ページ）→ US4（レスポンシブ）を priority 順に

### Notes

- **DB 変更なし・既存サーバーロジック不変**。触るのは UI 層とルーティング（+ IG コールバックの戻り先）のみ
- 最大リスクは既存機能のデグレ（SC-006）と 002/003 E2E の遷移先アサーション → T032 を必ず通す
- 各フェーズ末尾のチェックポイントで green を維持したままコミット（UI 再構成は `refactor:`、新規部品・ダッシュボードは `feat:`）
