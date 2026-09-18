# Contract: ルート・リダイレクト — 001-user-auth

**Plan**: [../plan.md](../plan.md) | **Research**: Decision 3 / 6

## ルート一覧（リセット後の全ルート）

| パス | 種別 | 認証 | 内容 |
|---|---|---|---|
| `/` | ページ（public） | 不要 | トップ: 本アプリの紹介 + ログイン / 新規登録導線 |
| `/login` | ページ（auth） | 未ログイン専用 | ログインフォーム |
| `/signup` | ページ（auth） | 未ログイン専用 | 新規登録フォーム（登録成功後は同ページ内で確認メール送信案内 + 再送ボタンの完了ビューに切り替わる） |
| `/home` | ページ（authenticated） | 必須 | ホーム: ログイン中メールアドレス表示 + ログアウト |
| `/api/auth/callback` | Route Handler | 不要 | 確認メールリンクのコード交換（`exchangeCodeForSession`）→ `next` パラメータ（既定 `/home`）へリダイレクト |
| 上記以外（旧アプリの全 URL 含む） | — | — | 404（not-found.tsx） |

## リダイレクト規則（proxy.ts = middleware）

| 条件 | 挙動 | 対応 FR |
|---|---|---|
| 未ログインで `/home` 配下にアクセス | `/login` へリダイレクト | FR-007 / SC-004 |
| ログイン済みで `/login`・`/signup` にアクセス | `/home` へリダイレクト | FR-007 |
| セッション期限切れで保護画面を操作 | 上記「未ログイン」と同じ扱い | Edge Case |
| `/api/auth/callback` でコード交換失敗 | `/login`（エラーメッセージ付き）へリダイレクト | Edge Case |

- 保護判定は `APP_ROUTE_PREFIXES = ['/home']`（プレフィックス一致）、認証画面判定は `AUTH_ROUTES = ['/login', '/signup']`（完全一致）
- 二重防御: `(authenticated)/layout.tsx` でも `supabase.auth.getUser()` によるガードを行う
