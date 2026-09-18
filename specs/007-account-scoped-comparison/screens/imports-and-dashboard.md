# 画面仕様（差分）: /imports・/imports/[id]・/ — 007-account-scoped-comparison

003 の [screens/imports.md](../../003-follower-import-diff/screens/imports.md) を基準に、本仕様で **変わる箇所だけ** を記す。記載のない要素は 003 のまま。

## /imports（アップロード + 履歴）

| 要素 | 種別 | 変更内容 |
|---|---|---|
| ファイル選択 | file input | 選択時に `peekOwnerUsername` で本人アカウント名を抽出し、取れればアカウント ID 欄に自動入力（利用者が手編集済みなら上書きしない）。自動入力時は `role="status"` で `OWNER_AUTOFILL_NOTICE` を通知 |
| アカウント ID | text input（制御） | ラベルを「対象の Instagram アカウント ID」に変更。既定値の優先順: 抽出値 → 保存済み記録のアカウント ID → 空（記録 0 件のとき `required`）。最大 30 文字 |
| 置き換え案内 | text（`role="status"`） | 保存済みが `MAX_RETAINED_IMPORTS` 件以上かつ入力値が保存済みアカウント ID と一致するとき `RETENTION_NOTICE`（最も古い記録の取込日時を差し込む）。確認操作なし（FR-006） |
| 別アカウント事前案内 | text（`role="status"`） | 入力値（正規化）が保存済みアカウント ID と異なるとき `ACCOUNT_SWITCH_NOTICE`。確認操作なし |
| 不一致確認チェック | checkbox | `account_mismatch`（入力値 ≠ 本人名）失敗時のみ表示（FR-008・003 と同じ UI） |
| 別アカウント拒否 | `role="alert"` + button | `account_conflict` 失敗時に `IMPORT_ERROR_MESSAGES.account_conflict` と「既存の記録をすべて削除して取り込む」ボタン（destructive）を表示。ボタン → ConfirmDialog（title「保存済みの記録をすべて削除して取り込みますか？」/ description に件数と保存済みアカウント ID / confirmLabel「削除して取り込む」/ destructive）→ 承諾で `uploadImport({ ..., replaceExisting: true })`。取り消しは何もしない |
| 取り込みボタン | submit | 既存どおり。成功時は `/imports/[id]` へ遷移 |
| 取り込み履歴 | DataTable | 列を「取込日時 / アカウント ID / フォロワー / フォロー中 / 操作」に変更（アカウント ID 列を追加・`@username` 表示）。並びは新しい順。旧データが 3 件以上あればすべて表示（FR-011） |
| 削除ボタン | button | 既存どおり（1 件ずつ・ConfirmDialog）。description を「削除すると、この取り込みのフォロワー一覧は失われ、残った記録同士で差分が計算し直されます。」に調整 |
| すべて削除ボタン | button | 既存（`DeleteAllImportsButton`）どおり |

## /imports/[id]（差分 + 分析 + 一覧）

| 要素 | 種別 | 変更内容 |
|---|---|---|
| 見出し + 取込情報 | text | 既存どおり（取込日時・`@アカウント ID`・フォロワー件数・前回比 ±N）。前回比の「前回」は同じアカウント ID の直前記録 |
| 比較対象なしの案内 | text | 文言を `NO_PREVIOUS_NOTICE`（「同じアカウント ID で」を含む）に変更（FR-003） |
| 新規フォロワー / フォロー解除 / 変化なし / 注記 / 分析 / 一覧 | — | 変更なし |

## /（ダッシュボード・インポートサマリ）

| 要素 | 種別 | 内容 |
|---|---|---|
| 読み込み中 | LoadingStatus | `useImports` または `useLatestComparison` が pending |
| 取り込みなし | text + link | 既存どおり「まだ取り込みがありません。」+「エクスポートを取り込む」（`/imports`） |
| フォロワー件数 | text（大） | 既存どおり。直下に「@アカウント ID・{取込日時} 取り込み」 |
| 比較要約 | dl または 3 項目の list | 「前回比 ±N」「新規フォロワー N 人」「フォロー解除 N 人」。差分 0 件は「前回から変化はありません」を `role="status"` で明示。`comparison.previous === null` は `NO_PREVIOUS_NOTICE` |
| 要約の取得失敗 | Notice（info） | 件数は表示したまま、要約部分だけ「比較の情報を取得できませんでした。時間をおいて再度お試しください。」 |
| 詳細導線 | link | 「差分の詳細を見る」→ `/imports/{current.id}`。既存の「取り込み・差分を見る」（`/imports`）は残す |

- 件数は `toLocaleString('ja-JP')`。増減は `+N` / `-N` / `±0`
- 見出しは `Heading`（`@/shared/components/typography/Heading`）を使う。Card のタイトルは既存どおり
