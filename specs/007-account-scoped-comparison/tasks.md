# Tasks: アカウント ID による前回比較と保存件数の上限

**Input**: Design documents from `/specs/007-account-scoped-comparison/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/client-api.md, screens/imports-and-dashboard.md, quickstart.md

**Tests**: Constitution III（Test-First）に従い **テストタスクを含める**。各フェーズでテスト → 実装の順に並べ、テストが失敗することを確認してから実装に入る。`client/` のテストは jsdom の localStorage を実ストレージとして使い、モックに依存しない。

**Organization**: spec.md の User Story（US1〜US4）ごとにフェーズを分け、各フェーズ単独で検証できるようにする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 対応する User Story（US1〜US4）
- 各タスクに対象ファイルの正確なパスを含める

## Path Conventions

- 単一 Next.js アプリ。feature は `src/features/follower-import/`・`src/features/dashboard/`、e2e は `tests/`
- コンポーネント・lib は専用フォルダ（本体 + テスト + `index.ts`。コンポーネントは `*.stories.tsx` も）に置く（`.claude/rules/folder-structure.md`）
- 外部からは `index.ts` 経由で import する

---

## Phase 1: Setup（定数・型）

**Purpose**: 全フェーズが参照する定数・型・文言を先に確定する

- [X] T001 `src/features/follower-import/constants.ts` に `MAX_RETAINED_IMPORTS = 2`、`IMPORT_ERROR_MESSAGES.account_conflict`（関数 or テンプレート・`@x` を差し込む）、`RETENTION_NOTICE`、`ACCOUNT_SWITCH_NOTICE`、`OWNER_AUTOFILL_NOTICE`、`NO_PREVIOUS_NOTICE` を追加し、`account_mismatch` の文言を「エクスポート内の本人アカウント名と入力値が異なります」の意味に改める（contracts/client-api.md「定数・文言」）
- [X] T002 [P] `src/features/follower-import/types.ts` に `ComparisonSummary`（current / previous / followerDelta / gainedCount / lostCount）を追加する（data-model.md「型」）

---

## Phase 2: Foundational（保持ルール・保存経路・比較対象）

**Purpose**: US1〜US4 が共通で依存する純関数と保存経路。**このフェーズ完了までは User Story の実装に入らない**

### Tests（先に書いて失敗を確認）

- [X] T003 [P] `src/features/follower-import/lib/retention/retention.test.ts` を作成し、`normalizeAccountUsername`（trim + 小文字化）と `planRetention` の全ケース（data-model.md「保持ルール」の表 7 行 + 入力順序非依存 + 同一日時の `id` 安定ソート）をテストする
- [X] T004 [P] `src/features/follower-import/client/repository.test.ts` を新規作成し、`readImports` の安定ソート（`importedAt desc, id desc`）、`readPreviousImport` が同じアカウント ID（正規化一致）の直前だけを返すこと、`saveImport({ removeImportIds })` が取り除きと保存を 1 回の書き込みで行い、`setItem` を QuotaExceededError にした場合に取り除いた記録のエントリとサマリが復元されること（FR-005）を jsdom localStorage でテストする
- [X] T005 `src/features/follower-import/client/actions.test.ts` を更新する: 「前回と異なるアカウント名は account_mismatch」のケースを削除し、(a) 別アカウントの記録があると `account_conflict` で失敗して保存領域が変化しない、(b) `replaceExisting: true` で既存全件が消えて新規 1 件だけになる、(c) `replaceExisting: true` の保存が QuotaExceeded で失敗すると既存記録がそのまま残る（FR-007a）、(d) 同一アカウント 3 回目で最古が消えて 2 件になる（FR-004）、(e) 旧データ 4 件で取り込むと新規 + 直前の 2 件になる（FR-011）、(f) 大文字・空白違いは同一アカウント扱い、(g) `ownerUsername` と入力値の相違は引き続き `account_mismatch`（FR-008）、(h) `account_mismatch` が `account_conflict` より先に判定される、を追加する
- [X] T006 [P] `src/features/follower-import/client/queries.test.ts` に「`getImportDiff` の previous は同じアカウント ID の直前記録に限られ、別アカウントの記録が間にあっても飛ばされる」ケースを追加する

### Implementation

- [X] T007 `src/features/follower-import/lib/retention/retention.ts` に `normalizeAccountUsername` と `planRetention(existing, incomingAccountUsername, { maxRetained, replaceAll }): RetentionPlan` を実装し、`src/features/follower-import/lib/retention/index.ts` で再 export する（research Decision 1・data-model.md「保持ルール」）
- [X] T008 `src/features/follower-import/client/repository.ts` を更新する: `readImports` を `importedAt desc, id desc` の安定ソートにする。`readPreviousImport` を同じアカウント ID（`normalizeAccountUsername` 一致）かつ前（同一日時は `id` 比較）の最新に変える。`NewImportRecord` に `removeImportIds?: string[]` を追加し、`saveImport` の `writeAtomically` を「取り除く記録のエントリ削除 → 新規エントリ → サマリ配列（取り除きを反映）」の順にする（research Decision 2）
- [X] T009 `src/features/follower-import/client/actions.ts` を更新する: `UploadImportInput` に `replaceExisting: boolean` を追加。`normalize` を `lib/retention` の `normalizeAccountUsername` に置き換える。`account_mismatch` の条件から「前回の記録と異なる」を外し `ownerUsername` との相違だけにする。その後 `planRetention(imports, accountUsername, { maxRetained: MAX_RETAINED_IMPORTS, replaceAll: input.replaceExisting })` を呼び、`account_conflict` なら `actionFailure(IMPORT_ERROR_MESSAGES.account_conflict(conflicting), 'account_conflict')`、`ok` なら `saveImport({ ..., removeImportIds })` を呼ぶ（contracts/client-api.md「client/actions.ts」の判定順）
- [X] T010 `src/features/follower-import/hooks/useFollowerImports.ts` の `useUploadImport` の入力型が新 `UploadImportInput` に追従していることを確認し、`npm run test -- src/features/follower-import` で T003〜T006 が通ることを確認する

**Checkpoint**: 保持ルール・別アカウント拒否・全削除して取り込み・アカウント ID で絞った比較対象が、UI 抜きで単体テスト済み

---

## Phase 3: User Story 1 - 同じアカウントの前回記録と比較する (Priority: P1) 🎯 MVP

**Goal**: 同じアカウント ID の前回記録と比較し、別アカウントの記録があれば拒否して「すべて削除して取り込む」をその場で提供する。アカウント ID はエクスポートから自動入力し、利用者が確認・修正する

**Independent Test**: A で 2 回取り込んで差分が A の 1 回目と比較され、B を指定すると拒否され、拒否メッセージの「既存の記録をすべて削除して取り込む」を確認付きで実行すると A が消えて B が保存される（quickstart シナリオ 1・3・4）

### Tests（先に書いて失敗を確認）

- [X] T011 [P] [US1] `src/features/follower-import/lib/parse-export/parse-export.test.ts` に `peekOwnerUsername` のテストを追加する: JSON 群から `personal_information` の本人名を返す・無ければ null・ZIP 内の `personal_information.json` だけ展開して返す（`tests/fixtures/instagram-export/export-gen1.zip` の構成を確認し、本人情報が無ければテスト内で fflate `zipSync` により本人情報入り ZIP を生成する）・破損 ZIP や構造不一致は null で throw しない
- [X] T012 [P] [US1] `src/features/follower-import/components/client/ImportUploadForm/ImportUploadForm.test.tsx` を更新する: `storedImports` props で既定値が決まる（保存済みアカウント ID → 空 + required）、ファイル選択で本人名が自動入力され `role="status"` の通知が出る、手編集後はファイル再選択で上書きされない、入力値が保存済みと異なると `ACCOUNT_SWITCH_NOTICE` が出る、`account_conflict` 失敗で `role="alert"` と「既存の記録をすべて削除して取り込む」ボタンが出る、`account_mismatch` 失敗で確認チェックが出る（既存）
- [X] T013 [P] [US1] `src/features/follower-import/components/client/ImportDiffView/ImportDiffView.test.tsx` の「比較対象なし」ケースの期待文言を `NO_PREVIOUS_NOTICE`（「同じアカウント ID で」を含む）に更新する

### Implementation

- [X] T014 [P] [US1] `src/features/follower-import/lib/parse-export/parse-export.ts` に `peekOwnerUsername(files): string | null` を実装する（JSON は名前に `personal_information` を含むものだけ読む。ZIP は fflate の `unzipSync` に `filter` を渡して同名エントリのみ展開。既存 `extractOwnerUsername` を再利用し、例外はすべて null に変換）。`src/features/follower-import/lib/parse-export/index.ts` から export する（research Decision 5）
- [X] T015 [P] [US1] `src/features/follower-import/components/client/ReplaceAllAndImportButton/ReplaceAllAndImportButton.tsx` を新規作成する（props: `storedCount` / `conflictingAccountUsername` / `isPending` / `onConfirm`。destructive Button → 共通 `ConfirmDialog`（title「保存済みの記録をすべて削除して取り込みますか？」・description に件数と `@アカウント ID`・confirmLabel「削除して取り込む」・destructive）。`index.ts` を添える）。作成直後に `/generate-with-tests src/features/follower-import/components/client/ReplaceAllAndImportButton/ReplaceAllAndImportButton.tsx` を実行して test / story / a11y を生成する
- [X] T016 [US1] `src/features/follower-import/components/client/ImportUploadForm/ImportUploadForm.tsx` を更新する: props を `storedImports: ImportSummary[]` に変更。アカウント ID 欄を制御コンポーネントにし、ラベルを「対象の Instagram アカウント ID」に変更。ファイル `onChange` で `peekOwnerUsername` を呼び、`isAccountDirty` が false なら値を設定して `OWNER_AUTOFILL_NOTICE` を `role="status"` で表示。既定値の優先順（抽出値 → `storedImports[0].accountUsername` → 空 + `required`）。入力値（正規化）が保存済みアカウント ID と異なれば `ACCOUNT_SWITCH_NOTICE` を `role="status"` で表示。`uploadImport` に `replaceExisting: false` を渡し、失敗 `code === 'account_conflict'` なら `role="alert"` のメッセージ + `ReplaceAllAndImportButton` を表示し、`onConfirm` で同じファイル・入力値に `replaceExisting: true` を付けて再実行 → 成功で `/imports/[id]` へ遷移（screens/imports-and-dashboard.md「/imports」）
- [X] T017 [US1] `src/features/follower-import/components/client/ImportsPageContent/ImportsPageContent.tsx` の `ImportUploadForm` 呼び出しを `storedImports={imports ?? []}` に変更し、`ImportsPageContent.test.tsx` を追従させる
- [X] T018 [P] [US1] `src/features/follower-import/components/client/ImportDiffView/ImportDiffView.tsx` の「比較対象がまだありません…」を `NO_PREVIOUS_NOTICE` 定数に置き換える（FR-003）。`ImportDiffView.stories.tsx` の該当 story を確認する
- [X] T019 [P] [US1] `src/features/follower-import/components/client/ImportUploadForm/ImportUploadForm.stories.tsx` を更新する: `storedImports` 空 / 1 件 / 別アカウント入力中（`ACCOUNT_SWITCH_NOTICE` 表示）の story を用意する
- [X] T020 [US1] `tests/follower-import-flow.spec.ts` を更新する: `uploadFiles` のラベルを「対象の Instagram アカウント ID」に変更。US2 シナリオ後に「別アカウント（`other_account`）で取り込むと `role="alert"` に比較できるアカウントは 1 つの案内と『既存の記録をすべて削除して取り込む』が出て履歴は変わらない → 確認ダイアログでキャンセルすると変化なし → 承諾すると `other_account` の 1 件だけになり比較対象なし」を追加する。必要なら `tests/fixtures/instagram-export/` に別アカウント用フィクスチャ（gen1 の複製で可）と本人情報入り ZIP を追加する
- [X] T021 [US1] `tests/follower-import-flow.spec.ts` に「本人情報入り ZIP を選択するとアカウント ID 欄が自動入力され `role="status"` の通知が出る（FR-012）」を追加する

**Checkpoint**: US1 単独で quickstart シナリオ 1・3・4 が通る。`npm run test` / `npm run test:e2e -- follower-import-flow` 緑

---

## Phase 4: User Story 2 - 記録は最新と前回の 2 件だけ残る (Priority: P1)

**Goal**: 3 回目の取り込みで最古の記録を自動的に置き換え、取り込み前に案内を表示する。途中失敗で記録が失われない

**Independent Test**: 同じアカウント ID で 3 回取り込むと履歴が 2 件（2 回目・3 回目）になり、3 回目の差分が 2 回目と比較される。取り込み前のフォームに置き換え案内が出る（quickstart シナリオ 2）

### Tests（先に書いて失敗を確認）

- [X] T022 [P] [US2] `src/features/follower-import/components/client/ImportUploadForm/ImportUploadForm.test.tsx` に「`storedImports` が `MAX_RETAINED_IMPORTS` 件以上で入力値が保存済みアカウント ID と一致すると `RETENTION_NOTICE`（最古の取込日時を含む）が `role="status"` で表示される」「保存済みが 1 件なら表示されない」「入力値が別アカウントなら `RETENTION_NOTICE` ではなく `ACCOUNT_SWITCH_NOTICE` になる」を追加する

### Implementation

- [X] T023 [US2] `src/features/follower-import/components/client/ImportUploadForm/ImportUploadForm.tsx` に置き換え案内を追加する: `storedImports.length >= MAX_RETAINED_IMPORTS` かつ入力値（正規化）が `storedImports[0].accountUsername` と一致するとき、最古（`storedImports.at(-1)`）の `importedAt` を `formatJstDateTime` で差し込んだ `RETENTION_NOTICE` を `role="status"` で表示する（確認操作なし・FR-006）
- [X] T024 [P] [US2] `src/features/follower-import/components/client/ImportUploadForm/ImportUploadForm.stories.tsx` に「保存済み 2 件・置き換え案内表示」の story を追加する
- [X] T025 [US2] `tests/follower-import-flow.spec.ts` を更新する: 「1 万件の取り込み（SC-003）」の前に、保存済み 2 件の状態でフォームに「最も古い記録（…）が置き換わります」が表示されることを検証し、取り込み後に履歴の削除ボタンが 2 個のまま（最古が消えた）であることを確認する。既存の削除シナリオとの順序を調整して常に 2 件上限が成り立つ流れにする
- [X] T026 [P] [US2] `tests/follower-import-flow.spec.ts` に旧データの検証を追加する: `tests/helpers/browser-storage.ts` の `writeStorage` で `follower-imports` に同一アカウント 4 件（各 `follower-import-entries:<id>:follower` も書く）を用意 → `/imports` の履歴に 4 件表示 → 同じアカウントで取り込むと 2 件になり、余剰のエントリキーが消えている（FR-011・quickstart シナリオ 6）

**Checkpoint**: US1 + US2 で「1 アカウント・最大 2 件・原子的」が e2e で成立

---

## Phase 5: User Story 3 - 履歴を見て整理する (Priority: P2)

**Goal**: 履歴にアカウント ID を表示し、削除後の比較対象が残った記録同士で整合する。別アカウントへの切り替えは履歴からの削除でも可能

**Independent Test**: 記録 2 件で履歴の各行にアカウント ID が出る。最新を削除すると残りが比較対象なしになり、2 件とも削除すると別アカウントで通常取り込みできる（quickstart シナリオ 3-3・3-4）

### Tests（先に書いて失敗を確認）

- [X] T027 [P] [US3] `src/features/follower-import/components/client/ImportHistoryList/ImportHistoryList.test.tsx` に「アカウント ID 列（ヘッダ『アカウント ID』・セル `@username`）が表示される」を追加する
- [X] T028 [P] [US3] `src/features/follower-import/components/client/DeleteImportButton/DeleteImportButton.test.tsx` の確認ダイアログ description の期待文言を「残った記録同士で差分が計算し直されます」に更新する

### Implementation

- [X] T029 [P] [US3] `src/features/follower-import/components/client/ImportHistoryList/ImportHistoryList.tsx` の `columns` に「アカウント ID」列（`@${row.accountUsername}`）を取込日時の次に追加し、`ImportHistoryList.stories.tsx` のサンプルデータに `accountUsername` の異なる行（旧データ混在の見え方）を含める
- [X] T030 [P] [US3] `src/features/follower-import/components/client/DeleteImportButton/DeleteImportButton.tsx` の ConfirmDialog description を「削除すると、この取り込みのフォロワー一覧は失われ、残った記録同士で差分が計算し直されます。」に変更する
- [X] T031 [US3] `tests/follower-import-flow.spec.ts` の削除シナリオ（US3）を拡張する: 履歴テーブルに `@yorunimahouwokakerarete_owner` のセルが表示される → 最新を削除 → 残った記録を開くと「比較対象がまだありません」 → 残りも削除して 0 件 → `other_account` で通常取り込みが拒否されずに成功する

**Checkpoint**: 履歴からの整理と切り替えが e2e で成立

---

## Phase 6: User Story 4 - ダッシュボードで簡単な比較を見る (Priority: P2)

**Goal**: ホームのインポートサマリに直近取り込みの前回比・新規・解除の件数と差分画面への導線を表示する

**Independent Test**: gen1 → gen2 を取り込んだ状態で `/` を開くと「前回比 +1」「新規フォロワー 2 人」「フォロー解除 1 人」が出て差分画面の件数と一致し、「差分の詳細を見る」で `/imports/[id]` へ移動する（quickstart シナリオ 5）

### Tests（先に書いて失敗を確認）

- [X] T032 [P] [US4] `src/features/follower-import/client/queries.test.ts` に `getLatestComparisonSummary` のテストを追加する: 取り込み 0 件 → null、1 件 → previous null / followerDelta null / 0 / 0、2 件 → 既知の差分（新規 2・解除 1・delta +1）で `getImportDiff` の `gained.length` / `lost.length` と一致する、旧データで別アカウントが直前にあっても同じアカウントの記録と比較する
- [X] T033 [P] [US4] `src/features/dashboard/components/client/ImportSummaryWidget/ImportSummaryWidget.test.tsx` を更新する: `comparison` が previous あり（±N・新規・解除の表示・「差分の詳細を見る」リンクの href が `/imports/<id>`）、差分 0 件で「前回から変化はありません」が `role="status"`、previous null で `NO_PREVIOUS_NOTICE`、`comparison === undefined` で要約部分だけ取得失敗の Notice（件数は表示されたまま）、`latest === null` で従来の空表示
- [X] T034 [P] [US4] `src/features/dashboard/components/client/DashboardWidgets/DashboardWidgets.test.tsx` を更新する: `useLatestComparison` の結果が `ImportSummaryWidget` の `comparison` に渡り、失敗時は `undefined` になる

### Implementation

- [X] T035 [US4] `src/features/follower-import/client/queries.ts` に `getLatestComparisonSummary(): Promise<ComparisonSummary | null>` を実装する（`readImports()[0]` → `readPreviousImport` → `computeFollowerDiff(toDiffEntries(current,'follower'), toDiffEntries(previous,'follower'))` の件数のみ。previous 無しは 0 / 0・delta null）（research Decision 7）
- [X] T036 [US4] `src/features/follower-import/hooks/useFollowerImports.ts` に `followerImportKeys.latestComparison` と `useLatestComparison()` を追加し、`src/features/follower-import/index.ts` から `useLatestComparison` と `ComparisonSummary` 型を公開する
- [X] T037 [US4] `src/features/dashboard/components/client/ImportSummaryWidget/ImportSummaryWidget.tsx` を更新する: props に `comparison: ComparisonSummary | null | undefined` を追加。件数の下に `@アカウント ID・取込日時`、比較要約（前回比 `+N` / `-N` / `±0`・新規フォロワー N 人・フォロー解除 N 人。`Heading` を使う場合は `@/shared/components/typography/Heading`）、差分 0 件は `role="status"` の「前回から変化はありません」、previous null は `NO_PREVIOUS_NOTICE`、`comparison === undefined` は要約部分だけ `Notice variant="info"`、「差分の詳細を見る」リンク（`/imports/${current.id}`）を追加する（screens/imports-and-dashboard.md「/」）
- [X] T038 [US4] `src/features/dashboard/components/client/DashboardWidgets/DashboardWidgets.tsx` で `useLatestComparison` を呼び、`isError ? undefined : (data ?? null)` を `comparison` に渡す。`isLoading` は `importsQuery.isPending || comparisonQuery.isPending`
- [X] T039 [P] [US4] `src/features/dashboard/components/client/ImportSummaryWidget/ImportSummaryWidget.stories.tsx` に「比較あり」「変化なし」「比較対象なし」「要約取得失敗」の story を追加する
- [X] T040 [US4] `tests/dashboard-comparison.spec.ts` を新規作成する: 記録 0 件 → 空表示、gen1 取り込み後 → 比較対象なし、gen2 取り込み後 → 「前回比 +1」「新規フォロワー 2 人」「フォロー解除 1 人」が表示され `/imports/[id]` の見出し件数と一致・「差分の詳細を見る」で遷移、同一内容の再取り込み → 「前回から変化はありません」。各画面で axe 違反 0 件（`tests/follower-import-flow.spec.ts` の `expectNoAxe` と同じ構成）

**Checkpoint**: 全 User Story が独立して動作し、quickstart シナリオ 1〜6 が通る

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 仕様書の同期・品質ゲート・後片付け

- [X] T041 [P] `specs/003-follower-import-diff/spec.md` を `/sync-spec specs/003-follower-import-diff/spec.md` で更新する: US3（無制限履歴）・FR-006・FR-010・Assumptions（「隣接比較」「1 アカウント」）に「007 で置き換え」の注記を入れ、本仕様への参照を追加する
- [X] T042 [P] `specs/003-follower-import-diff/screens/imports.md` を実装に合わせて更新する: アカウント ID 欄のラベル・自動入力・置き換え案内・別アカウント拒否と全削除して取り込む・履歴のアカウント ID 列・比較対象なしの文言（007 `screens/imports-and-dashboard.md` を正とする）
- [X] T043 [P] `specs/006-standalone-browser-storage/spec.md` の Key Entities に新キーが無いこと、`follower-imports` の説明に「最大 2 件（007）」の注記を追加する
- [X] T044 `tests/a11y/` の対象ページ（`/`・`/imports`・`/imports/[id]`）で axe 違反 0 件を確認し、必要なら `tests/a11y/public-pages.spec.ts` にダッシュボードの比較要約表示状態を追加する
- [X] T045 `npm run type-check && npm run test && npm run test:storybook && npm run build` を実行して全緑を確認する（`npm run test:e2e` は T020〜T040 の e2e を含めて実行）
- [X] T046 `npx biome check --write .` を実行し、残るエラーを手動で修正する
- [X] T047 quickstart.md のシナリオ 1〜6 を検証し、結果を `specs/007-account-scoped-comparison/quickstart.md` に確認日として追記する（自動 e2e で代替。`npm run dev` での手動ブラウザ確認は未実施と明記）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1（Setup）**: 依存なし。T001 と T002 は並列可
- **Phase 2（Foundational）**: Phase 1 完了後。T003 / T004 / T006 は並列可、T005 は T001 の文言に依存。実装は T007 → T008 → T009 → T010 の順（T008 は T007 の `normalizeAccountUsername` を使う）
- **Phase 3〜6（User Stories）**: Phase 2 完了後。US1 と US4 は独立。US2 と US3 は US1 の `ImportUploadForm` / e2e 変更（T016・T020）の後に着手するとファイル競合が無い
- **Phase 7（Polish）**: すべての User Story 完了後

### User Story Dependencies

- **US1（P1）**: Phase 2 のみに依存。MVP
- **US2（P1）**: Phase 2 に依存。`ImportUploadForm.tsx` を US1（T016）と共有するため、T023 は T016 の後に行う
- **US3（P2）**: Phase 2 に依存。`tests/follower-import-flow.spec.ts` を US1 / US2 と共有するため、T031 は T020・T025 の後に行う
- **US4（P2）**: Phase 2 に依存。他 Story と共有するファイルが無く、US1 と並列で進められる

### Within Each User Story

- テスト → 実装の順（テストが失敗することを確認してから実装）
- lib → repository / queries → hooks → コンポーネント → e2e の順
- 新規コンポーネント作成直後に `/generate-with-tests` を実行する（T015）

### Parallel Opportunities

- Phase 2 のテスト 3 本（T003 / T004 / T006）は並列
- US1 の T011 / T012 / T013（テスト）、T014 / T015（lib・新規コンポーネント）、T018 / T019 は並列
- US4 の T032 / T033 / T034（テスト）は並列。US4 全体は US1 と並列
- Phase 7 の T041 / T042 / T043 は並列

---

## Parallel Example: Phase 2 → US1 / US4

```bash
# Phase 2 のテストを同時に書く
Task: "lib/retention/retention.test.ts で planRetention の全ケースをテスト"
Task: "client/repository.test.ts で readPreviousImport と saveImport(removeImportIds) の原子性をテスト"
Task: "client/queries.test.ts に同じアカウント ID の直前記録のケースを追加"

# Phase 2 完了後、US1 と US4 を並列で進める
Task: "[US1] parse-export.ts に peekOwnerUsername を実装"
Task: "[US1] ReplaceAllAndImportButton を新規作成し /generate-with-tests"
Task: "[US4] queries.ts に getLatestComparisonSummary を実装"
Task: "[US4] ImportSummaryWidget に comparison props を追加"
```

---

## Implementation Strategy

### MVP First（US1 のみ）

1. Phase 1 → Phase 2 を完了（保持ルール・保存経路・比較対象が単体テスト済み）
2. Phase 3（US1）を完了 → quickstart シナリオ 1・3・4 で検証
3. **ここで止めて検証**: 同じアカウントの前回比較・別アカウント拒否と全削除して取り込み・自動入力が成立していれば MVP

### Incremental Delivery

1. Phase 1 + 2 → 基盤完成（この時点で既に「最大 2 件」「別アカウント拒否」は actions レベルで有効）
2. US1 → 検証 → MVP
3. US2 → 置き換え案内と旧データ整理の e2e → 検証
4. US3 → 履歴のアカウント ID 列と切り替え → 検証
5. US4 → ダッシュボードの比較要約 → 検証
6. Phase 7 → 仕様書同期・品質ゲート

### Parallel Team Strategy

- 開発者 A: Phase 1 → 2 → US1 → US2 → US3
- 開発者 B: Phase 2 完了後に US4（US1 と競合するファイルが無い）
- Phase 7 は両者で分担（T041〜T043 は並列）

---

## Notes

- `[P]` = 別ファイル・依存なし。同じファイルを触るタスク（`ImportUploadForm.tsx`・`follower-import-flow.spec.ts`）には付けていない
- 保存キーは追加しない。`tests/helpers/browser-storage.ts` は変更不要
- `account_mismatch`（本人名との相違・確認チェック）と `account_conflict`（別アカウントの記録あり・全削除して取り込む）を混同しない。判定順は mismatch → conflict
- 既存コンポーネントを編集したら同階層の `*.test.tsx` / `*.stories.tsx` を必ず同期する（`.claude/CLAUDE.md`「テスト同期ルール」）
- 各タスク完了ごとにコミット（`feat:` / `test:` / `docs:`）。レビュー修正後は `npx biome check .`
