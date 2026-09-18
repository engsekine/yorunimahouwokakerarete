# 画面仕様: インポート（/imports・/imports/[id]）— 003-follower-import-diff

> 007 で変わった箇所（アカウント ID の自動入力・置き換え案内・別アカウント拒否・履歴のアカウント ID 列・比較対象なしの文言）は [007 screens/imports-and-dashboard.md](../../007-account-scoped-comparison/screens/imports-and-dashboard.md) を正とする。以下は 007 反映後の状態。

## /imports（アップロード + 履歴）

| 要素 | 種別 | 備考 |
|---|---|---|
| 見出し「フォロワーリストのインポート」 | Heading level=1 | |
| 手順説明 | text + tabs + ordered list（`ExportGuide`・client） | アカウントセンター「あなたの情報をエクスポート」からデバイスにエクスポート → ZIP をそのままアップロードする手順。端末別に **タブで切り替え**（「PC（ブラウザ）」13 ステップ・「スマートフォン（アプリ）」11 ステップ。既定は PC）。いずれもカスタマイズは「フォロワー」「フォロー中」のみチェック・期間は全期間・フォーマットは JSON・画質は低画質を指定。スマートフォン版は通知後の ZIP ダウンロード（iPhone は「ファイル」アプリ / Android は「ダウンロード」フォルダ）とブラウザからの取り込みまで含む。タブは shadcn Tabs（`@/shared/components/ui/Tabs`・`role="tablist"` / `tab` / `tabpanel`・矢印キーで移動と同時に切り替わる自動アクティベーション）。手順の直後に、共用パソコン（公共・職場・学校）や共有ブラウザで取り込みを行わない注意（データは自動では消えず手動削除まで残る。本文色・中太字）と、「最新のデータを取得するには、エクスポートを 1 からやり直してください」の注釈を置く（エクスポートは作成時点の内容しか含まないため）。定数 `EXPORT_GUIDE_TITLE` / `EXPORT_GUIDE_DEVICES` / `EXPORT_GUIDE_STEPS`（端末別 Record）/ `SHARED_DEVICE_WARNING` / `EXPORT_REFRESH_NOTE` |
| ファイル選択 | file input（複数可・label 関連付け） | accept: .zip/.html/.json（ImportUploadForm・client）。内容はブラウザ内で解析し、どこにも送信しない。選択時に `peekOwnerUsername` で本人名が取れればアカウント ID 欄へ自動入力し `role="status"` で通知（007 FR-012） |
| アカウント ID | text input（制御） | ラベル「対象の Instagram アカウント ID」。既定値は 抽出した本人名 → 保存済み記録のアカウント ID → 空（記録 0 件なら必須）。最大 30 文字（`MAX_ACCOUNT_USERNAME_LENGTH`） |
| 取り込み前の案内 | text（`role="status"`） | 保存済みが 2 件で同じアカウントなら「最も古い記録（日時）が置き換わります」、入力値が別アカウントなら「保存済みの記録は @x のものです」（007 FR-006 / Edge Case） |
| 不一致確認チェック | checkbox | `account_mismatch`（入力値 ≠ エクスポート内の本人名）失敗時のみ表示（007 FR-008） |
| 別アカウント拒否 | `role="alert"` + button | `account_conflict` 失敗時に案内と「既存の記録をすべて削除して取り込む」（ReplaceAllAndImportButton・ConfirmDialog 付き）。承諾で全削除 + 保存を原子的に実行（007 FR-007a） |
| 取り込みボタン | submit | 処理中は disabled + `aria-busy`・結果は `aria-live="polite"`。失敗は `role="alert"`（対象ファイルのアップロード手順含む） |
| 取り込み履歴 | DataTable | 取込日時（JST）・アカウント ID（`@username`）・フォロワー/フォロー中件数・新しい順。最大 2 件（旧データはすべて表示）。各行から `/imports/[id]` へ |
| 削除ボタン | button（client） | ConfirmDialog（destructive）付き（DeleteImportButton）。「残った記録同士で差分が計算し直されます」 |

- 取り込み成功時は `/imports/[id]`（今回の差分）へ遷移する

## /imports/[id]（差分 + 分析）

| 要素 | 種別 | 備考 |
|---|---|---|
| 見出し + 取込情報 | Heading level=1 / text | 取込日時・アカウント名・フォロワー件数（前回比 ±N） |
| 新規フォロワー | セクション（Heading level=2）+ list | 件数 + ユーザーネーム一覧。各項目は Instagram プロフィールへの外部リンク（`rel="noopener noreferrer"`） |
| フォロー解除した相手 | 同上 | 差分 0 件は「変化なし」を明示。比較対象なしは「比較対象がまだありません。次回、同じアカウント ID で…」（`NO_PREVIOUS_NOTICE`・007 FR-003）。比較対象は同じアカウント ID の直前記録 |
| ユーザーネーム変更の注記 | text | 改名は「解除 + 新規」として現れる制約（常時表示） |
| フォロー関係の分析 | セクション | フォローバックされていない相手 / していない相手。following 未同梱なら案内のみ |

- 一覧はキーボード操作で辿れるリンクとして実装。長大な一覧は件数表示 + スクロール領域（ページ内で完結）
- 本人以外の import id は not found 扱い
