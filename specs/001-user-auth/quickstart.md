# Quickstart: ユーザー認証（新規登録・ログイン）— 001-user-auth

実装完了後に本機能が end-to-end で動くことを検証する手順。契約の詳細は [contracts/](./contracts/)、スキーマは [data-model.md](./data-model.md) を参照。

## 前提

- Node.js 24（volta 管理）/ npm 11+
- Docker（Supabase ローカルスタック用）
- Supabase CLI

## セットアップ

```bash
npm install

# Supabase ローカルスタック起動（初回はイメージ取得あり）
supabase start

# マイグレーション適用（旧スキーマが残っている場合も reset で作り直し）
supabase db reset

# dev サーバー起動（http://localhost:3000）
npm run dev --workspace=service-front
```

`service-front/.env.local` に `supabase start` の出力（API URL / anon key）を設定しておくこと。

## 検証シナリオ

### 1. 新規登録 → メール確認 → ホーム到達（US1 / FR-001〜003）

1. `http://localhost:3000/signup` を開く
2. 未登録メール + 有効なパスワード（例: `Yorunima2026Test`）で送信 → 同ページ内の完了ビュー（確認メール案内）に切り替わること
3. Mailpit（`http://localhost:54324`）で確認メールを開き、リンクをクリック → `/home` に遷移し、登録メールアドレスが表示されること
4. 無効な入力（不正メール形式・11 文字以下のパスワード）で項目ごとの日本語エラーが出て送信されないこと

### 2. ログイン / ログアウト（US2 / FR-004〜006, 008）

1. `/login` から登録済みメール + 正しいパスワードで送信 → `/home` に遷移すること
2. 誤ったパスワードで「メールアドレスまたはパスワードが正しくありません」が表示されること（どちらの誤りか特定不能な文言）
3. ブラウザを閉じて再度 `http://localhost:3000/home` を開く → 再ログインなしで表示されること
4. ログアウトボタン → `/login` に遷移し、`/home` に戻れないこと

### 3. ルート保護（US3 / FR-007 / SC-004)

1. 未ログイン（シークレットウィンドウ）で `/home` に直接アクセス → `/login` にリダイレクトされること
2. ログイン済みで `/login`・`/signup` にアクセス → `/home` にリダイレクトされること

### 4. 旧アプリの痕跡ゼロ（US4 / FR-009〜010 / SC-003）

```bash
# コード・文言にダイビング関連語が残っていないこと（specs/001 以下と git 履歴は除く）
grep -riE "ダイビング|dive|diving|器材|レギュレータ" service-front/src supabase packages -r  # ※ tests/auth-flow.spec.ts の旧 URL 404 回帰テストのみ例外

# 旧 URL が 404 になること（dev サーバー起動状態で）
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dives   # → 404 か /login リダイレクトでない 404 系
```

DB 側: `supabase db reset` 後、`public` スキーマのテーブルが `users` のみであること。

### 5. 自動テスト・品質ゲート（SC-005 / Constitution III・V）

```bash
npm run test --workspace=service-front        # Vitest（schema / actions / コンポーネント）
npm run test:e2e --workspace=service-front    # 認証フロー e2e + axe-core による WCAG 2.1 AA 検査（違反 0 件）
npx tsc --noEmit -p service-front             # 型チェック
npm run build --workspace=service-front       # 本番ビルド成功
npx biome check .                             # Lint / フォーマット
```

## 期待される最終状態

- 全ルートが [contracts/routes.md](./contracts/routes.md) の一覧と一致（それ以外は 404）
- `supabase/migrations/` に `create_users` の 1 本のみ
- 検証シナリオ 1〜5 がすべて通る
