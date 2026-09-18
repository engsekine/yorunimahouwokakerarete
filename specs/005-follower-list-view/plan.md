# Implementation Plan: フォロワー・フォロー中の ID 一覧表示

**Branch**: `005-follower-list-view` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-follower-list-view/spec.md`

## Summary

003 で取り込んだ `follower_import_entries` を使い、取り込み単位でフォロワー / フォロー中のユーザー ID を**全件一覧表示**（差分ではなく全メンバー）し、種別切り替えと ID 部分一致の絞り込み検索を提供する。読み取り専用で DB 変更なし。取り込み詳細ページ（`/imports/[id]`）に「一覧」を追加する。

技術アプローチ: 003 の内部ヘルパー `fetchEntries`（全件・username 昇順・RLS 本人限定）を公開クエリ `getImportEntries` として切り出し、Server Component で全件取得 → client の一覧コンポーネント（`FollowerListView`）でタブ切替 + 検索（クライアント側フィルタ）を行う。1 万件でも実用的にするため検索は入力のデバウンス + メモ化で処理する。

## Technical Context

**Language/Version**: TypeScript 5.x（strict）/ Node.js 24

**Primary Dependencies**: Next.js（App Router / Server Components + client 島）/ 004 の共通部品（PageHeader / Card / DataTable / FormField）/ 003 の queries

**Storage**: なし（既存 `follower_import_entries` を参照するのみ・マイグレーション/新テーブルなし）

**Testing**: Vitest（getImportEntries クエリ・FollowerListView のタブ/検索/空状態）/ Storybook / Playwright + axe-core

**Target Platform**: Web（service-front）。`/imports/[id]` の拡張

**Project Type**: 既存 feature `follower-import` への読み取り機能・UI 追加

**Performance Goals**: 1 万件の一覧表示・検索反映が体感 1 秒以内（SC-003）。全件は既存 `fetchEntries` のページング（1,000 件/回）で取得

**Constraints**: 本人のみ閲覧（RLS・SC-004）。WCAG 2.1 AA（SC-005）。件数・絞り込み結果を支援技術へ通知（FR-009）

**Scale/Scope**: 新規クエリ 1（getImportEntries）+ client コンポーネント 1（FollowerListView）+ `/imports/[id]` への組み込み。マイグレーションなし

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. Spec-Driven Development | ✅ Pass | spec.md 承認済み（checklist 16/16） |
| II. Server Components First | ✅ Pass | データ取得は Server Component（`/imports/[id]`）。client は検索・タブの状態を持つ `FollowerListView` のみ |
| III. Test-First | ✅ Pass | getImportEntries・FollowerListView（タブ/検索/空/データなし）を Vitest 先行。新規コンポーネントは `/generate-with-tests` |
| IV. Security & RLS by Default | ✅ Pass（該当範囲なし） | DB 変更なし。既存 RLS（本人 + completed のみ select）でアクセス制御（FR-008 / SC-004） |
| V. Accessibility | ✅ Pass | タブは role=tab/tablist・検索は label 関連付け・件数変化は `aria-live`・空/該当なしを明示。axe でスキャン |
| VI. Coding Standards | ✅ Pass | フォルダ構成規約・004 の DataTable / FormField 流用・Tailwind utility-first |

**Post-Design Re-check（Phase 1 完了後）**: ✅ Pass — 違反なし → Complexity Tracking 記載事項なし。

## Project Structure

### Documentation (this feature)

```text
specs/005-follower-list-view/
├── spec.md / plan.md / research.md / quickstart.md
├── contracts/list-view-contracts.md   # getImportEntries クエリ・FollowerListView Props 契約
├── screens/follower-list.md           # /imports/[id] の一覧セクション画面仕様
└── checklists/requirements.md
```

（data-model.md は作成しない: 既存 `follower_import_entries` を読むだけで新規エンティティが無いため。参照カラムは contracts に記載）

### Source Code (repository root)

```text
service-front/src/
├── app/(authenticated)/imports/[id]/page.tsx   # 既存: 差分/分析に加えて FollowerListView を組み込み
├── features/follower-import/
│   ├── server/queries.ts                        # 既存 fetchEntries を getImportEntries として公開（種別ごと全件取得）
│   └── components/client/FollowerListView/       # 新規: タブ（フォロワー/フォロー中）+ 検索 + 件数 + 一覧
│       ├── FollowerListView.tsx / .test.tsx / .stories.tsx / index.ts
│   └── index.ts                                  # FollowerListView を re-export
```

**Structure Decision**: 003 の `follower-import` feature に閉じる。既存 `fetchEntries`（private）を `getImportEntries(importId, kind)` として公開し、重複ロジックを避ける。一覧の表示は 004 の共通 `DataTable`、検索入力は既存 `FormField` を流用し、`FollowerListView`（client）が「フォロワー/フォロー中タブ + 検索 + 件数」を担う。ページ（`/imports/[id]`）は Server Component で両種別を取得して props 注入する（既存の差分・分析表示はそのまま残す）。

## Complexity Tracking

Constitution Check 違反なしのため記載事項なし。
