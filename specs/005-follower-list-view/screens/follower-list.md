# 画面仕様: フォロワー・フォロー中の ID 一覧（/imports/[id]）— 005-follower-list-view

既存の取り込み結果ページ（差分 + 分析）に「一覧」セクションを追加する。

## 一覧セクション（Card）

| 要素 | 種別 | 備考 |
|---|---|---|
| 見出し「メンバー一覧」 | Heading level=2（Card title） | |
| タブ | role=tablist | 「フォロワー（N）」「フォロー中（M）」。選択タブに aria-selected |
| 検索入力 | FormField（type=search・label「ID で絞り込む」） | 部分一致・大文字小文字非区別・デバウンス |
| 件数表示 | text（aria-live=polite） | 「全 N 件」/ 絞り込み時「N 件表示中」 |
| 一覧 | DataTable（1 列: ユーザー ID） | `@username` の外部リンク（`rel="noopener noreferrer"`）。username 昇順 |

## 状態別の表示

| 状態 | 表示 |
|---|---|
| フォロワーあり | フォロワータブに全件 + 件数 |
| フォロワー 0 件 | DataTable emptyText「フォロワーがいません」 |
| フォロー中あり | フォロー中タブに全件 + 件数 |
| フォロー中が取り込みに未同梱（following_count=0） | フォロー中タブは「この取り込みにはフォロー中一覧が含まれていません」の案内（0 件とは区別） |
| 検索で該当なし | 「該当する ID がありません」 |
| 本人以外の取り込み | ページ自体が notFound（既存の /imports/[id] ガード） |

## アクセシビリティ（FR-009 / SC-005）

- タブは role=tablist / tab（aria-selected）/ tabpanel でキーボード操作可能
- 検索入力は label 関連付け。件数・絞り込み結果は `aria-live="polite"` で通知
- 外部プロフィールリンクは `rel="noopener noreferrer"`
- ライト/ダーク両テーマでコントラスト基準（004 の DataTable 準拠）
