# Quickstart: フォロワー・フォロー中の ID 一覧表示 — 005-follower-list-view

実装完了後の検証手順。契約は [contracts/list-view-contracts.md](./contracts/list-view-contracts.md)、画面は [screens/follower-list.md](./screens/follower-list.md) を参照。

## 前提

- 001〜004 セットアップ済み（`supabase start`・`make supabase-reset`・テストユーザーでログイン可能）
- 003 のフィクスチャ（`tests/fixtures/instagram-export/`）で取り込みを 1 件作成しておく

```bash
npm run dev --workspace=service-front   # http://localhost:3000
```

## 検証シナリオ

### 1. フォロワー ID 一覧（US1）

1. 取り込みを 1 件行い `/imports/[id]` を開く → 「メンバー一覧」セクションが表示される
2. フォロワータブに、その取り込みのフォロワー ID が**全件**（件数どおり）並ぶ
3. ID をクリック → Instagram プロフィール（外部）が開く
4. フォロワー 0 件の取り込みでは「フォロワーがいません」が表示される

### 2. フォロー中 ID 一覧（US2）

1. フォロー中タブに切り替え → フォロー中 ID が全件表示される
2. どちらのタブを見ているか（aria-selected）が分かる
3. フォロー中を含まない取り込み（フォロワーのみ）では「フォロー中一覧が含まれていません」の案内が出る

### 3. 絞り込み検索（US3）

1. ID の一部を入力 → 一致する ID だけに絞り込まれ、件数表示が「N 件表示中」に更新される
2. 一致なしの語では「該当する ID がありません」
3. 入力を消すと全件表示に戻る

### 4. アクセス制御・大規模（SC-003/SC-004）

1. 別ユーザーでは他人の `/imports/[id]` が開けない（notFound）
2. 1 万件フィクスチャ（`export-large.zip`）の取り込みで、一覧表示・検索反映が体感 1 秒以内

### 5. 品質ゲート

```bash
npm run test --workspace=service-front        # getImportEntries・FollowerListView（タブ/検索/空/未同梱）
npm run test:e2e --workspace=service-front    # 一覧表示・タブ・検索の E2E + axe（違反 0 件）
npx tsc --noEmit -p service-front && npm run build --workspace=service-front
npx biome check . && npm run lint:markup --workspace=service-front
```

- デグレ確認: 003/004 の既存 E2E（差分・分析・シェル）が緑のままであること

## 期待される最終状態

- シナリオ 1〜5 が通り、SC-001〜SC-005 を満たす
- DB スキーマは変更されていない（既存 `follower_import_entries` を読むだけ）
