# yorunimahouwokakerarete

Instagram のフォロワーを管理・分析できるサービス。

**サーバー側に状態を持たない Next.js 単体のアプリ**として実装している。
ログイン・DB・外部サービス接続を持たず、取り込んだフォロワー一覧はすべて **利用者のブラウザ内（localStorage）** に保存する。Vercel にそのままデプロイできる。

## 機能（仕様は `specs/` を参照）

| 機能 | 仕様 | 画面 |
|---|---|---|
| フォロワーリストのインポートと差分表示（ZIP / JSON / HTML・新規 / 解除・履歴・削除・フォロー関係の分析） | [003](specs/003-follower-import-diff/spec.md) | `/imports`・`/imports/[id]` |
| WordPress 風の管理画面シェル（サイドバー + 上部バー + ホーム = ダッシュボード） | [004](specs/004-admin-ui-shell/spec.md) | `/` ほか |
| フォロワー・フォロー中の ID 一覧（タブ切替・絞り込み検索） | [005](specs/005-follower-list-view/spec.md) | `/imports/[id]` |
| 認証なし・ブラウザ保存で完結させる構成 | [006](specs/006-standalone-browser-storage/spec.md) | 全体 |

001（ユーザー認証）・002（Instagram アカウント連携）は本アプリでは対象外（ログイン不要・Instagram API との接続なし）。

## 設計方針

| 観点 | 方針 |
|---|---|
| 認証 | なし（誰でも利用可・データは端末ローカル） |
| データ保存 | ブラウザの localStorage（`yorunimahouwokakerarete:` プレフィックスのキー） |
| 取り込みファイルの送信 | どこにも送信しない（ブラウザ内で解析・保存） |
| データ取得 | Client Components + TanStack Query（`features/*/client/`） |
| Instagram API との接続 | なし（データの入口はエクスポートファイルの取り込みのみ） |
| 他ユーザーからの隔離 | データが端末外に存在しないことで担保 |
| リポジトリ構成 | 単一の Next.js アプリ（shadcn は `src/components/ui/`） |

### ブラウザ保存の制約

- 保存先は端末・ブラウザごと。別のブラウザや端末には引き継がれず、サイトデータの消去で失われる（ホーム `/` に案内を表示）
- localStorage の上限（ブラウザにより 5MB 前後）を超えると取り込みは失敗し、日本語のエラーで「不要な取り込みの削除」を案内する。一覧エントリは `[username, followedAt(epoch 秒), profileUrl?]` の圧縮形式で保存し、1 万件規模でも数百 KB に収める
- 書き込みは「全件成功 or 全件取り消し」（`writeAtomically`）で、途中失敗しても中途半端な取り込みは残らない

## 技術スタック

- Next.js 16（App Router / React Compiler）+ TypeScript + Tailwind CSS v4
- shadcn/ui（Base UI）+ lucide-react
- TanStack Query（ブラウザ保存の読み書きをクエリ / ミューテーションとして扱う）
- fflate（ZIP 展開）
- Vitest / Storybook / Playwright（axe-core）/ Biome / markuplint

## セットアップ

前提: Node.js 22 以上（volta で 24 を指定）/ npm 10 以上

```bash
npm install
cp .env.example .env.local   # 任意（既定値のままで動く）
npm run dev                  # http://localhost:3000
```

DB・Docker・メールサーバーは不要。

### 環境変数

| 変数 | 用途 | 既定 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | metadata / sitemap の絶対 URL | `http://localhost:3000` |

## Vercel へのデプロイ

Next.js として自動検出されるため追加設定は不要。

1. Vercel でリポジトリをインポートする（Framework Preset: Next.js）
2. 環境変数 `NEXT_PUBLIC_SITE_URL` に本番ドメインを設定する
3. デプロイ

Route Handler・Server Action は持たず、DB・秘密情報・永続ストレージも使わない。

## テスト・検証

```bash
npm run test            # Vitest 単体テスト（jsdom の localStorage を実ストレージとして使用）
npm run test:e2e        # Playwright e2e（dev サーバーを自動起動・要 `npx playwright install chromium`）
npm run test:a11y       # 公開ページの a11y スキャン（axe-core）
npm run type-check      # tsc（初回は `npx next typegen` で typedRoutes の型を生成）
npm run check           # Biome lint / format
npm run lint:markup     # markuplint
npm run storybook       # Storybook（http://localhost:6006）
npm run validate        # type-check + check + lint:markup + test
```

e2e のデータ準備・検証は `page.evaluate` による localStorage 操作（`tests/helpers/browser-storage.ts`）で行う。

## ディレクトリ構成

```
src/
├── app/                    # ルーティング（(app) = 管理画面シェル配下）
├── components/ui/          # shadcn 生成物（無改変・直接 import しない）
├── features/
│   ├── follower-import/    # 003 / 005: client/（queries / actions / repository）・hooks/・lib/（parse-export / diff / entry-codec）・components/client/
│   └── dashboard/          # 004: 各 feature の要約ウィジェット（合成 feature）
├── shared/
│   ├── components/         # layout（AdminShell 等）/ form / surface / data / feedback / ui（shadcn ラッパー）
│   └── lib/                # storage（localStorage ラッパー）/ react-query / date / test-utils …
└── lib/utils.ts            # cn
```

アーキテクチャの詳細は [arch/feature-based.md](arch/feature-based.md)、コーディング規約は `.claude/rules/`、プロジェクト原則は [.specify/memory/constitution.md](.specify/memory/constitution.md) を参照。

## 開発フロー

仕様は spec-kit 形式で `specs/NNN-feature-name/` に管理する（`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`）。003〜005 はドメイン機能の仕様、[006](specs/006-standalone-browser-storage/spec.md) は認証なし・ブラウザ保存としての横断的な構成ルールをまとめている。
