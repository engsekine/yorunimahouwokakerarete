# Quickstart: アカウント ID による前回比較と保存件数の上限 — 007-account-scoped-comparison

実装完了後の end-to-end 検証手順。契約は [contracts/client-api.md](./contracts/client-api.md)、保持ルールは [data-model.md](./data-model.md)、画面は [screens/imports-and-dashboard.md](./screens/imports-and-dashboard.md) を参照。

## 前提

- DB・ログイン不要（006）。データはブラウザの localStorage に入るため、検証はブラウザのプロファイルを分けるかサイトデータを消して始める
- フィクスチャ: `tests/fixtures/instagram-export/`（gen1 HTML・gen2 分割 JSON・`export-gen1.zip`・`export-large.zip`）。本仕様の検証には追加で **本人情報入り ZIP**（`personal_information/personal_information.json` を含む・所有者名 `yorunimahouwokakerarete_owner`）と **別アカウントのフィクスチャ**（所有者名 `other_account`）を実装時に用意する

```bash
npm run dev
```

## 検証シナリオ

### 1. 比較対象はアカウント ID で決まる（US1）

1. `/imports` で gen1 を `yorunimahouwokakerarete_owner` として取り込む → `/imports/[id]` に「比較対象がまだありません。次回、同じアカウント ID で…」が出ること
2. gen2 を同じアカウント ID で取り込む → 「新規フォロワー（2 人）」「フォロー解除した相手（1 人）」が出ること
3. アカウント ID を `Yorunimahouwokakerarete_Owner `（大文字・末尾空白）にして取り込む → 拒否されず、前回と比較されること
4. アカウント ID を `other_account` にして取り込む → `role="alert"` に「比較できるアカウントは 1 つ」「@yorunimahouwokakerarete_owner の記録」の案内と「既存の記録をすべて削除して取り込む」ボタンが出ること。履歴は変化しないこと

### 2. 保存は最新 + 前回の 2 件まで（US2）

1. 同じアカウント ID で 3 回目（`export-large.zip`）を取り込む前に、フォームに「最も古い記録（{日時}）が置き換わります」が表示されること
2. 取り込み後、履歴が 2 件（3 回目・2 回目）で、1 回目が消えていること。3 回目の差分が 2 回目と比較されていること
3. DevTools で `yorunimahouwokakerarete:follower-import-entries:*` キーが 2 記録分（4 本）だけであること（孤立エントリ無し）
4. 容量超過の再現（`Storage.prototype.setItem` を DevTools で例外化、または単体テスト）で 3 回目を取り込む → 日本語の失敗案内が出て、履歴が 2 回目・1 回目のまま変わらないこと

### 3. 別アカウントへの切り替え（US1 シナリオ 3・US3）

1. シナリオ 1-4 の拒否状態で「既存の記録をすべて削除して取り込む」→ 確認ダイアログ（件数・@yorunimahouwokakerarete_owner・「削除して取り込む」）が開き、キャンセルで何も変わらないこと
2. 承諾 → `other_account` の記録 1 件だけが履歴に残り、`/imports/[id]` に「比較対象がまだありません」が出ること
3. 履歴のアカウント ID 列に `@other_account` が表示されること
4. 履歴から 1 件ずつ削除して 0 件にし、`yorunimahouwokakerarete_owner` で通常の取り込みができること

### 4. アカウント ID の自動入力（FR-012）

1. 本人情報入り ZIP を選択 → アカウント ID 欄に `yorunimahouwokakerarete_owner` が自動入力され、`role="status"` の通知が出ること
2. 欄を手で `typo_owner` に書き換えてから取り込む → `account_mismatch`（本人名と異なる）の警告と確認チェックが出ること。チェックして再実行すると `typo_owner` として保存されること（記録 0 件の状態で確認）
3. gen2 の分割 JSON（本人情報なし）だけを選択 → 自動入力されず、保存済み記録のアカウント ID が既定値になること。記録 0 件なら空で `required`

### 5. ダッシュボードの比較要約（US4）

1. 記録 0 件で `/` → 「まだ取り込みがありません。」と導線
2. 1 件だけの状態 → フォロワー件数と「比較対象がまだありません…」
3. 2 件（gen1 → gen2）の状態 → 「前回比 +1」「新規フォロワー 2 人」「フォロー解除 1 人」が表示され、`/imports/[id]` の差分画面と一致すること。「差分の詳細を見る」で直近の差分画面へ移動すること
4. 同一内容を再取り込み → 「前回から変化はありません」が `role="status"` で出ること

### 6. 旧データの扱い（FR-011）

1. `tests/helpers/browser-storage.ts` 相当で `follower-imports` に同一アカウント 4 件（エントリ付き）を書き込む → `/imports` の履歴に 4 件表示され、画面遷移だけでは減らないこと
2. 同じアカウントで取り込む → 履歴が 2 件（新規 + 直前）になり、残り 3 件のエントリキーが消えていること
3. `follower-imports` に A・B 混在を書き込む → A で取り込むと `account_conflict`。「すべて削除して取り込む」で A の新規 1 件だけになること

### 7. 自動テスト・品質ゲート

```bash
npm run test                 # lib/retention・parse-export(peekOwnerUsername)・repository・actions・queries・コンポーネント
npm run test:e2e             # follower-import-flow（3 回目置き換え・別アカウント拒否 → 全削除して取り込む）+ dashboard-comparison
npm run test:a11y            # axe 違反 0 件（/imports・/imports/[id]・/）
npm run type-check && npm run build
npx biome check .
```

### 検証記録

- 2026-09-18: シナリオ 1〜6 は自動 e2e（`tests/follower-import-flow.spec.ts`・`tests/dashboard-comparison.spec.ts`）と単体テストで検証済み。手動ブラウザ確認（`npm run dev`）は未実施
- 2026-09-18: シナリオ 7 の品質ゲート（unit 355 件・storybook 77 件・e2e 33 件（既存スイート含む全件）・type-check・build・biome）を実行済み。既存 e2e のアカウント欄ラベルを「アカウント ID」へ更新し、動的ルートの metadata ストリーミングによる `document-title` の誤検知を防ぐため axe 実行前に `<title>` の到着を待つようにした

### 8. 仕様書同期

- 003 `spec.md`（US3・FR-006・FR-010・Assumptions「1 アカウント」「隣接比較」）と `screens/imports.md` を本仕様に合わせて `/sync-spec` で更新する
- 006 `spec.md` の Key Entities は変更なし（新キー無し）であることを確認する
