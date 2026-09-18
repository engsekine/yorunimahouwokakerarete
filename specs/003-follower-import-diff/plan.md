# Implementation Plan: フォロワーリストのインポートと差分表示（個人アカウント対応）

**Branch**: `003-follower-import-diff` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-follower-import-diff/spec.md`

## Summary

Instagram データエクスポート（ZIP / 分割 JSON）をアップロードし、フォロワー・フォロー中一覧をスナップショットとして保存、隣接する取り込み間の差分（新規フォロワー / フォロー解除した相手）と非相互フォロー分析を表示する。002 の Instagram 接続とは独立して、個人アカウントのユーザーでも利用できる。

技術アプローチ: 解析ロジック（ZIP 展開・JSON パース・統合）を**純関数の lib に隔離**して単体テストを厚くし、アップロードは Server Action（FormData）で受ける。エントリの保存は service role で一括投入し、`status` 列 + 失敗時クリーンアップで原子性を担保。差分・分析は保存せず SQL の集合差で都度導出する。

## Technical Context

**Language/Version**: TypeScript 5.x（strict）/ Node.js 24

**Primary Dependencies**: Next.js（Server Actions / FormData アップロード）/ Supabase / **fflate**（ZIP 展開・新規依存・軽量 zero-dep）

**Storage**: Supabase PostgreSQL。新テーブル 2 つ（`follower_imports` / `follower_import_entries`）

**Testing**: Vitest（パーサ純関数・actions・queries・コンポーネント）/ Storybook / Playwright + axe-core（実エクスポート形式のフィクスチャで E2E）

**Target Platform**: Web（service-front）。新ページ `/imports`・`/imports/[id]`

**Project Type**: 既存モノレポの service-front に feature `follower-import` を追加

**Performance Goals**: 1 万件規模の取り込み → 差分表示まで 10 秒以内（SC-003）。エントリ INSERT はバッチ分割（1,000 件/回）

**Constraints**: サーバーへの送信上限 10MB（アプリ側 `MAX_UPLOAD_BYTES` で検証。Server Actions の bodySizeLimit と proxy の proxyClientMaxBodySize は multipart のオーバーヘッド分の余裕を持たせて 12mb。proxy の上限を超過した分は警告のみで切り捨てられ「Unexpected end of form」になるため、アプリ側検証が先に効く値にする）。ZIP はブラウザ上で必要ファイルのみ抽出してから送信するため（`extractZipTargets`）、ZIP 自体のサイズは上限の対象外。取り込みは原子的（FR-009）。第三者の公開情報を含むため本人限定アクセス（FR-011）

**Scale/Scope**: ページ 2 + feature 1（パーサ lib + Server Actions 2 + queries 3 + コンポーネント 5 前後）+ マイグレーション 1 本

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. Spec-Driven Development | ✅ Pass | spec.md 承認済み（checklist 16/16） |
| II. Server Components First | ✅ Pass | 履歴・差分・分析ページは Server Component で取得。client はアップロードフォームと削除ボタンのみ |
| III. Test-First | ✅ Pass | パーサ純関数・差分クエリ・actions は契約テスト先行。新規コンポーネントは `/generate-with-tests` |
| IV. Security & RLS by Default | ✅ Pass | 新テーブル RLS 有効・`(select auth.uid())` で本人限定 select。書き込みは service role 経由。GRANT はテーブルごとに明示（002 で確立した運用） |
| V. Accessibility | ✅ Pass | ファイル入力の label 関連付け・処理状態の `aria-live`・削除は共有 ConfirmDialog。E2E で axe |
| VI. Coding Standards | ✅ Pass | rules/ 準拠（フォルダ構成・snake_case・timestamptz） |

**Post-Design Re-check（Phase 1 完了後）**: ✅ Pass — 違反なし → Complexity Tracking 記載事項なし。

## Project Structure

### Documentation (this feature)

```text
specs/003-follower-import-diff/
├── spec.md / plan.md / research.md / data-model.md / quickstart.md
├── contracts/import-actions.md   # Server Actions / Queries / パーサ契約
├── screens/imports.md            # /imports・/imports/[id] 画面仕様
├── checklists/requirements.md
└── tasks.md                      # /speckit-tasks で生成
```

### Source Code (repository root)

```text
service-front/src/
├── app/(authenticated)/imports/
│   ├── page.tsx                       # アップロード + 取り込み履歴
│   └── [id]/page.tsx                  # 差分表示 + フォロー関係分析
├── features/follower-import/
│   ├── components/
│   │   ├── server/ImportHistoryList/  # 履歴一覧（件数・日時・リンク）
│   │   ├── server/ImportDiffView/     # 差分（新規/解除）+ 分析 + 注記
│   │   └── client/
│   │       ├── ImportUploadForm/      # ファイル選択 + アカウント名 + 進行状態（aria-live）
│   │       └── DeleteImportButton/    # ConfirmDialog + deleteImport action
│   ├── lib/parse-export/              # 純関数: ZIP 展開（fflate）・followers/following JSON パース・統合
│   │   ├── parse-export.ts / parse-export.test.ts / index.ts
│   ├── server/
│   │   ├── actions.ts                 # uploadImport（FormData）/ deleteImport
│   │   └── queries.ts                 # listImports / getImportDiff / getMutualAnalysis
│   ├── constants.ts                   # 上限 10MB・エラーメッセージ・kind 種別
│   └── index.ts
├── proxy.ts                           # APP_ROUTE_PREFIXES に '/imports' を追加
next.config.ts                         # serverActions.bodySizeLimit / proxyClientMaxBodySize を 12mb に（アプリ検証は 10MB）
supabase/migrations/20260717100000_create_follower_import_tables.sql
```

**Structure Decision**: 001/002 で確立した Feature-based 構成に従い feature `follower-import` に閉じる。ZIP/JSON 解析は `lib/parse-export`（純関数・I/O なし）に隔離し、フィクスチャベースの単体テストで SC-002（差分判定 100%）の土台を作る。002 の instagram feature には依存しない（ホームからの導線リンクのみ app 層で追加）。

## Complexity Tracking

Constitution Check 違反なしのため記載事項なし。
