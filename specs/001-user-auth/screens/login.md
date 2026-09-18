# 画面仕様: ログイン（/login）— 001-user-auth

**ルート**: `(auth)/login/page.tsx` | **コンポーネント**: `features/auth/components/client/LoginForm`

## 画面要素

| 要素 | 種別 | 備考 |
|---|---|---|
| 見出し「ログイン」 | Heading（共通コンポーネント） | h1 |
| メールアドレス | text input（type=email） | label 関連付け必須 |
| パスワード | password input | マスク表示 + 表示/非表示トグル |
| ログインボタン | submit | 送信中は disabled + ローディング表示 |
| 新規登録への導線 | link | `/signup` |

## 項目定義・バリデーション

| 項目 | 必須 | ルール | エラーメッセージ |
|---|---|---|---|
| email | ✔ | メール形式 | 「正しいメールアドレスを入力してください」/「メールアドレスを入力してください」 |
| password | ✔ | 必須のみ（長さ検証なし） | 「パスワードを入力してください」 |

## 状態・挙動

- 認証成功 → `/home` へ遷移
- 認証失敗 → フォーム上部に `role="alert"` で「メールアドレスまたはパスワードが正しくありません」（入力値は保持）
- メール未確認エラー → 未確認の旨のメッセージ + ResendConfirmationButton を表示
- ログイン済みでのアクセス → middleware が `/home` へリダイレクト
- エラー時 `aria-invalid` を該当項目に付与。キーボードのみで完結操作可能（WCAG 2.1 AA）
