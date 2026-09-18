# Data Model: アカウント ID による前回比較と保存件数の上限 — 007-account-scoped-comparison

**Date**: 2026-09-18 | **Plan**: [plan.md](./plan.md)

保存キー・保存形式は 006 の Key Entities から **変更しない**（新キー無し・既存データはそのまま読める）。変わるのは「何件残すか」「何と比較するか」のルールと、導出型の追加。

## 保存キー（006 Key Entities・据え置き）

| localStorage キー（`yorunimahouwokakerarete:` 以降） | 内容 | 本仕様での扱い |
|---|---|---|
| `follower-imports` | `ImportSummary[]`（id / accountUsername / followersCount / followingCount / importedAt） | 保存時に **最大 2 件** に収める。原則としてすべて同じ `accountUsername`（正規化後）を持つ |
| `follower-import-entries:<importId>:<kind>` | 圧縮形式の一覧エントリ配列 | 記録の取り除き時に同じ `writeAtomically` 内で削除 |

## 型

### ImportSummary（既存・変更なし）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | UUID |
| `accountUsername` | `string` | 取り込み時に指定したアカウント ID（trim + 小文字化済み）。**比較対象の決定キー** |
| `followersCount` / `followingCount` | `number` | 件数（following 0 = 未同梱） |
| `importedAt` | `string` | ISO 8601。並び・比較対象の前後判定 |

### RetentionPlan（新規・`lib/retention` の戻り値）

| フィールド | 型 | 説明 |
|---|---|---|
| `kind` | `'ok' \| 'account_conflict'` | `account_conflict` = 指定アカウント ID と異なる記録が 1 件以上あり、`replaceAll` でない |
| `removeImportIds` | `string[]` | 新規保存と同時に取り除く記録 id（`ok` のときのみ。`replaceAll` なら既存全件） |
| `conflictingAccountUsername` | `string \| null` | 拒否時に案内へ出す保存済みアカウント ID |

### ComparisonSummary（新規・ダッシュボード用の導出型）

| フィールド | 型 | 説明 |
|---|---|---|
| `current` | `ImportSummary` | 直近の取り込み |
| `previous` | `ImportSummary \| null` | 同じアカウント ID の直前の記録。null = 比較対象なし |
| `followerDelta` | `number \| null` | `current.followersCount - previous.followersCount`。previous 無しは null |
| `gainedCount` | `number` | 新規フォロワー件数（`computeFollowerDiff().gained.length`） |
| `lostCount` | `number` | フォロー解除件数（`computeFollowerDiff().lost.length`） |

`ImportDiff` / `ImportDetail` / `DiffEntry` / `MutualAnalysis` は既存のまま。`ImportDiff.previous` の意味が「同じアカウント ID の直前」に変わる（型は不変）。

## 定数

| 定数 | 値 | 用途 |
|---|---|---|
| `MAX_RETAINED_IMPORTS` | `2` | 保持上限（最新 + 前回）。FR-004 |
| `MAX_ACCOUNT_USERNAME_LENGTH` | `30`（既存） | 入力上限 |

## 保持ルール（`planRetention` の仕様）

入力: `existing: ImportSummary[]`（保存済み全件）, `incomingAccountUsername: string`（正規化済み）, `options: { maxRetained: number; replaceAll: boolean }`

```
1. replaceAll が true → kind='ok', removeImportIds = existing 全件の id
2. existing に normalize(accountUsername) !== incoming の記録が 1 件以上 → kind='account_conflict',
   conflictingAccountUsername = その記録（最新）の accountUsername, removeImportIds = []
3. それ以外（全件同じアカウント or 0 件）:
   same = existing を importedAt 降順（同値は id で安定）に並べたもの
   keep = same の先頭 (maxRetained - 1) 件        // 新規 1 件 + 直近 (maxRetained-1) 件 = maxRetained
   removeImportIds = same の残り全件の id           // 旧データで 3 件以上あっても一括で収める（FR-011）
   kind='ok'
```

例（maxRetained = 2）:

| 保存済み | 取り込むアカウント | 結果 |
|---|---|---|
| なし | A | ok・remove [] |
| A1 | A | ok・remove [] → A1 + A2 の 2 件 |
| A1, A2 | A | ok・remove [A1] → A2 + A3 |
| A1, A2, A3, A4（旧データ） | A | ok・remove [A1, A2, A3] → A4 + A5 |
| A1（または A1, A2） | B | account_conflict（conflicting = a） |
| A1, B1（旧データ混在） | A | account_conflict（B1 が異なる） |
| A1, A2 | B, replaceAll | ok・remove [A1, A2] → B1 のみ |

## 比較対象の決定（`readPreviousImport`）

```
previous(current) = readImports()
  .filter(s => s.importedAt < current.importedAt
            || (s.importedAt === current.importedAt && s.id < current.id))   // 同一日時の安定順
  .filter(s => normalize(s.accountUsername) === normalize(current.accountUsername))
  .sort(importedAt desc, id desc)[0] ?? null
```

`readImports()` の並びも `importedAt desc, id desc` の安定ソートに揃える。

さらに保存時（`uploadImport`）は新しい記録の `importedAt` を **保存済み最新記録より必ず後（+1ms 以上）** にする（`nextImportedAt`）。同一ミリ秒の連続取り込みや端末時刻の巻き戻りでも「新しい方が最新」になることを保証し（spec Edge Case「同一日時の取り込み」）、上記の `id` 比較は旧データの同一日時に対する保険として働く。

## 状態遷移（保存領域）

```
（空）--A を取り込む--> [A1]
[A1] --A を取り込む--> [A2, A1]                     （A2 の比較対象 = A1）
[A2, A1] --A を取り込む--> [A3, A2]                 （A1 取り除き + A3 保存を 1 回の writeAtomically。失敗時は [A2, A1] のまま）
[A2, A1] --B を取り込む--> 拒否（account_conflict）  （変化なし）
[A2, A1] --B を「すべて削除して取り込む」--> [B1]      （A1, A2 取り除き + B1 保存を 1 回の writeAtomically。失敗時は [A2, A1] のまま）
[A2, A1] --A2 を履歴から削除--> [A1]                 （A1 の比較対象 = なし）
[A2, A1] --A1 を履歴から削除--> [A2]                 （A2 の比較対象 = なし。次に A を取り込むと A3 の比較対象 = A2）
[A2, A1] --両方削除--> （空）                        （B を通常取り込み可能）
```

## バリデーション・整合性ルール

| ルール | 実装箇所 |
|---|---|
| アカウント ID の正規化（trim + 小文字化）と同一性判定 | `lib/retention`（`normalizeAccountUsername`）を actions / repository / フォームで共用 |
| 別アカウント記録の存在チェック（FR-007） | `planRetention` → actions が `account_conflict` に変換 |
| 保持上限（FR-004 / FR-011） | `planRetention` → `saveImport` の `removeImportIds` |
| 原子性（FR-005 / FR-007a） | `saveImport` の単一 `writeAtomically`（削除 → 新規エントリ → サマリ配列） |
| 入力値と本人名の相違（FR-008） | actions（既存 `account_mismatch`・`confirmMismatch` で続行） |
| 既定値の優先順（FR-012） | フォーム（`peekOwnerUsername` → 保存済みアカウント ID → 空） |
| 比較要約と差分画面の件数一致（FR-017） | 双方が `computeFollowerDiff` を使う（`getLatestComparisonSummary` / `getImportDiff`） |
