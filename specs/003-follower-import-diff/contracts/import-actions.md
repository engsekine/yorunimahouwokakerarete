# Contract: インポート Server Actions / Queries / パーサ — 003-follower-import-diff

**Plan**: [../plan.md](../plan.md) | 実装先: `service-front/src/features/follower-import/`

## パーサ（lib/parse-export・純関数・I/O なし)

```typescript
interface ParsedEntry {
    kind: 'follower' | 'following';
    username: string;      // 小文字化・trim 済み
    profileUrl: string;
    followedAt: string | null; // ISO 8601
}

interface ParsedExport {
    followers: ParsedEntry[];   // followers_*.json 全ファイル統合・重複排除済み
    following: ParsedEntry[];   // following.json（無ければ []）
    /** personal_information.json があれば本人 username（ベストエフォート照合用） */
    ownerUsername: string | null;
}

/** ZIP バイト列 or JSON ファイル群から抽出する。対象ファイルが 1 つも無ければ ParseExportError('no_target_files') */
parseExportFiles(files: Array<{ name: string; data: Uint8Array }>): ParsedExport
```

- エラーは `ParseExportError`（code: `no_target_files` | `invalid_format` | `zip_corrupted`）を throw
- 構造が想定と異なる JSON は無視し、有効ファイルが 0 のとき `no_target_files`

## Server Actions（server/actions.ts）

```typescript
uploadImport(formData: FormData): Promise<ActionResult<{ importId: string }>>
// formData: files（1..N）・accountUsername（初回のみ必須）・confirmMismatch（'true' で警告override）
```

| ケース | 結果 |
|---|---|
| 成功 | import 行（processing）→ エントリをバッチ INSERT（1,000 件/回・service role）→ completed → `{ success: true, importId }` + revalidatePath('/imports') |
| 上限超過（10MB）/ 対象外ファイル | `actionFailure(<上限・形式の日本語案内>)` |
| 対象ファイル欠落・形式不正 | `actionFailure(<JSON 形式での再エクスポート手順を含む案内>, 'invalid_export')` |
| アカウント名不一致（前回申告値 or ownerUsername と相違）で confirmMismatch なし | `actionFailure(<別アカウントの可能性の警告>, 'account_mismatch')` → フォームが確認チェックを表示 |
| 途中失敗 | import 行削除（cascade）後に汎用失敗を返す（FR-009） |

```typescript
deleteImport(importId: string): Promise<ActionResult>
// 本人所有の確認（service role で user_id 照合）→ 行削除（entries cascade）。他人の id は失敗
```

## Queries（server/queries.ts・本人セッション + RLS）

```typescript
listImports(): Promise<ImportSummary[]>            // imported_at desc（id/accountUsername/counts/importedAt）
getImportDiff(importId: string): Promise<ImportDiff | null>
// ImportDiff: { current: ImportSummary; previous: ImportSummary | null;
//   gained: DiffEntry[]; lost: DiffEntry[] }   // previous=null は「比較対象なし」表示
getMutualAnalysis(importId: string): Promise<MutualAnalysis | null>
// { notFollowingBack: DiffEntry[]; notFollowedBack: DiffEntry[] } | following 未同梱なら null
```

- DiffEntry: `{ username, profileUrl }`。差分は SQL 集合差で都度導出（research Decision 5）
- previous は同一ユーザーの `imported_at` が直前の completed 取り込み

## ルート・導線

| パス | 認証 | 内容 |
|---|---|---|
| `/imports` | 必須（proxy に prefix 追加） | アップロードフォーム + 取り込み履歴 |
| `/imports/[id]` | 必須 | 差分表示 + フォロー関係分析（本人以外の id は 404 相当） |
| `/home` | — | インポート機能への導線リンクを追加（002 カードとは独立） |
