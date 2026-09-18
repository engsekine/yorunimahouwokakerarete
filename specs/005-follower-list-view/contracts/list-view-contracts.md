# Contract: 一覧表示のクエリ・UI 部品 — 005-follower-list-view

**Plan**: [../plan.md](../plan.md) | 実装先: `service-front/src/features/follower-import/`

新規の永続データは無い（003 の `follower_import_entries` を読むのみ）。参照カラムと公開クエリ・UI 契約を記載する。

## 参照する既存データ（003・follower_import_entries）

| カラム | 用途 |
|---|---|
| `import_id` | 対象取り込みの絞り込み |
| `kind`（'follower' \| 'following'） | 種別（タブ）の切り替え |
| `username` | 表示する ID・検索対象・昇順キー |
| `profile_url` | 外部プロフィールへのリンク |

RLS: 本人所有 + `status = 'completed'` の取り込みのエントリのみ select 可（003 で定義済み・本機能で変更なし）。

## Query（server/queries.ts）

```typescript
// 既存の private fetchEntries を公開名で切り出す。DiffEntry を流用（{ username, profileUrl }）
getImportEntries(importId: string, kind: 'follower' | 'following'): Promise<DiffEntry[]>
```

- 全件取得（1,000 件/ページで最後まで）・`username` 昇順（Assumptions の既定順）
- RLS により本人 + completed 以外は 0 件（他人の id は空配列）
- 既存 `getImportDiff` は内部で同ロジック（fetchEntries）を引き続き使用する（重複させない）

## Component（components/client/FollowerListView）

```typescript
interface FollowerListEntry {
    username: string;
    profileUrl: string;
}

interface FollowerListViewProps {
    followers: FollowerListEntry[];
    /** null = この取り込みにフォロー中一覧が含まれない（フォロワーのみ） */
    following: FollowerListEntry[] | null;
}
```

挙動:

- タブ（role=tablist / tab / tabpanel）で「フォロワー（N）」「フォロー中（M）」を切替。following=null のときフォロー中タブは「フォロー中一覧が含まれていません」の案内パネルにする（FR-005）
- 検索入力（FormField・label 関連付け）で現在タブの一覧を `username` 部分一致（大文字小文字非区別・デバウンス + useMemo）で絞り込む（FR-006）
- 現在の表示件数を `aria-live="polite"` で通知。絞り込み 0 件は「該当する ID がありません」（FR-006 / FR-009）
- 一覧は 004 `DataTable`（1 列: `@username` の外部リンク `rel="noopener noreferrer"`）。総数 0 件は emptyText「フォロワーがいません / フォロー中がありません」（FR-005）

## 配置（/imports/[id]）

| 追加 | 内容 |
|---|---|
| `getImportEntries(id, 'follower')` / `getImportEntries(id, 'following')` をページ（Server Component）で取得 | following が 0 件かつ `following_count === 0` の取り込みは `following=null` として渡す（未同梱と 0 件の区別） |
| `FollowerListView` を差分・分析の下に Card で配置 | 既存の差分/分析表示は不変 |
