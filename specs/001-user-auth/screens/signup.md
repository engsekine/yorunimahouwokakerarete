# 画面仕様: 新規登録（/signup）— 001-user-auth

**ルート**: `(auth)/signup/page.tsx` | **コンポーネント**: `features/auth/components/client/SignupForm`

## 画面要素

| 要素 | 種別 | 備考 |
|---|---|---|
| 見出し「新規登録」 | Heading | h1 |
| メールアドレス | text input（type=email） | label 関連付け必須 |
| パスワード | password input | マスク表示 + 表示/非表示トグル。要件（12 文字以上・英大小数字）をヒントテキストで提示（`aria-describedby`） |
| 登録ボタン | submit | 送信中は disabled（二重送信防止） |
| ログインへの導線 | link | `/login` |

旧実装の氏名・ニックネーム・ユーザー ID・生年月日・ダイバー種別・利用規約同意・Google ボタンは**すべて削除**する。

## 項目定義・バリデーション

| 項目 | 必須 | ルール | エラーメッセージ |
|---|---|---|---|
| email | ✔ | メール形式 | 「正しいメールアドレスを入力してください」等（shared emailField） |
| password | ✔ | 12〜72 文字・英大文字/小文字/数字必須 | shared passwordField の既存メッセージ |

## 状態・挙動

- 登録成功 → 同ページ内で「確認メールを送信しました」の完了ビューに切り替わる（`role="status"` + `aria-live="polite"`）
- 登録済みメールでの登録試行 → 成功時と同一挙動（存在を開示しない・enumeration 対策）
- バリデーションエラー → 項目ごとに日本語メッセージ + `aria-invalid` + `role="alert"`
- ログイン済みでのアクセス → middleware が `/home` へリダイレクト

## 完了ビュー（確認メール送信案内）

- 「確認メールを送信しました。メール内のリンクをクリックして登録を完了してください」の案内文と送信先メールアドレス
- ResendConfirmationButton（再送導線。送信先メールアドレスはメモリ上でのみ保持し URL クエリに載せない）
- 「ログイン画面に戻る」リンク
