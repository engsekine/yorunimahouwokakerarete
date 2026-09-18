# Quickstart: フォロワーリストのインポートと差分表示 — 003-follower-import-diff

実装完了後の end-to-end 検証手順。契約は [contracts/import-actions.md](./contracts/import-actions.md)、スキーマは [data-model.md](./data-model.md) を参照。

## 前提

- 001/002 セットアップ済み（`supabase start`・`make supabase-reset`・テストユーザーでログイン可能）
- テスト用フィクスチャ（実エクスポートと同構造の ZIP / 分割 JSON。差分が既知の 2 世代分）は実装時に `service-front/tests/fixtures/instagram-export/` に用意する

```bash
supabase db reset   # 新マイグレーション適用
npm run dev --workspace=service-front
```

## 検証シナリオ

### 1. 取り込み（US1）

1. ログインして `/imports` を開く → 手順説明（エクスポート手順・10MB 上限）とアップロードフォームが表示されること
2. フィクスチャ ZIP + アカウント名を入力して取り込み → `/imports/[id]` に遷移し、フォロワー/フォロー中件数と取込日時が表示されること
3. 分割 JSON（followers_1/2.json + following.json）を複数選択して取り込み → 統合された件数になること
4. HTML 形式・無関係ファイル → 取り込まれず「JSON 形式で再エクスポート」の日本語案内が出ること
5. DB 確認: `follower_imports` が `completed`・`follower_import_entries` が件数どおりであること

### 2. 差分（US2）

1. 内容の異なる 2 世代目のフィクスチャを取り込み → 既知の差分（例: 新規 2 名・解除 1 名）が件数・一覧とも一致すること
2. 一覧の相手をクリック → Instagram プロフィール（外部）が開くこと
3. 同一内容を再取り込み → 「変化なし（差分 0 件）」表示になること
4. ユーザーネーム変更の注記が差分画面に表示されていること

### 3. 履歴・削除（US3）

1. `/imports` の履歴に取り込みが新しい順で並ぶこと
2. 過去の取り込みを開くと当時の差分が再表示されること
3. 削除（確認ダイアログ）→ 履歴から消え、前後の取り込み間で差分が再計算されること

### 4. 分析（US4）と分離（FR-011）

1. `/imports/[id]` の分析セクションに非相互の 2 一覧が表示されること（following 未同梱の取り込みでは案内のみ）
2. 別ユーザーでログイン → `/imports` が空で、他人の `/imports/[id]` が見えないこと
3. 別アカウント名のエクスポートを取り込もうとすると警告が出て、確認チェックなしでは取り込めないこと（FR-010）

### 5. 自動テスト・品質ゲート

```bash
npm run test --workspace=service-front        # パーサ純関数・差分クエリ・actions・コンポーネント
npm run test:e2e --workspace=service-front    # フィクスチャで取り込み→差分の E2E + axe（違反 0 件）
npx tsc --noEmit -p service-front && npm run build --workspace=service-front
npx biome check .
```

## 期待される最終状態

- シナリオ 1〜5 がすべて通り、SC-001〜SC-006 を満たす
- アップロードした ZIP/JSON がどこにも保存されていない（解析結果のみ永続化・research Decision 6）
