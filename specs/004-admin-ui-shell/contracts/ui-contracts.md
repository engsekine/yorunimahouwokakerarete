# Contract: 管理画面シェルの UI 部品・ナビ定義 — 004-admin-ui-shell

**Plan**: [../plan.md](../plan.md) | 実装先: `service-front/src/shared/components/` ほか

永続データが無い UI 機能のため、data-model の代わりに部品の Props 契約とナビ定義をここに置く。

## ナビゲーション定義（shared/config/nav.ts）

```typescript
interface NavItem {
    label: string;         // 例: 'ホーム'
    href: Route;           // 例: '/'
    icon: LucideIcon;      // lucide-react のアイコン
    /** アクティブ判定。exact=完全一致 / prefix=前方一致（詳細ページで親をハイライト） */
    match: 'exact' | 'prefix';
}

/** 本フェーズの固定メニュー（権限別出し分けなし・Clarification 2026-07-17 で確定） */
export const NAV_ITEMS: NavItem[]
// [ { ホーム, /, Home, exact },
//   { インポート, /imports, Upload, prefix } ]

/** usePathname の値から現在アクティブな href を返す純関数（単体テスト対象） */
export const resolveActiveHref(pathname: string, items: NavItem[]): string | null
```

- メニューは「ホーム」（トップ `/`・exact 一致）「インポート」の 2 項目（Instagram 連携の削除に伴い「Instagram 連携」項目は廃止）

## AdminShell（layout/AdminShell・client）

```typescript
interface AdminShellProps {
    user: { email: string };          // 管理バー表示用（トークン等は渡さない）
    defaultCollapsed: boolean;        // Cookie 由来の初期折りたたみ状態（SSR ちらつき防止）
    children: React.ReactNode;        // メインコンテンツ（各ページ）
}
```

- 構造: `<div>`（グリッド）内に `AdminSidebar`（`<nav aria-label="管理メニュー">`）・`AdminTopBar`（`<header>`）・`<main>`（children）
- サイドバー開閉状態を保持し、トグルで Cookie（`admin-sidebar-collapsed`）を更新
- デスクトップ: 常設サイドバー + 折りたたみ（アイコンのみ ↔ ラベル付き）
- モバイル: サイドバー非常設・`AdminTopBar` のハンバーガーで `Sheet` を開く

## AdminSidebar（layout/AdminSidebar・client）

```typescript
interface AdminSidebarProps {
    collapsed: boolean;               // デスクトップ折りたたみ表示
    onNavigate?: () => void;          // モバイル Sheet を閉じる用
}
```

- `NAV_ITEMS` を描画。現在項目に `aria-current="page"` とハイライト
- 折りたたみ時はアイコンのみ表示でも、アクセシブルネーム（ラベル）を保持（`aria-label` or sr-only）

## AdminTopBar（layout/AdminTopBar・client 一部）

```typescript
interface AdminTopBarProps {
    user: { email: string };
    onToggleSidebar: () => void;      // デスクトップ折りたたみ / モバイル Sheet 開閉
}
```

- サイト名（yorunimahouwokakerarete）・サイドバートグル・`ThemeToggle`（既存）・ユーザー識別（email）・ログアウト（既存 `LogoutButton`）

## PageHeader（layout/PageHeader）

```typescript
interface PageHeaderProps {
    title: string;                    // Heading level=1 として描画
    description?: string;
    actions?: React.ReactNode;        // 右寄せの主要アクション（任意）
}
```

## Card（surface/Card）

```typescript
interface CardProps {
    title?: string;                   // 指定時は Heading level=2 のカード見出し
    actions?: React.ReactNode;
    children: React.ReactNode;
}
```

## Notice（surface/Notice）

```typescript
interface NoticeProps {
    variant: 'success' | 'error' | 'info';
    children: React.ReactNode;
}
// success/info → role="status"、error → role="alert"。色は既存トークンで variant 別
```

## DataTable（data/DataTable）

```typescript
interface DataTableColumn<T> {
    header: string;
    cell: (row: T) => React.ReactNode;
    /** 行内アクション列など、ヘッダーを視覚的に出さない場合 */
    srOnlyHeader?: boolean;
}
interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    rows: T[];
    getRowKey: (row: T) => string;
    emptyText: string;                // 0 件時の案内
}
// <table> セマンティクス（thead/tbody/th scope="col"）。0 件は emptyText を表示
```

## レイアウト契約（配置ルール）

| ルール | 根拠 |
|---|---|
| `(authenticated)` 配下の全ページは AdminShell 内に描画される | FR-001 |
| ページ遷移で AdminShell は再マウントされない（ネストレイアウト） | FR-002 / SC-002 |
| ルートレイアウトは Header/Footer を持たない。公開トップが自前で内包 | research Decision 2 |
| 認証ガード（`(authenticated)/layout` の getUser + redirect）は不変 | FR-011 |
| 全部品はライト/ダーク両テーマ・キーボード操作・SR 通知に対応 | FR-012 / SC-004 |
