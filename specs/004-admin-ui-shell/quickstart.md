# Quickstart: WordPress 風の管理画面 UI — 004-admin-ui-shell

実装完了後の検証手順。契約は [contracts/ui-contracts.md](./contracts/ui-contracts.md)、画面は [screens/admin-shell.md](./screens/admin-shell.md) を参照。

## 前提

- 001〜003 セットアップ済み（`supabase start`・`make supabase-reset`・テストユーザーでログイン可能）

```bash
npm run dev --workspace=service-front   # http://localhost:3000
```

## 検証シナリオ

### 1. シェルの成立（US1）

1. ログインして `/home` を開く → 左サイドバー・上部管理バー・コンテンツ領域が表示されること
2. サイドバーの「インポート」を選ぶ → コンテンツだけが `/imports` に切り替わり、シェルは再描画されず、「インポート」がハイライト（`aria-current="page"`）されること
3. `/imports/[id]`（詳細）に入る → 親メニュー「インポート」がハイライトされたままであること
4. 管理バーのログアウト → `/login` に戻ること
5. 未ログイン（シークレット）で `/home` → `/login` に誘導されること（アクセス制御維持）

### 2. ダッシュボード（US2）

1. `/home` にインポートサマリのウィジェットカードが表示されること
2. ウィジェットのリンクから対象機能ページへ移動できること
3. 取り込みなしのユーザーで、ウィジェットが「未設定 + 最初の一歩」を表示すること
4. 取得が失敗してもダッシュボード全体が壊れないこと（該当カードのみ Notice 表示）

### 3. 共通部品での一貫表示（US3）

1. インポート各ページが PageHeader（見出し + アクション）で始まること
2. インポート履歴が DataTable（見出し行・行・行内アクション）で表示されること
3. 操作結果（成功/失敗）が Notice（成功=肯定色 role=status / 失敗=注意色 role=alert）で表示されること

### 4. レスポンシブ（US4）

1. モバイル幅: サイドバーが畳まれ、≡ で Sheet として開閉できること（メニュー選択で自動クローズ）
2. デスクトップ幅: 折りたたみトグルでアイコンのみ ↔ ラベル付きが切り替わること
3. 折りたたみ状態でページ移動して戻っても状態が保持されること（Cookie）

### 5. 品質ゲート・デグレ確認

```bash
npm run test --workspace=service-front        # 共通部品・ナビ match・ウィジェット
npm run test:e2e --workspace=service-front    # シェル/各ページの E2E + axe（ライト/ダーク両テーマ・違反 0 件）
npx tsc --noEmit -p service-front && npm run build --workspace=service-front
npx biome check . && npm run lint:markup --workspace=service-front
```

- **デグレ確認（SC-006）**: 003 の既存 E2E（follower-import-flow）がすべて緑のままであること
- 公開ページ（`/`・`/login`・`/signup`）が従来デザインのまま（シェルが付かない）であること

## 期待される最終状態

- シナリオ 1〜5 が通り、SC-001〜SC-006 を満たす
- 既存機能（接続・更新・解除・取り込み・差分・削除）が UI 刷新後も従来どおり動作する
