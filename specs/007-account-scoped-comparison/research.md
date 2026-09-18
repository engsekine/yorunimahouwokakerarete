# Research: アカウント ID による前回比較と保存件数の上限 — 007-account-scoped-comparison

**Date**: 2026-09-18 | **Plan**: [plan.md](./plan.md)

Technical Context に NEEDS CLARIFICATION は無い（spec の Clarifications で業務判断は確定済み）。ここでは実装方式の判断を記録する。

## Decision 1: 保持ルールの適用場所 — 純関数 `planRetention` + 保存時に 1 回の `writeAtomically`

- **Decision**: 「新しい記録を保存するときに何を取り除くか」を純関数 `planRetention(existing, incomingAccountUsername, { maxRetained, replaceAll })` で決め、戻り値（取り除く記録 id の配列・拒否理由）を `saveImport` に渡す。`saveImport` は `[取り除く記録のエントリ削除 ×N, 新規エントリ 2 本, サマリ配列（取り除いた記録を除外 + 新規追加）]` を **1 回の `writeAtomically`** で書く。
- **Rationale**: 保持ルール・別アカウント判定・旧データ（3 件以上・混在）の扱いをすべて 1 つの純関数で網羅テストできる（Constitution III）。取り除きと保存が同一トランザクションになるため FR-005 / FR-007a の「途中失敗で古い記録が消えない・新しい記録が現れない」を `writeAtomically` のロールバックだけで満たす。
- **Alternatives considered**: 保存成功後に別途 prune する → 保存と取り除きの間に失敗すると 3 件残る（FR-004 違反）か、逆順にすると取り除いた後に保存が失敗して前回記録を失う。却下。読み出し時（画面表示）に prune する → spec FR-011（画面を開いただけでは消さない）に反する。却下。

## Decision 2: 書き込み順序 — 取り除き（削除）を先、新規エントリ、最後にサマリ配列

- **Decision**: `writeAtomically` へ渡す順は (1) 取り除く記録の `follower-import-entries:*` を `null`（削除）、(2) 新規記録のエントリ 2 本、(3) `follower-imports`（取り除きを反映した配列 + 新規サマリ）。
- **Rationale**: 削除を先に行うことで容量を空けてから新規エントリを書け、上限付近での QuotaExceeded を避けやすい。失敗時は `writeAtomically` が削除した値も復元する（復元は「直前まで存在していた値」なので容量的に収まる）。サマリ配列を最後にすることで、途中失敗時に一覧へ新規記録が現れない（003 FR-009 と同じ設計）。
- **Alternatives considered**: 新規を先に書く → 上限付近で無駄に失敗する。却下。

## Decision 3: 比較対象の決定 — `readPreviousImport` をアカウント ID（正規化）で絞る

- **Decision**: `readPreviousImport(current)` を「`importedAt < current.importedAt` かつ `normalize(accountUsername) === normalize(current.accountUsername)` の最新」に変更する。`normalize` は既存の trim + 小文字化（actions と共通化して lib に置く）。同一日時は `importedAt` 文字列比較 + `id` で安定ソートし、順序が入れ替わらないようにする（spec Edge Case）。
- **Rationale**: 保存が 1 アカウントに収束した後は実質「直前の記録」と同じだが、旧データ（別アカウント混在）が残っている期間や、FR-007a 直後の状態でも別アカウントと比較しないことを保証する（FR-002）。
- **Alternatives considered**: 「1 アカウントしか保存されない前提」で絞り込みを省く → 旧データ期間に別アカウントと比較してしまう。却下。

## Decision 4: 別アカウント拒否と「すべて削除して取り込む」 — 新コード `account_conflict` + `replaceExisting` フラグ

- **Decision**: `uploadImport` の入力に `replaceExisting: boolean` を追加。既存記録に指定アカウント ID と異なるものが 1 件でもあり `replaceExisting` が false なら `actionFailure(IMPORT_ERROR_MESSAGES.account_conflict, 'account_conflict')` を返す。true なら `planRetention` を `replaceAll: true` で呼び、既存全件の取り除き + 新規保存を Decision 1 の経路で原子的に行う。既存の `account_mismatch`（入力値と `ownerUsername` の相違・確認チェックで続行）は FR-008 として維持し、「前回の記録と異なる」条件は `account_mismatch` から外す。
- **Rationale**: 003 では前回不一致を「警告 + 続行」にしていたが、本仕様では「拒否 + 全削除で切り替え」に変わるため、別コードで UI 分岐（確認チェック vs 全削除ボタン）を機械判別できるようにする（ActionResult の `code` 運用に沿う）。全削除 + 保存を 1 アクションにまとめることで、削除だけ成功して保存が失敗する状態を作らない（FR-007a）。
- **Alternatives considered**: 既存の `deleteAllImports` → `uploadImport` を UI で直列に呼ぶ → 2 回目が容量超過等で失敗すると記録が 0 件になる。却下。`confirmMismatch` を流用 → 「警告の承諾」と「全削除の承諾」は意味が異なり、誤って全削除になる事故を招く。却下。

## Decision 5: アカウント ID の自動入力 — `peekOwnerUsername(files)` をファイル選択時に呼ぶ

- **Decision**: `lib/parse-export` に `peekOwnerUsername(files: UploadFile[]): string | null` を追加する。JSON ファイル群からは `personal_information` を名前に含むファイルのみ、ZIP からは fflate の `filter` で同名エントリのみ展開して `extractOwnerUsername` を適用する（フォロワー一覧は展開・解析しない）。`ImportUploadForm` はファイル `onChange` でこれを呼び、取れた値を入力欄に設定する（利用者が入力欄を手で編集した後は上書きしない = `isAccountDirty` 状態で制御）。自動入力時は `role="status"` で「エクスポートから自動入力しました」と通知する。既定値の優先順（FR-012）: 抽出値 → 保存済み記録のアカウント ID → 空（必須）。
- **Rationale**: 全件解析（`parseExportFiles`）はファイル選択時に走らせると 1 万件 ZIP で体感遅延が出る。本人名の抽出だけなら小さなファイル 1 つで済む。手編集後に上書きしないのは、利用者が意図して修正した値を消さないため（spec「利用者が確認・修正して取り込む」）。
- **Alternatives considered**: 取り込み実行時に `ownerUsername` で入力値を上書き → 利用者が確認できず FR-012 の「確認・修正」に反する。却下。ファイル選択時に `parseExportFiles` を丸ごと呼ぶ → 二重解析で遅い。却下。

## Decision 6: 取り込み前の案内 — フォームに保存状況を props で渡し、入力値から導出する

- **Decision**: `ImportsPageContent` が `useImports()` の結果から `storedImports`（サマリ配列）を `ImportUploadForm` に渡す。フォームは入力欄を制御コンポーネントにし、(a) `storedImports.length >= MAX_RETAINED_IMPORTS` かつ入力値が保存済みアカウント ID と一致 → 「取り込むと最も古い記録（日時）が置き換わります」（FR-006）、(b) 入力値が保存済みアカウント ID と異なる → 「保存済みの記録は @x のものです。このアカウントで取り込むには既存の記録の削除が必要です」（spec Edge Case）を `role="status"` で表示する。いずれも確認操作は要求しない。
- **Rationale**: 案内は入力途中でも追従すべき情報であり、提出前に気付けることが目的（spec US2 シナリオ 2・Edge Case）。保存状況は既に `useImports` で取得済みのため追加クエリ不要。
- **Alternatives considered**: 提出後の失敗メッセージだけ → FR-006「取り込み前に表示」に反する。却下。

## Decision 7: ダッシュボードの比較要約 — 件数だけを返す軽量クエリ `getLatestComparisonSummary`

- **Decision**: `queries.ts` に `getLatestComparisonSummary(): Promise<ComparisonSummary | null>` を追加。最新記録（`readImports()[0]`）と Decision 3 の比較対象を取り、`computeFollowerDiff` の結果から `gainedCount` / `lostCount`、サマリから `followerDelta` を求めて返す（一覧は返さない）。`hooks` に `useLatestComparison`（key: `['follower-import', 'latest-comparison']`）を追加し、`index.ts` から公開。`DashboardWidgets` が呼び、`ImportSummaryWidget` に `comparison` として渡す。既存の `useImports` による「まだ取り込みがありません」判定は維持し、比較要約の取得失敗は要約部分だけ「取得できませんでした」に置き換える（spec Edge Case）。
- **Rationale**: `getImportDetail` は分析 + 全一覧を返すためダッシュボードには過剰。件数だけの型にすることで FR-016（一覧は出さない）を型で担保し、FR-017（差分画面と件数一致）は同じ `computeFollowerDiff` を通すことで保証する。
- **Alternatives considered**: `useImportDetail(latestId)` を再利用 → 1 万件の一覧をダッシュボードで毎回復元する。却下。取り込み時に件数を保存 → 導出データを保存すると削除時の整合が崩れる（003 Decision 5 と同じ理由）。却下。

## Decision 8: 旧データ（3 件以上・別アカウント混在）の扱い — 専用マイグレーション無し

- **Decision**: 移行コードは書かない。同一アカウントの余剰は `planRetention` が「上限を超える分を古い順にすべて」取り除き対象に含めることで次回取り込み時に解消する。別アカウント混在は Decision 4 の `account_conflict` により拒否 → 全削除して取り込む、で解消する。履歴はそれまで全件を表示する（FR-011）。
- **Rationale**: spec Clarifications で「次の取り込み時に整理」と確定。純関数の入力に「既存 N 件」を与えるだけで旧データも新データも同じルールで扱えるため、分岐が増えない。
- **Alternatives considered**: 初回表示時に自動整理 → 利用者操作なしにデータを消す（Clarifications で却下）。

## 補足: 用語

- 画面上の呼称は spec に合わせて **「アカウント ID」** に統一する（入力欄ラベル・履歴列・案内文）。内部の識別子名（`accountUsername`・保存キーの項目名）は互換のため変更しない。e2e の `getByLabel('対象の Instagram アカウント名')` はラベル変更に合わせて更新する。
