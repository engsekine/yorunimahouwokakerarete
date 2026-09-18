# Tasks: フォロワーリストのインポートと差分表示（個人アカウント対応）

**Input**: Design documents from `/specs/003-follower-import-diff/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, screens/, quickstart.md

**Tests**: constitution III（テストファースト）に基づきテストタスクを含む。パーサ・actions・queries は契約テストを先に書いて fail を確認してから実装する。新規コンポーネントは作成後に `/generate-with-tests` でテスト類を生成する。

**Organization**: ユーザーストーリー単位でフェーズ分割。マイグレーション・依存追加・テストフィクスチャは全ストーリーが依存するため Phase 2（Foundational）に置く。002 の Instagram 接続には依存しない。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能 / **[Story]**: 対応ユーザーストーリー（US1〜US4）

## Phase 1: Setup

- [X] T001 `fflate` を service-front の dependencies に追加し（`npm install fflate --workspace=service-front`）、`service-front/next.config.ts` に `experimental.serverActions.bodySizeLimit: '50mb'` を設定する（research Decision 2・3）
- [X] T002 ベースライン確認: `npx tsc --noEmit -p service-front`・`npm run test --workspace=service-front` が green であることを記録する

---

## Phase 2: Foundational（DB スキーマ・フィクスチャ・feature 骨格）

**⚠️ このフェーズ完了までユーザーストーリー実装に着手しない**

- [X] T003 マイグレーション `supabase/migrations/20260717100000_create_follower_import_tables.sql` を data-model.md 通りに作成する（`follower_imports`（status・updated_at トリガー）・`follower_import_entries`（`unique (import_id, kind, username)`）・RLS 本人 select（completed のみ）・GRANT 明示（authenticated=select / service_role=CRUD））
- [X] T004 `supabase db reset` を実行し、テーブル・RLS・unique 制約・GRANT（authenticated から entries の insert 不可）を psql で確認する（T003 完了後）
- [X] T005 型再生成: `supabase gen types typescript --local > packages/supabase/src/types.ts` → biome 整形（T004 完了後）
- [X] T006 [P] テストフィクスチャを `service-front/tests/fixtures/instagram-export/` に作成する: 世代 1 ZIP（followers_1.json + following.json + personal_information.json 入り）・世代 2 の分割 JSON（followers_1/2.json・既知差分: 新規 2 名/解除 1 名）・HTML 形式エクスポート・無関係 JSON。生成スクリプトではなく静的ファイルとしてコミットする
- [X] T007 [P] feature 骨格を作成する: `service-front/src/features/follower-import/constants.ts`（`MAX_UPLOAD_BYTES = 50MB`・kind 種別・エラーメッセージ（形式不正時の JSON 再エクスポート手順文言含む））と `features/follower-import/index.ts`
- [X] T008 チェックポイント: `npx tsc --noEmit -p service-front` green

**Checkpoint**: スキーマ・フィクスチャ・骨格が完成

---

## Phase 3: User Story 1 - エクスポートファイルを取り込む (Priority: P1) 🎯 MVP

**Goal**: ZIP / 分割 JSON のアップロード → 解析 → 原子的保存 → 件数表示

**Independent Test**: quickstart.md シナリオ 1

### Tests for User Story 1（先に書いて fail を確認）

- [X] T009 [P] [US1] `service-front/src/features/follower-import/lib/parse-export/parse-export.test.ts` を書く: ZIP から followers/following 抽出・分割ファイル統合・username 正規化（小文字化 trim）と重複排除・ownerUsername 抽出・following 無しで空配列・HTML/無関係ファイルで `no_target_files`・破損 ZIP で `zip_corrupted`（フィクスチャ使用）
- [X] T010 [P] [US1] `service-front/src/features/follower-import/server/actions.test.ts` に `uploadImport` のテストを書く: 成功（processing→エントリ INSERT→completed・counts 反映）/ 上限超過・非対応形式の拒否 / `invalid_export` コード / アカウント名不一致で `account_mismatch`（confirmMismatch で通過）/ エントリ INSERT 途中失敗時に import 行を削除（FR-009）

### Implementation for User Story 1

- [X] T011 [US1] `lib/parse-export/parse-export.ts` + `index.ts` を実装する（fflate `unzipSync`・ファイル名パターン探索・contracts の `ParsedExport` / `ParseExportError`）— T009 を green にする
- [X] T012 [US1] `server/actions.ts` に `uploadImport` を実装する（requireUser → サイズ/形式検証 → parse → アカウント名照合（research Decision 8）→ service role で import 行 + エントリのバッチ INSERT（1,000 件/回）→ completed 更新 → revalidatePath('/imports')。失敗時は補償削除）— T010 を green にする
- [X] T013 [US1] `components/client/ImportUploadForm/` を新規作成する（複数ファイル入力（label 関連付け・accept=.zip,.json）・アカウント名入力・`account_mismatch` 時の確認チェック表示・処理中 `aria-busy`・結果 `aria-live` / 失敗 `role="alert"`・成功時 `/imports/[id]` へ遷移）。作成後 `/generate-with-tests <ImportUploadForm.tsx の絶対パス>` を実行する
- [X] T014 [US1] `service-front/src/app/(authenticated)/imports/page.tsx` を新規作成し（手順説明 + ImportUploadForm・`generatePageMetadata`・screens/imports.md 準拠）、`service-front/src/proxy.ts` の `APP_ROUTE_PREFIXES` に `'/imports'` を追加する
- [X] T015 [US1] チェックポイント: quickstart.md シナリオ 1（ZIP / 分割 JSON / HTML 拒否 / DB 状態）を手動実行する

**Checkpoint**: 取り込みが単独で end-to-end 動作する（MVP）

---

## Phase 4: User Story 2 - 前回との差分を見る (Priority: P1)

**Goal**: 隣接取り込みの差分（新規/解除）表示・0 件/初回の明示・プロフィール導線

**Independent Test**: quickstart.md シナリオ 2

### Tests for User Story 2（先に書いて fail を確認）

- [X] T016 [P] [US2] `server/queries.test.ts` に `listImports` / `getImportDiff` のテストを書く: 新規/解除の集合差が正しい・同一内容で差分 0・初回は previous=null・processing は対象外・他人の id は null

### Implementation for User Story 2

- [X] T017 [US2] `server/queries.ts` に `listImports` / `getImportDiff` を実装する（本人セッション + RLS・隣接判定は `imported_at` 順・差分は SQL 集合差 / research Decision 5）— T016 を green にする
- [X] T018 [US2] `components/server/ImportDiffView/` を新規作成する（新規/解除セクション・件数・外部プロフィールリンク（`rel="noopener noreferrer"`）・差分 0 件/初回の明示・ユーザーネーム変更の注記。screens/imports.md 準拠）。`ImportDiffView.test.tsx`・`index.ts` を同梱する
- [X] T019 [US2] `service-front/src/app/(authenticated)/imports/[id]/page.tsx` を新規作成する（`getImportDiff` が null なら `notFound()`・`generatePageMetadata`）
- [X] T020 [US2] チェックポイント: quickstart.md シナリオ 2 を手動実行する（既知差分の一致・外部リンク・0 件表示・注記）

**Checkpoint**: US1 + US2 で「誰が増えて誰が外したか」が見える

---

## Phase 5: User Story 3 - 取り込み履歴と過去の差分 (Priority: P2)

**Goal**: 履歴一覧・過去差分の再表示・確認付き削除

**Independent Test**: quickstart.md シナリオ 3

### Tests for User Story 3（先に書いて fail を確認）

- [X] T021 [P] [US3] `server/actions.test.ts` に `deleteImport` のテストを追加する: 本人所有の削除成功 / 他人の id は失敗し削除しない / 削除後の隣接差分が再計算される（queries 側の検証と合わせる）

### Implementation for User Story 3

- [X] T022 [US3] `server/actions.ts` に `deleteImport` を実装する（service role で user_id 照合 → 行削除（entries cascade）→ revalidatePath）— T021 を green にする
- [X] T023 [US3] `components/server/ImportHistoryList/`（履歴一覧・`/imports/[id]` へのリンク・test 同梱）と `components/client/DeleteImportButton/`（ConfirmDialog 付き）を新規作成し、`/imports` ページに組み込む。DeleteImportButton は作成後 `/generate-with-tests <絶対パス>` を実行する
- [X] T024 [US3] チェックポイント: quickstart.md シナリオ 3 を手動実行する（履歴順・過去差分・削除と再計算）

**Checkpoint**: 取り込みライフサイクルが一巡する

---

## Phase 6: User Story 4 - フォロー関係の分析 (Priority: P3)

**Goal**: 非相互フォローの 2 一覧（following 未同梱時は案内）

**Independent Test**: quickstart.md シナリオ 4

### Tests for User Story 4（先に書いて fail を確認）

- [X] T025 [P] [US4] `server/queries.test.ts` に `getMutualAnalysis` のテストを追加する: 非相互 2 一覧の集合差が正しい / following 未同梱（following_count=0）で null

### Implementation for User Story 4

- [X] T026 [US4] `server/queries.ts` に `getMutualAnalysis` を実装し、`ImportDiffView` に分析セクション（未同梱時の案内含む）を追加して `ImportDiffView.test.tsx` を同期更新する — T025 を green にする
- [X] T027 [US4] チェックポイント: quickstart.md シナリオ 4 を手動実行する（非相互一覧・未同梱案内・別ユーザー分離・アカウント名警告）

**Checkpoint**: 全ストーリー完成

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T028 [P] `service-front/src/app/(authenticated)/home/page.tsx` に `/imports` への導線（個人アカウント向け機能の案内リンク）を追加し、関連テストを同期する
- [X] T029 Playwright E2E `service-front/tests/follower-import-flow.spec.ts` を作成する（専用ユーザー登録 → フィクスチャで シナリオ 1〜4 を自動化・シリアル実行・`/imports`・`/imports/[id]` の各状態で axe スキャン違反 0 件（SC-006）・別ユーザー分離（SC-005））
- [X] T030 全品質ゲート: `npx tsc --noEmit -p service-front`・`npm run test --workspace=service-front`・`npx playwright test`・`npm run build --workspace=service-front`・`npx biome check --write .`・`npm run lint:markup --workspace=service-front` をすべて green にする
- [X] T031 quickstart.md シナリオ 1〜5 を通しで実行し、SC-001〜SC-006 の達成（1 万件フィクスチャでの SC-003 計測含む）を確認する
- [X] T032 `/sync-spec` を実行して実装と specs/003-follower-import-diff の整合を最終確認し、ズレは仕様書側を実装に合わせて更新する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2** は Phase 1 完了後。全ストーリーをブロック（T004→T005、T006/T007 は並列可）
- **Phase 3（US1）**: Phase 2 完了後。T011 ← T009・T006 / T012 ← T010・T011 / T013 ← T012 / T014 ← T013
- **Phase 4（US2）**: US1 の取り込み（T012）完了後が実質前提（テストデータ投入に uploadImport を使うため）。T017 ← T016 / T019 ← T017・T018
- **Phase 5（US3）**: T022 ← T021 / T023 ← T022・T017（listImports）
- **Phase 6（US4）**: T026 ← T025・T018
- **Phase 7**: 全ストーリー完了後
- `actions.ts` / `actions.test.ts`（T010/T012・T021/T022）と `queries.ts` / `queries.test.ts`（T016/T017・T025/T026）は同一ファイルのため並行編集しない

### Parallel Opportunities

- Phase 2: T006 と T007 / Phase 3: T009 と T010 / Phase 7: T028 は T029 と並列可
- US3 と US4 は対象ファイルが分かれる範囲（T023 の components と T026 の ImportDiffView）で並行作業可能

## Parallel Example: User Story 1

```bash
# テストを並列で先行作成（fail 確認まで）:
Task: "parse-export.test.ts を書く"   # T009（フィクスチャ T006 に依存）
Task: "uploadImport のテストを書く"   # T010

# その後 T011 → T012 → T013 → T014 → T015 検証
```

---

## Implementation Strategy

### MVP First（Phase 1 → 2 → 3）

1. Foundational でスキーマ + フィクスチャを固める
2. US1（取り込み）を完成させ quickstart シナリオ 1 で検証 → **MVP**
3. US2（差分）→ US3（履歴・削除）→ US4（分析）を priority 順に積み増す

### Notes

- パーサは I/O を持たない純関数に保つ（フィクスチャテストが高速・決定的になる）
- エントリの INSERT は service role のバッチ（1,000 件/回）。途中失敗時は import 行の補償削除で痕跡を残さない（FR-009）
- 各フェーズ末尾のチェックポイントで green を維持したままコミット（`feat:` / `test:`）
