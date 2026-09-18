# Contract: lib / repository / actions / queries / hooks — 007-account-scoped-comparison

**Plan**: [../plan.md](../plan.md) | 実装先: `src/features/follower-import/`・`src/features/dashboard/`

すべてブラウザ内で完結する（Server Actions / Route Handler なし・006 FR-003）。戻り値の失敗は `ActionResult` の `code` で機械判別する。

## lib/retention（純関数・I/O なし）

```typescript
/** trim + 小文字化。actions / repository / フォームで共用する同一性キー */
normalizeAccountUsername(value: string): string

interface RetentionPlan {
    kind: 'ok' | 'account_conflict';
    removeImportIds: string[];              // ok のとき、新規保存と同時に取り除く記録 id
    conflictingAccountUsername: string | null; // account_conflict のとき、保存済みの別アカウント ID
}

planRetention(
    existing: ImportSummary[],
    incomingAccountUsername: string,        // 正規化済み
    options: { maxRetained: number; replaceAll: boolean },
): RetentionPlan
```

- ルールと例は [data-model.md](../data-model.md) の「保持ルール」に従う
- `existing` の順序に依存しない（内部で `importedAt desc, id desc` に並べる）

## lib/parse-export（追加）

```typescript
/**
 * ファイル群から本人アカウント名だけを軽量に取り出す（自動入力用・FR-012）。
 * JSON: 名前に personal_information を含むファイルのみ読む。ZIP: 同名エントリのみ展開する。
 * 見つからない・構造不一致・展開失敗はすべて null（throw しない）
 */
peekOwnerUsername(files: Array<{ name: string; data: Uint8Array }>): string | null
```

- 既存 `parseExportFiles` / `ParsedExport.ownerUsername` は変更なし（取り込み実行時の FR-008 照合に使う）

## client/repository.ts

```typescript
readImports(): ImportSummary[]                       // importedAt desc, id desc（安定ソート）
readPreviousImport(current: ImportSummary): ImportSummary | null
// 同じアカウント ID（正規化一致）かつ current より前（同一日時は id で判定）の最新。無ければ null

interface NewImportRecord {
    summary: ImportSummary;
    followers: ParsedEntry[];
    following: ParsedEntry[];
    /** 新規保存と同時に取り除く記録 id（planRetention の結果）。既定 [] */
    removeImportIds?: string[];
}
saveImport(record: NewImportRecord): void
// writeAtomically([
//   ...removeImportIds × { follower, following } のエントリキー削除,
//   新規エントリ follower / following,
//   follower-imports = (既存 − removeImportIds − 同 id) + summary,
// ])。失敗時は StorageQuotaError / Error を throw し、保存前の状態に戻る
```

`readImport` / `readEntries` / `deleteImportRecord` / `deleteAllImportRecords` / `pruneOrphanEntries` は変更なし。

## client/actions.ts

```typescript
interface UploadImportInput {
    files: UploadFile[];
    accountUsername: string;   // 空なら保存済み記録のアカウント ID を引き継ぐ（無ければ入力必須エラー）
    confirmMismatch: boolean;  // FR-008: 入力値と本人名の相違を承知で続行
    replaceExisting: boolean;  // FR-007a: 既存の記録をすべて削除して取り込む（確認ダイアログ承諾後のみ true）
}

uploadImport(input: UploadImportInput): Promise<ActionResult<{ importId: string }>>
```

| ケース | 判定順 | 結果 |
|---|---|---|
| サイズ超過 / ファイル無し / 形式不正 | 1 | 既存どおり `too_large` / `invalid_export` |
| アカウント ID 空（保存済み記録も無し） / 30 文字超 | 2 | 既存どおり |
| 入力値 ≠ `ownerUsername`（本人名が取れた場合）かつ `confirmMismatch` false | 3 | `actionFailure(account_mismatch, 'account_mismatch')` → フォームが確認チェックを表示（FR-008） |
| `planRetention` が `account_conflict`（別アカウントの記録あり・`replaceExisting` false） | 4 | `actionFailure(account_conflict, 'account_conflict')` → フォームが「既存の記録をすべて削除して取り込む」を表示（FR-007） |
| 成功 | 5 | `importedAt` は保存済み最新より必ず後（`nextImportedAt`・同一ミリ秒でも順序を保証）→ `saveImport({ ..., removeImportIds })` → `{ success: true, importId }` |
| 保存失敗（容量超過 / 利用不可 / その他） | — | 既存どおり `storage_full` / `storage_unavailable` / 汎用失敗。保存領域は変化しない |

- 判定 3 と 4 の順序: 本人名の相違（入力ミス）を先に解消させてから、全削除の判断をさせる（誤入力のまま全削除する事故を防ぐ）
- 「前回の記録とアカウント名が異なる」は `account_mismatch` の条件から **外す**（003 FR-010 の置き換え）

`deleteImport` / `deleteAllImports` は変更なし。

## client/queries.ts

```typescript
listImports(): Promise<ImportSummary[]>                       // 変更なし（並びは repository に従う）
getImportDiff(importId: string): Promise<ImportDiff | null>   // previous の決定が readPreviousImport（同じアカウント ID）に従う
getImportDetail(importId: string): Promise<ImportDetail | null> // 変更なし

/** ダッシュボード用の比較要約。取り込みが無ければ null（FR-015〜017） */
getLatestComparisonSummary(): Promise<ComparisonSummary | null>
// current = readImports()[0]; previous = readPreviousImport(current);
// { gained, lost } = computeFollowerDiff(entries(current), entries(previous))  ※ previous 無しは 0 / 0
```

## hooks/useFollowerImports.ts

```typescript
followerImportKeys.latestComparison = () => ['follower-import', 'latest-comparison'] as const

useLatestComparison(): UseQueryResult<ComparisonSummary | null>
useUploadImport() / useDeleteImport() / useDeleteAllImports()  // 成功時は followerImportKeys.all を無効化（既存・比較要約も再取得される）
```

`index.ts` から `useLatestComparison` と `ComparisonSummary` 型を公開する（dashboard が利用）。

## コンポーネントの契約（props）

```typescript
// ImportUploadForm
interface ImportUploadFormProps {
    /** 保存済み記録（新しい順）。事前案内・既定値・上限判定に使う */
    storedImports: ImportSummary[];
}

// ReplaceAllAndImportButton（新規・推奨）
interface ReplaceAllAndImportButtonProps {
    storedCount: number;                  // 確認文言の件数
    conflictingAccountUsername: string;   // 確認文言の保存済みアカウント ID
    isPending: boolean;
    onConfirm: () => void;                // 親が uploadImport({ ..., replaceExisting: true }) を呼ぶ
}

// ImportSummaryWidget
interface ImportSummaryWidgetProps {
    latest: ImportSummary | null | undefined;       // 既存
    comparison: ComparisonSummary | null | undefined; // null = 取り込みなし、undefined = 取得失敗
    isLoading?: boolean;
}
```

## 定数・文言（constants.ts）

| 名前 | 内容 |
|---|---|
| `MAX_RETAINED_IMPORTS` | `2` |
| `accountConflictMessage(storedAccountUsername)` | 「このアプリで比較できるアカウントは 1 つです。保存済みの記録は別のアカウント（@x）のものです。取り込むには既存の記録をすべて削除する必要があります。」（関数・@x を差し込む） |
| `IMPORT_ERROR_MESSAGES.account_mismatch` | 「エクスポートに含まれる本人のアカウント名と入力したアカウント ID が異なります。入力ミスでなければ、チェックを入れて再実行してください。」（前回不一致の意味を外す） |
| `retentionNotice(oldestImportedAtLabel)` | 「保存できる記録は最新と前回の 2 件です。取り込むと最も古い記録（{日時}）が置き換わります。」（関数） |
| `accountSwitchNotice(storedAccountUsername)` | 「保存済みの記録は @x のものです。別のアカウントで取り込むには既存の記録の削除が必要です。」（関数） |
| `OWNER_AUTOFILL_NOTICE` | 「エクスポートからアカウント ID を自動入力しました。内容を確認してください。」 |
| `NO_PREVIOUS_NOTICE` | 「比較対象がまだありません。次回、同じアカウント ID でエクスポートを取り込むと、増えた相手・外した相手が表示されます。」 |

## ルート・導線（変更なし）

| パス | 内容 |
|---|---|
| `/` | ダッシュボード。インポートサマリに比較要約 + `/imports/[id]`（直近）への導線 |
| `/imports` | アップロード（自動入力・事前案内・拒否時の全削除して取り込む）+ 履歴（アカウント ID 列） |
| `/imports/[id]` | 差分（比較対象は同じアカウント ID の直前）+ 分析 + 一覧 |
