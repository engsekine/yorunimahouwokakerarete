# Feature-based アーキテクチャ

yorunimahouwokakerarete は機能（feature）単位でコードを分割する Feature-based アーキテクチャを採用する。本ドキュメントは実装規約の正であり、新規コード作成時は必ずこの構造に従う。

> 本アプリはサーバー側に DB・認証を持たず、データはすべて利用者のブラウザ（localStorage）に保存する。そのためデータ層は `client/`（ブラウザ保存を読み書きする関数）に置き、データ取得は Client Components + TanStack Query で行う（Server Actions / Server Components によるデータ取得は使わない）。

## ディレクトリ構成

```
src/
├── app/            # Next.js App Router（ルーティング・レイアウト・metadata のみ）
├── components/ui/  # shadcn 生成物（無改変・直接 import しない）
├── features/       # 機能単位のモジュール
├── shared/         # 複数 feature で共有する横断コード
└── lib/            # 汎用ユーティリティ（cn 等、ドメイン非依存）
```

### app/ — ルーティング層

- ルートグループ `(app)` が管理画面シェル（AdminShell）配下のページを表す。トップ `/` もこの配下のホーム（ダッシュボード）で、`(app)/page.tsx` に置く。シェルの外側にあるのは `not-found.tsx` / `error.tsx` のみ
- `page.tsx` は **metadata と枠（PageHeader 等）だけ**を担う Server Component に留め、データの取得・変換は feature の Client Component に委ねる（`page.tsx` から `localStorage` に触れない）
- `metadata` は `generatePageMetadata`（`@/shared/config/metadata`）で必ずエクスポートする
- Route Handler / Server Action は作らない（サーバー側にアプリの状態を持たない）

### features/<name>/ — 機能モジュール

```
features/<name>/
├── index.ts        # 公開 API（バレル）。外部はここからのみ import する
├── components/
│   └── client/     # 'use client' コンポーネント（1 コンポーネント 1 フォルダ）
├── hooks/          # TanStack Query の hooks（use プレフィックス）とクエリキー
├── client/         # ブラウザ保存の読み書き
│   ├── repository.ts   # localStorage のキー設計・低レベル読み書き（@/shared/lib/storage を使う）
│   ├── queries.ts      # 読み取り API（TanStack Query の queryFn として使う）
│   └── actions.ts      # 更新 API（ActionResult を返す）
├── lib/            # feature 内の純関数（パーサ・差分計算・符号化等）
├── schemas/        # yup スキーマ（*.schema.ts）
├── constants.ts
└── types.ts
```

- `client/` の関数は Client Components / hooks からのみ呼ぶ（Server Component から import すると `window` 参照で失敗する）
- 保存操作はすべて `@/shared/lib/storage` 経由で行い、`localStorage` を直接触らない（プレフィックス・容量超過の変換・原子的書き込みを集約するため）

### shared/ — 横断コード

| パス | 内容 |
|---|---|
| `shared/components/layout/` | AdminShell / AdminSidebar / AdminTopBar / PageHeader / Header / Footer / PublicShell |
| `shared/components/form/` | FormField / FormSelect / FormTextarea / FormRadioGroup 等（フォーム UI の共通部品） |
| `shared/components/surface/` | Card / Notice |
| `shared/components/feedback/` | ConfirmDialog / LoadingStatus |
| `shared/components/ui/` | shadcn（`src/components/ui`）のラッパー。アプリはここ経由で使う |
| `shared/lib/storage/` | localStorage ラッパー（プレフィックス・JSON・容量超過・原子的書き込み） |
| `shared/lib/react-query/` | QueryClient の生成 |
| `shared/lib/test-utils/` | QueryClientProvider 付きの render ヘルパー |
| `shared/schemas/` | yup の共有フィールド定義・transform・パターン |
| `shared/types/` | `ActionResult` 等の共有型 |
| `shared/config/` | metadata / nav 等の設定 |
| `shared/constants/` | 複数 feature で使う定数 |

## 依存ルール

1. **feature 間の直接 import 禁止**。共有したいコードは `shared/` に昇格させる
2. 外部（app/ 等）からは **feature の `index.ts` 経由でのみ** import する（`@/features/follower-import` ○ / `@/features/follower-import/client/actions` を外部から直接 import ×）
3. feature → shared への依存は自由。shared → feature への依存は禁止
4. コンポーネント内部の sibling 参照は親ディレクトリ経由（`../Bar` で隣のフォルダの index.ts を解決）
5. **dashboard の例外**: `features/dashboard` は他 feature の要約を並べる合成 feature のため、`@/features/follower-import` 等の公開 API（index.ts）から hooks・型を import してよい。逆方向（他 feature → dashboard）は禁止

## コンポーネント規約

- 1 コンポーネント 1 フォルダ: `<Name>/<Name>.tsx` + `<Name>.test.tsx` + `<Name>.stories.tsx` + `index.ts`（詳細は `.claude/rules/folder-structure.md`）
- データを読むコンポーネントは `'use client'` + hooks で取得し、**読み込み中（LoadingStatus）/ 取得失敗（Notice error）/ データあり** の 3 状態を必ず出し分ける（SSR 時は読み込み中を描画し、ハイドレーション不一致を起こさない）
- フォームの入力フィールドは `@/shared/components/form` の共通コンポーネントを使う（label + Input + エラー表示を手書きしない）
- react-hook-form の `register` / `control` オブジェクトを Props として子に渡さない（`register()` の戻り値 spread は可）

## データ層規約

- **actions.ts**（mutation）: 戻り値は `ActionResult<T>`（`@/shared/types/action-result`）で統一。保存系の例外（`StorageQuotaError` / `StorageUnavailableError`）は日本語の案内へ変換し、生のエラーを返さない
- **queries.ts**（読み取り）: 「データなし」（404 セマンティクス）は null を返す。非同期関数にして TanStack Query の queryFn として扱う
- **hooks/**: クエリキーは `xxxKeys` オブジェクトで一元管理し、mutation 成功後は `invalidateQueries` で関連クエリを再取得する
- **repository.ts**: 複数キーにまたがる書き込みは `writeAtomically` で「全件成功 or 全件取り消し」にする。読み出しは形の検証を行い、破損データは無視する（例外にしない）
- 一覧のような大きな配列は容量を節約する符号化（`lib/entry-codec` 等）で保存し、読み出し時に復元する

## テスト規約

- `client/*.test.ts` は jsdom の localStorage を **実ストレージとして**使い、モックではなく実際の保存・読み出しで検証する（`vitest.setup.ts` がテストごとに clear する）
- hooks を使うコンポーネントのテストは `renderWithQueryClient`（`@/shared/lib/test-utils`）で描画し、`client/queries` / `client/actions` を `vi.mock` する
- e2e（Playwright）はデータ準備・検証を `tests/helpers/browser-storage.ts` による localStorage の読み書きで行い、同一コンテキストの page を共有してシリアルに進める
