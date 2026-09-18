# 画面仕様: ホーム（/home）— 001-user-auth

**ルート**: `(authenticated)/home/page.tsx` | **コンポーネント**: `features/auth/components/client/LogoutButton`（新規）

本フェーズでは「ログインできたことが分かる」最小プレースホルダー（spec Assumptions）。フォロワー管理機能は後続フェーズでこの画面を拡張する。

## 画面要素

| 要素 | 種別 | 備考 |
|---|---|---|
| 見出し「ホーム」 | Heading | h1 |
| ログイン中ユーザー表示 | text | 登録メールアドレスを表示（FR-008）。Server Component で `supabase.auth.getUser()` から取得 |
| ログアウトボタン | button（client） | `signOut` Server Action を呼ぶ。実行後 `/login` へ遷移 |

## 状態・挙動

- 未ログインアクセス → middleware が `/login` へリダイレクト（+ layout の requireUser 二重防御）
- ログアウト実行 → セッション破棄 → `/login` へ遷移（US2 シナリオ 4）
- ページは `generatePageMetadata` で metadata をエクスポートする
