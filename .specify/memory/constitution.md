# yorunimahouwokakerarete Constitution

Instagram フォロワー管理アプリ「yorunimahouwokakerarete」（Next.js 単体・ブラウザ保存）のプロジェクト原則。`/speckit-plan` の Constitution Check はこのファイルを基準に行う。

## Core Principles

### I. Spec-Driven Development（spec-kit が正）

すべての機能は `specs/NNN-feature-name/` 配下の spec.md → plan.md → tasks.md の順で仕様を確定してから実装する。実装と仕様がズレた場合は、実装を真実として仕様書側を更新する。003〜005 はドメイン機能の仕様、006 は認証なし・ブラウザ保存としての横断的な構成ルールであり、両者が競合する場合は 006 に従う。001（ユーザー認証）・002（Instagram 連携）は本アプリでは提供しない。

### II. Client Data on Browser Storage

Next.js App Router を使用し、ページ（`page.tsx` / `layout.tsx`）は metadata と枠だけを担う Server Component に留める。利用者のデータはサーバーに置かず、ブラウザの localStorage に保存する。データの取得・更新は `'use client'` コンポーネント + TanStack Query（`features/<name>/client/` + `hooks/`）で行い、読み込み中 / 取得失敗 / データありの 3 状態を必ず出し分ける。ページは `generatePageMetadata`（`@/shared/config/metadata`）で metadata をエクスポートする。

### III. Test-First（テスト同梱）

実装コードの変更前にテストを書く。`src/shared/components/**` / `src/features/*/components/**` のコンポーネントは Vitest 単体テスト・Storybook story・Playwright a11y テストを必ず同梱する（`/generate-with-tests` で生成）。バグ修正には回帰テストを追加する。ブラウザ保存を扱う `client/` の単体テストは jsdom の localStorage を実ストレージとして使い、モックに依存しない。

### IV. Security & Local-only Data by Default

利用者のデータ（取り込んだ一覧）は端末外へ送信しない。保存操作は `@/shared/lib/storage` に集約し、複数キーの書き込みは原子的（全件成功 or 全件取り消し）にする。容量超過等の異常系は生のエラーを表示せず日本語の案内へ変換する。セキュリティヘッダー（CSP 等）は `next.config.ts` で維持し、外部への接続先は増やさない。

### V. Accessibility（WCAG 2.1 AA）

セマンティック HTML を基本とし、キーボード操作・スクリーンリーダー対応・カラーコントラスト 4.5:1 以上を満たす。フォームは label 関連付け・エラーの `role="alert"`・`aria-invalid` を徹底し、読み込み中・件数変化は `role="status"` / `aria-live` で伝える。詳細は `.claude/rules/accessibility.md` に従う。

### VI. Coding Standards（rules/ 準拠）

コーディング規約は `.claude/rules/` を正とする: TypeScript strict mode・`any` 禁止（`typescript.md`）、Feature-based アーキテクチャとコンポーネントフォルダ構成（`react.md` + `.claude/CLAUDE.md` + `arch/feature-based.md`）、Tailwind CSS utility-first（`css.md`）、命名は `readable-code.md` に従う。

## Technology Stack

- フロントエンド: Next.js（App Router）/ TypeScript / Tailwind CSS / React Compiler
- データ保存: ブラウザの localStorage（`@/shared/lib/storage` ラッパー）+ TanStack Query
- UI: shadcn/ui（Base UI・`src/components/ui` に生成し `src/shared/components/ui` のラッパー経由で使う）
- フォーム: React Hook Form + yup
- テスト: Vitest / Storybook / Playwright（axe-core）
- デプロイ: Vercel（サーバー側の DB・秘密情報なし）
- アーキテクチャ: Feature-based（`arch/feature-based.md` 参照）

## Development Workflow

1. `/speckit-specify` で spec.md を作成し要件を合意する
2. `/speckit-plan` で plan.md（+ 保存キー設計等）を作成し設計を確定する
3. `/speckit-tasks` で tasks.md にタスク分解する
4. `/speckit-implement` または手動で実装する（テストファースト）
5. コミット前に `/review` と仕様書同期確認を行う

コミットメッセージは Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`）に従う。

## Governance

- この constitution はその他のプラクティスに優先する。改定は本ファイルの変更 + バージョン更新で行う
- すべての plan.md は Constitution Check で本原則への準拠を確認する。違反が必要な場合は Complexity Tracking に理由を記録する
- 機能番号（001, 002, ...）は欠番にせず再採番しない

**Version**: 2.0.0 | **Ratified**: 2026-06-10 | **Last Amended**: 2026-09-17
