# Tasks: フォロワー・フォロー中の ID 一覧表示

**Input**: Design documents from `/specs/005-follower-list-view/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/, screens/, quickstart.md

**Tests**: constitution III に基づきテストタスクを含む。公開クエリ・一覧コンポーネント（タブ/検索/空/未同梱）を Vitest 先行。新規コンポーネントは `/generate-with-tests` で生成。**DB 変更なし・003 の既存データを読むだけ**の読み取り機能のため、003/004 の既存 E2E を緑のまま保つ（デグレ防止）。

**Organization**: US1（フォロワー一覧）と US2（フォロー中一覧）は同一コンポーネント（タブ）で提供するため密結合。US3（検索）は同コンポーネントへの追加。foundational でクエリ公開とコンポーネント土台を作る。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能 / **[Story]**: US1〜US3

## Phase 1: Setup

- [X] T001 ベースライン確認: `npx tsc --noEmit -p service-front`・`npm run test --workspace=service-front` が green であることを記録する

---

## Phase 2: Foundational（クエリ公開）

**⚠️ このフェーズ完了までユーザーストーリー実装に着手しない**

- [X] T002 `service-front/src/features/follower-import/server/queries.test.ts` に `getImportEntries` のテストを追加する: 指定 import_id + kind の全件を username 昇順で返す・他人/未存在 id は空配列・following 種別も取得できる（既存 setupClient モックを流用）
- [X] T003 `service-front/src/features/follower-import/server/queries.ts` の private `fetchEntries` を公開クエリ `getImportEntries(importId, kind)` として切り出す（既存 `getImportDiff` は内部で同関数を使うようリファクタ・戻り値は `DiffEntry[]`）— T002 を green にする
- [X] T004 チェックポイント: `npx tsc --noEmit -p service-front` + `npm run test --workspace=service-front` green（既存差分テストも緑のまま）

**Checkpoint**: 一覧の全件取得クエリが公開され、既存差分機能に影響がない

---

## Phase 3: User Story 1 & 2 - フォロワー / フォロー中の ID 一覧を見る (Priority: P1) 🎯 MVP

**Goal**: 取り込みの全メンバー ID をタブ切替で全件表示し、プロフィールへ移動できる

**Independent Test**: quickstart.md シナリオ 1・2

### Tests for User Story 1 & 2（先に書いて fail を確認）

- [X] T005 [P] [US1] `service-front/src/features/follower-import/components/client/FollowerListView/FollowerListView.test.tsx` を書く: フォロワータブに全件 + 件数表示・各 ID が外部プロフィールリンク（rel="noopener noreferrer"）・フォロワー 0 件で「フォロワーがいません」（US1）/ フォロー中タブへ切替で全件表示・aria-selected 反映・following=null で「フォロー中一覧が含まれていません」案内（US2）

### Implementation for User Story 1 & 2

- [X] T006 [US1] `service-front/src/features/follower-import/components/client/FollowerListView/` を新規作成する（`FollowerListViewProps { followers, following: FollowerListEntry[] | null }`・タブ role=tablist/tab/tabpanel・各タブ件数・004 `DataTable`（1 列 `@username` 外部リンク）・0 件は emptyText・following=null は未同梱案内）。`index.ts` 同梱。作成後 `/generate-with-tests <FollowerListView.tsx の絶対パス>` を実行し、T005 を満たすよう調整する
- [X] T007 [US1] `features/follower-import/index.ts` に `FollowerListView` を re-export する
- [X] T008 [US1] `service-front/src/app/(authenticated)/imports/[id]/page.tsx` に一覧を組み込む（`getImportEntries(id,'follower')` / `getImportEntries(id,'following')` を取得。following_count===0 の取り込みは `following=null` を渡して未同梱と 0 件を区別。既存の差分・分析表示の下に Card で FollowerListView を配置）
- [X] T009 [US1] チェックポイント: quickstart.md シナリオ 1・2 を手動実行する（全件・件数・プロフィール導線・タブ切替・0 件/未同梱の出し分け）

**Checkpoint**: フォロワー/フォロー中の全 ID 一覧がタブで見られる（MVP）

---

## Phase 4: User Story 3 - 一覧から目的の ID を探す (Priority: P2)

**Goal**: ID 部分一致の絞り込み検索（大文字小文字非区別・件数通知）

**Independent Test**: quickstart.md シナリオ 3

### Tests for User Story 3（先に書いて fail を確認）

- [X] T010 [US3] `FollowerListView.test.tsx` に検索のテストを追加する: ID の一部入力で該当 ID のみ表示 + 件数「N 件表示中」更新・該当なしで「該当する ID がありません」・入力クリアで全件復帰・大文字小文字非区別

### Implementation for User Story 3

- [X] T011 [US3] `FollowerListView` に検索入力（`FormField` type=search・label「ID で絞り込む」）を追加する（現在タブの一覧を `username` 部分一致でフィルタ・デバウンス + useMemo・結果件数を `aria-live="polite"` で通知・0 件文言）— T010 を green にする
- [X] T012 [US3] チェックポイント: quickstart.md シナリオ 3 を手動実行する（絞り込み・該当なし・クリア復帰）

**Checkpoint**: 大規模一覧でも目的の ID を素早く探せる

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T013 Playwright E2E `service-front/tests/follower-list-view.spec.ts` を作成する（取り込み → `/imports/[id]` で一覧タブ切替・検索・0 件/未同梱・別ユーザー不可を自動化。ライト/ダーク両テーマで axe 違反 0 件（SC-005）。1 万件フィクスチャで表示・検索の実用速度を確認（SC-003））
- [X] T014 デグレ確認: 003（follower-import-flow）・004（admin-shell）の既存 E2E を実行し、`/imports/[id]` への一覧追加後も**全て緑**であること（SC-006 相当）
- [X] T015 全品質ゲート: `npx tsc --noEmit -p service-front`・`npm run test --workspace=service-front`・`npx playwright test`・`npm run build --workspace=service-front`・`npx biome check --write .`・`npm run lint:markup --workspace=service-front` をすべて green にする
- [X] T016 quickstart.md シナリオ 1〜5 を通しで実行し、SC-001〜SC-005 の達成を確認する
- [X] T017 `/sync-spec` を実行して実装と specs/005-follower-list-view の整合を最終確認し、ズレは仕様書側を実装に合わせて更新する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2** は Phase 1 後。全ストーリーをブロック（T002→T003→T004）
- **Phase 3（US1/US2）**: Phase 2 完了後。T005（テスト）→ T006（コンポーネント）→ T007（re-export）→ T008（ページ組み込み）
- **Phase 4（US3）**: US1/US2 の FollowerListView（T006）完了後。同一コンポーネントに検索を追加
- **Phase 5（Polish）**: 全ストーリー後。T014 のデグレ確認は必須

### Task-level 注意

- T003 は既存 `getImportDiff` と同じ `fetchEntries` を触るため、003 の差分テスト（queries.test.ts）が緑のままであることを T004 で確認する
- T010/T011 は T005/T006 と同じ `FollowerListView.test.tsx` / `.tsx` を触るため、US1/US2 実装後に逐次で行う（並行編集しない）

### Parallel Opportunities

- 本機能は単一コンポーネント + 単一クエリに集約されるため並列余地は小さい。T005 のテスト作成のみ他作業と並行可

## Parallel Example

```bash
# US1/US2: テスト先行 → 実装
Task: "FollowerListView.test.tsx（タブ/件数/空/未同梱）を書く"   # T005
# その後 T006 → T007 → T008 → T009 検証
```

---

## Implementation Strategy

### MVP First（Phase 1 → 2 → 3）

1. Foundational で `getImportEntries` を公開
2. US1/US2（タブ付き全件一覧）を完成させ quickstart シナリオ 1・2 で検証 → **MVP**
3. US3（検索）を同コンポーネントに追加

### Notes

- **DB 変更なし・読み取り専用**。触るのは queries の公開化・新規 client コンポーネント・`/imports/[id]` の組み込みのみ
- 検索はクライアント側フィルタ（サーバー再取得なし）。1 万件でも体感即時（research Decision 3）
- 各フェーズ末尾のチェックポイントで green を維持したままコミット（クエリ公開は `refactor:`、一覧・検索は `feat:`）
