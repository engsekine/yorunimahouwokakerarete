# Implementation Plan: アカウント ID による前回比較と保存件数の上限

**Branch**: `007-account-scoped-comparison`（作業ブランチ未作成・現在 `main`） | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-account-scoped-comparison/spec.md`

## Summary

003 の「直前の取り込みと比較・履歴は無制限」を、「取り込み時に指定したアカウント ID が同じ前回記録と比較・ブラウザ全体で最大 2 件（最新 + 前回）だけ保持・比較できるアカウントは 1 つ」に置き換える。別アカウントの記録が残っている状態では取り込みを拒否し、その場で「既存の記録をすべて削除して取り込む」（確認付き・原子的）を提供する。アカウント ID はエクスポート内の本人名（`personal_information.json`）を既定値として自動入力し、利用者が確認・修正する。ダッシュボードには直近取り込みの比較要約（前回比・新規・解除の件数）を表示する。

技術アプローチ: 保持ルール（どの記録を取り除くか）と比較対象の決定を **純関数の lib（`lib/retention`）に隔離** して単体テストを先行させ、取り除き + 新規保存は既存の `writeAtomically` に 1 回で渡して原子性を保つ。アカウント ID の自動入力は、既存パーサに **本人名だけを軽量に取り出す関数** を追加し、ファイル選択時に呼ぶ（全件解析は取り込み実行時のまま）。ダッシュボード用に **件数だけを返す軽量クエリ** を追加し、詳細画面の全件読み出しと分離する。新しい保存キーは追加しない（006 Key Entities は据え置き）。

## Technical Context

**Language/Version**: TypeScript 5.7（strict）/ Node.js 22+

**Primary Dependencies**: Next.js 16（App Router・Client Components）/ React 19 / TanStack Query 5 / fflate（既存・ZIP 展開）/ shadcn（Dialog・Button・Input ラッパー経由）

**Storage**: ブラウザ localStorage（`@/shared/lib/storage` ラッパー・`writeAtomically`）。既存キー `follower-imports` / `follower-import-entries:<importId>:<kind>` のみ使用。新キー無し

**Testing**: Vitest（lib 純関数・repository / actions / queries は jsdom の localStorage を実ストレージとして使用）/ Storybook（story）/ Playwright + axe-core（e2e・a11y）

**Target Platform**: Web（Vercel・サーバー側に DB・秘密情報なし）

**Project Type**: 既存 Next.js 単体アプリの feature `follower-import` の変更 + `dashboard` の合成ウィジェット変更

**Performance Goals**: 1 万件規模でも取り込み → 差分表示 10 秒以内を維持（003 SC-003 / 006 SC-003）。ダッシュボードの比較要約は一覧 2 本（最新・前回）の集合差 1 回で求める（1 万件で数十 ms）。ファイル選択時の本人名抽出は ZIP 内の `personal_information` エントリだけを展開し、フォロワー一覧は展開しない

**Constraints**: 原子性（取り除き + 保存を 1 回の `writeAtomically`・FR-005 / FR-007a）。localStorage 上限（5MB 前後）に対し保持 2 件で恒常的に収める。データは端末外へ送らない。日本語文言・生エラー非表示。WCAG 2.1 AA（案内は `role="status"`・拒否は `role="alert"`・確認は共通 ConfirmDialog）

**Scale/Scope**: 変更ファイル: lib 2（retention 新規・parse-export 追加関数）/ repository・actions・queries・hooks / コンポーネント 5（ImportUploadForm・ImportHistoryList・ImportDiffView・ImportSummaryWidget・DashboardWidgets）+ 新規 1（ReplaceAllAndImportButton 相当を ImportUploadForm 内に置くか分離するかは tasks で確定・本 plan は分離を推奨）/ constants・types / テスト・story・e2e 更新 / 003 仕様書の同期

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. Spec-Driven Development | ✅ Pass | spec.md 承認済み（checklist 16/16・Clarifications 5 件解決）。003 と競合する箇所は spec「位置づけ」で本仕様優先と明記。実装後に 003 の spec / screens を `/sync-spec` で追従させる |
| II. Client Data on Browser Storage | ✅ Pass | 変更はすべて `features/follower-import/{lib,client,hooks,components/client}` と `features/dashboard/components/client`。page.tsx は変更なし。Server Actions / Route Handler は追加しない。3 状態（読み込み中 / 失敗 / データあり）はダッシュボードの比較要約にも適用 |
| III. Test-First | ✅ Pass | `lib/retention` は純関数で先にテスト。actions / repository のテストは jsdom localStorage 実ストレージ（モック無し）。既存テスト（`account_mismatch` の前回不一致ケース）は仕様変更に合わせて書き換え。新規コンポーネントは `/generate-with-tests` |
| IV. Security & Local-only Data by Default | ✅ Pass | 取り除き + 保存は 1 回の `writeAtomically`。全削除 + 保存も同じ経路。外部接続の追加なし。容量超過・利用不可は既存の `toStorageFailure` で日本語化 |
| V. Accessibility | ✅ Pass | 置き換え案内・別アカウント事前案内・自動入力の通知は `role="status"` / `aria-live="polite"`、拒否は `role="alert"`、全削除確認は ConfirmDialog（フォーカストラップ・Esc）。履歴のアカウント ID 列は DataTable のヘッダ付き列。e2e で axe |
| VI. Coding Standards | ✅ Pass | フォルダ構成（lib は専用フォルダ + index.ts）、`any` 禁止、Tailwind utility-first、命名（`isXxx` / `handleXxx` / `MAX_RETAINED_IMPORTS`） |

**Post-Design Re-check（Phase 1 完了後）**: ✅ Pass — 違反なし → Complexity Tracking 記載事項なし。

## Project Structure

### Documentation (this feature)

```text
specs/007-account-scoped-comparison/
├── spec.md                     # 要件（Clarifications 5 件反映済み）
├── plan.md                     # This file
├── research.md                 # Phase 0: 設計判断（Decision 1〜8）
├── data-model.md               # Phase 1: 保存キー・型・保持ルール・状態遷移
├── contracts/client-api.md     # Phase 1: lib / repository / actions / queries / hooks の契約
├── screens/imports-and-dashboard.md  # Phase 1: /imports・/imports/[id]・/ の画面差分
├── quickstart.md               # Phase 1: 検証手順
├── checklists/requirements.md
└── tasks.md                    # Phase 2: /speckit-tasks で生成（本コマンドでは作らない）
```

### Source Code (repository root)

```text
src/
├── app/(app)/
│   ├── page.tsx                          # 変更なし（ダッシュボード枠）
│   └── imports/{page.tsx,[id]/page.tsx}  # 変更なし
├── features/follower-import/
│   ├── constants.ts                      # MAX_RETAINED_IMPORTS・新メッセージ・案内文
│   ├── types.ts                          # ComparisonSummary 追加
│   ├── lib/
│   │   ├── retention/                    # 新規: planRetention（純関数）+ test + index
│   │   ├── parse-export/                 # peekOwnerUsername 追加（personal_information のみ展開）
│   │   └── diff/                         # 変更なし（computeFollowerDiff を再利用）
│   ├── client/
│   │   ├── repository.ts                 # readPreviousImport をアカウント ID で絞る・saveImport に removeImportIds
│   │   ├── actions.ts                    # uploadImport: account_conflict / replaceExisting / 保持ルール適用
│   │   └── queries.ts                    # getLatestComparisonSummary 追加
│   ├── hooks/useFollowerImports.ts       # useLatestComparison 追加・keys.latestComparison
│   ├── index.ts                          # useLatestComparison / ComparisonSummary を公開（dashboard 向け）
│   └── components/client/
│       ├── ImportUploadForm/             # 自動入力・事前案内・拒否時の全削除して取り込む導線
│       ├── ReplaceAllAndImportButton/    # 新規（推奨）: 確認ダイアログ付きの全削除 + 取り込み
│       ├── ImportHistoryList/            # アカウント ID 列
│       ├── ImportsPageContent/           # フォームへ保存状況（件数・アカウント ID・最古の日時）を渡す
│       └── ImportDiffView/               # 「同じアカウント ID で」の文言
└── features/dashboard/components/client/
    ├── DashboardWidgets/                 # useLatestComparison を合成
    └── ImportSummaryWidget/              # 比較要約（前回比・新規・解除）+ 詳細導線

tests/
├── follower-import-flow.spec.ts          # 3 回目取り込みの置き換え・別アカウント拒否 → 全削除して取り込む
├── dashboard-comparison.spec.ts          # 新規: ダッシュボードの比較要約
└── helpers/browser-storage.ts            # 変更なし
```

**Structure Decision**: Feature-based + shared/ を維持。保持ルールと比較対象決定は `features/follower-import/lib/retention/`（純関数）に置き、保存経路は既存の `client/repository.ts`（`writeAtomically`）に集約する。dashboard は合成 feature として `@/features/follower-import` の公開 API（index.ts）からフックを取り込む（`arch/feature-based.md` の dashboard 例外）。新しいルート・保存キー・外部依存は追加しない。

## Complexity Tracking

> Constitution Check に違反なしのため記載事項なし。
