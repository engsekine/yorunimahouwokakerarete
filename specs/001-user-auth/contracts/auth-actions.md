# Contract: 認証 Server Actions — 001-user-auth

**Plan**: [../plan.md](../plan.md) | 実装先: `service-front/src/features/auth/server/actions.ts`

共通の戻り値型（既存 `@/shared/types/action-result` を継続使用）:

```typescript
type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };  // error は日本語のユーザー向けメッセージ
```

## signIn

```typescript
signIn(email: string, password: string): Promise<ActionResult>
```

| ケース | 結果 |
|---|---|
| 認証成功 | `{ success: true }` → 呼び出し側（LoginForm）が `/home` へ遷移 |
| メール or パスワード誤り | `{ success: false, error: 'メールアドレスまたはパスワードが正しくありません' }`（どちらの誤りか特定不能な文言・FR-005） |
| メール未確認（`email_not_confirmed`） | `{ success: false, error: <未確認である旨 + 再送案内> }` → 画面は ResendConfirmationButton を表示 |
| 基盤障害・ネットワークエラー | `{ success: false, error: <汎用メッセージ> }`（入力値は保持・Edge Case） |

## signUp

```typescript
interface SignUpInput { email: string; password: string }
signUp(input: SignUpInput): Promise<ActionResult>
```

旧実装から nickname / handle / 氏名 / 規約同意 / ダイバー種別等の入力・user_metadata・RPC 事前チェックを**すべて除去**し、email + password のみにする。

| ケース | 結果 |
|---|---|
| 登録成功 | `{ success: true }` → SignupForm がページ内の完了ビュー（確認メール送信案内）に切り替える。`emailRedirectTo` は `${SITE_URL}/api/auth/callback?next=/home` |
| 登録済みメール（identities が空で返る） | 成功時と同一挙動（enumeration 対策・US1 シナリオ 3）。※既存実装の「既に登録されています」露出は仕様上の情報漏洩のため踏襲しない |
| バリデーション不正（形式・パスワード要件） | クライアント側 yup で送信前にブロック + サーバー側 GoTrue でも拒否（FR-002） |
| 二重送信 | ボタン disabled（isSubmitting）+ Supabase 側の一意性でアカウントは 1 つのみ（Edge Case） |

## signOut

```typescript
signOut(): Promise<void>
```

セッションを破棄し `/login` へ `redirect`（FR-006 / US2 シナリオ 4）。

## resendConfirmationEmail

```typescript
resendConfirmationEmail(email: string): Promise<ActionResult>
```

確認メールを再送する（Edge Case: 未確認ログイン時の導線）。結果は登録有無にかかわらず「送信しました」系の文言（enumeration 対策）。

## 削除する既存 Actions

`requestPasswordReset` / `updatePassword` / `signInWithGoogle` / `completeProfile`（いずれもスコープ外・spec Assumptions）
