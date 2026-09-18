# Research: フォロワー・フォロー中の ID 一覧表示 — 005-follower-list-view

**Date**: 2026-07-17 | **Plan**: [plan.md](./plan.md)

## Decision 1: データ源 — 003 の `follower_import_entries` を再利用（新規保存なし）

- **Decision**: 一覧の元データは 003 が保存済みの `follower_import_entries`（`import_id` / `kind` / `username` / `profile_url`）とする。002 の接続はフォロワー数（集計値）のみで個々の ID を持たないため対象外。DB スキーマ追加・マイグレーションは行わない。
- **Rationale**: 「ID を一覧」に必要な全データは 003 で既に永続化済み。読み取り専用の表示・検索に徹すればスコープが最小で済む（spec Assumptions）。
- **Alternatives considered**: 002 から一覧取得 → 公式 API がフォロワー一覧を提供しないため不可能。新テーブル追加 → 既存データで足りるため不要。

## Decision 2: 全件取得 — 既存 `fetchEntries` を `getImportEntries` として公開

- **Decision**: 003 の private ヘルパー `fetchEntries(supabase, importId, kind)`（1,000 件/ページで全件取得・username 昇順・RLS 本人 + completed）を、公開クエリ `getImportEntries(importId, kind)` として切り出す。差分クエリ（getImportDiff）は引き続き内部で同ロジックを使う（重複を作らない）。
- **Rationale**: 全件・順序・アクセス制御・ページングが既に実装済みで、SC-002（件数一致）/ SC-003（1 万件）/ SC-004（本人限定）を満たす。既存を公開するだけで新規ロジックが要らない。
- **Alternatives considered**: 新規に全件クエリを書く → 既存と重複し保守性が下がる。却下。

## Decision 3: 検索 — クライアント側の部分一致フィルタ（サーバー再取得しない）

- **Decision**: 検索は取得済みの全件配列に対してクライアント側で `username.includes(小文字化した検索語)` フィルタする。入力はデバウンス（~150ms）+ `useMemo` でフィルタ結果をメモ化する。
- **Rationale**: 1 取り込みの一覧は最大 1 万件程度でメモリに載る。クライアントフィルタなら入力ごとのサーバーラウンドトリップが無く体感即時（SC-003）。大文字小文字非区別は Instagram のユーザーネーム仕様と整合（spec Assumptions）。
- **Alternatives considered**: サーバー側 `ilike` 検索（入力ごとに再クエリ）→ ネットワーク往復で体感が落ち、実装も複雑。1 万件規模では不要。将来 10 万件級になればサーバー検索へ移行可能。

## Decision 4: 配置 — `/imports/[id]` にタブ付き一覧セクションを追加

- **Decision**: 独立ページを新設せず、既存の取り込み詳細 `/imports/[id]` に「一覧」セクションを追加する。フォロワー / フォロー中はタブ（role=tablist）で切り替える。既存の差分・分析表示は残す。
- **Rationale**: 一覧は「その取り込みの中身」を見る操作で、差分・分析と同じ取り込みコンテキストに属する。同一ページに集約すると導線が短い（SC-001: 2 アクション以内）。ナビ項目・ルート追加が不要。
- **Alternatives considered**: 独立ページ `/imports/[id]/list` → ルート・戻り導線が増えるだけで、同一データの別ビューに過ぎない。却下。

## Decision 5: 一覧 UI — 004 の `DataTable`（1 列: ID + プロフィールリンク）

- **Decision**: 一覧は 004 の共通 `DataTable` で表示する。列は「ユーザー ID」（`@username` の外部プロフィールリンク・`rel="noopener noreferrer"`）。0 件時は DataTable の `emptyText`、対象種別がそもそも取り込みに無い場合（フォロー中未同梱）は別文言の案内を出し分ける（FR-005）。
- **Rationale**: 004 で導入済みの一貫した表部品を使い見た目を揃える。プロフィール導線（FR-004）は 003 の差分表示と同じ形式。
- **Alternatives considered**: 独自リスト → 004 の DataTable と重複。却下。

## Decision 6: 件数・絞り込み結果の通知 — `aria-live` で件数を読み上げ

- **Decision**: 各タブに件数（総数）を表示し、検索絞り込み時は「N 件表示中」を `aria-live="polite"` 領域で更新する。該当 0 件は「該当する ID がありません」と明示する（FR-006 / FR-009）。
- **Rationale**: 大量一覧の絞り込みは視覚だけだと結果件数が伝わりにくい。支援技術にも結果を通知する（SC-005）。
- **Alternatives considered**: 件数を出さない → 絞り込みが効いたか分からない。却下。
