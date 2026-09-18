# Tasks: ユーザー認証（新規登録・ログイン）— Instagram フォロワー管理アプリ初期化

**Input**: Design documents from `/specs/001-user-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, screens/, quickstart.md

**Tests**: constitution III（テストファースト）に基づきテストタスクを含む。既存コンポーネントの改修は先にテストを書き換えて fail を確認してから実装する。

**Organization**: ユーザーストーリー単位でフェーズを分割。本機能は「リセット + 認証最小化」のため、全ストーリーが依存する大規模削除を Phase 2（Foundational）に置く（research.md Decision 9 の削除順序に従う）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル・未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）

## Phase 1: Setup（ブランド初期化・ベースライン確認)

**Purpose**: コピー元リポジトリの残骸整理と、手術前のベースライン確認

- [X] T001 ルート `package.json` の `name` を `claude-settings` から `yorunimahouwokakerarete` に変更し、`workspaces` から未作成の `admin-front` を除去する（`/Users/hercules1177/Documents/github/yorunimahouwokakerarete/package.json`）
- [X] T002 [P] 旧 README のコピー `readme copy.md` を削除する（リポジトリルート）
- [X] T003 ベースライン確認: `npm install` → `npx tsc --noEmit -p service-front` → `npm run test --workspace=service-front` を実行し、削除作業前の green 状態を記録する

---

## Phase 2: Foundational（リセット: DB 再構築 + ダイビング関連の全削除）

**Purpose**: 全ストーリーが依存する土台。旧スキーマの置き換えと旧コードの削除で「まっさら + ビルド green」を作る

**⚠️ CRITICAL**: このフェーズ完了までユーザーストーリーの実装に着手しない

- [X] T004 `supabase/migrations/` の旧マイグレーション 34 本を全削除し、`supabase/seed.sql` を空にする
- [X] T005 新マイグレーション `supabase/migrations/20260716000000_create_users.sql` を data-model.md 通りに作成する（`public.users`・`handle_updated_at`・`handle_new_user`（`security definer` + `set search_path = ''` + スキーマ修飾）・RLS select/update ポリシー）
- [X] T006 `supabase db reset` を実行し、`public` スキーマに `users` テーブルのみが存在することを確認する（T004・T005 完了後）
- [X] T007 ダイビング固有 features を削除する: `service-front/src/features/{account,application-sheet,certifications,consent,contact,credits,dashboard,dive-sites,dives,guide,landing,mfa,notifications,plans,privacy-policy,regulators,shops,social,terms}/`
- [X] T008 [P] 旧 app ルートを削除する: `service-front/src/app/(authenticated)/{dives,dive-sites,plans,settings,likes,application-sheet,shops,users,notifications}/`・`(onboarding)/` 全体・`(public)/` 全体・`api/stripe/`
- [X] T009 [P] スコープ外の認証ルートを削除する: `service-front/src/app/(auth)/{reset-password,update-password}/`・`(auth)/login/verify/`
- [X] T010 `features/auth` 内のスコープ外資産を削除する: `components/client/{GoogleAuthButton,TermsAgreementField,ResetPasswordForm,UpdatePasswordForm,ProfileCompletionForm,AuthNav}/`・`schemas/{reset,profile-completion}.schema*`・`server/mappers/`、および `service-front/src/shared/stores/user-store.ts`
- [X] T011 [P] ダイビング固有の shared ユーティリティを削除する: `service-front/src/shared/lib/{tide,dive-shop-ownership,profile-path}/`。`service-front/src/shared/schemas/fields.ts` から `agreedToTermsField`・`emailOptInField` 等の不要フィールドを削除する（`emailField`・`passwordField` は残す）
- [X] T012 削除で生じた参照切れを解消する: rules/diff-scope.md のバレル名逆引きで残存 import を洗い出し、`features/auth/index.ts`・`app/layout.tsx`・`providers.tsx`・`sitemap.ts` 等を修正。`server/actions.ts` から `requestPasswordReset`・`updatePassword`・`signInWithGoogle`・`completeProfile` と対応テストを削除。`npx tsc --noEmit -p service-front` を green にする
- [X] T013 ビルドを通すための仮ページを作る: `service-front/src/app/page.tsx` を最小トップ（ログイン / 新規登録リンク）に書き換え、`(authenticated)/home/page.tsx` を仮プレースホルダーで新規作成、`(authenticated)/layout.tsx` を残存機能に合わせて簡素化する
- [X] T014 未使用依存を掃除する: `service-front/package.json` から stripe・zustand 等の未使用パッケージを除去し `npm install` で lockfile を更新する（T012・T013 完了後）
- [X] T015 チェックポイント: `npx tsc --noEmit -p service-front`・`npm run test --workspace=service-front`・`npm run build --workspace=service-front` がすべて green であること

**Checkpoint**: まっさらな土台完成 — ここからユーザーストーリー実装を開始できる

---

## Phase 3: User Story 1 - 新規登録してアプリを使い始める (Priority: P1) 🎯 MVP

**Goal**: メール + パスワードで登録 → 確認メール → `/home` 到達までの動線を成立させる

**Independent Test**: quickstart.md シナリオ 1（未登録メールで登録 → Inbucket で確認リンク → `/home` 表示）

### Tests for User Story 1（先に書いて fail を確認）

- [X] T016 [P] [US1] `service-front/src/features/auth/schemas/signup.schema.test.ts` を email + password のみの新スキーマ仕様に書き換える（12 文字未満・英大小数字欠落・72 文字超・不正メール形式の reject を含む）
- [X] T017 [P] [US1] `service-front/src/features/auth/server/actions.test.ts` の signUp テストを contracts/auth-actions.md の新契約に書き換える（metadata なし・登録済みメール（identities 空）でも success を返す enumeration 非開示挙動）

### Implementation for User Story 1

- [X] T018 [US1] `service-front/src/features/auth/schemas/signup.schema.ts` を email + password のみに簡素化する（`emailField` + `passwordField` を使用）
- [X] T019 [US1] `service-front/src/features/auth/server/actions.ts` の `signUp` を新契約に書き換える: `SignUpInput = { email, password }`・user_metadata / RPC 事前チェック除去・`emailRedirectTo = ${getSiteUrl()}/api/auth/callback?next=/home`・identities 空でも success（T016・T017 が green になること）
- [X] T020 [US1] `service-front/src/features/auth/components/client/SignupForm/SignupForm.tsx` を screens/signup.md 通りに改修する（氏名・ニックネーム・規約同意・Google 等を除去、パスワード要件ヒントを `aria-describedby` で提示、成功時 `/signup/complete` へ遷移）。同階層の `SignupForm.test.tsx`・`SignupForm.stories.tsx` を同期更新する
- [X] T021 [US1] `service-front/src/app/(auth)/signup/page.tsx` を新 SignupForm 構成・`generatePageMetadata` で調整する
- [X] T022 [US1] 確認メール送信案内は `/signup/complete` ページではなく SignupForm 内の完了ビューで表示する（設計変更: メールアドレスを URL に載せず再送導線に渡すため。`ResendConfirmationButton` を同梱）
- [X] T023 [US1] `service-front/src/app/api/auth/callback/route.ts` を確認する: `next` 既定を `/home` に、コード交換失敗時は `/login`（エラー付き）へリダイレクトさせる（contracts/routes.md）
- [X] T024 [US1] チェックポイント: quickstart.md シナリオ 1 を手動実行し、登録 → 確認メール → `/home` 到達と入力バリデーションエラー表示を確認する

**Checkpoint**: 新規登録が単独で end-to-end 動作する（MVP）

---

## Phase 4: User Story 2 - 登録済みユーザーがログインする (Priority: P1)

**Goal**: ログイン・セッション維持・ログアウトと、ホーム画面での本人表示を成立させる

**Independent Test**: quickstart.md シナリオ 2（登録済みアカウントでログイン → `/home` → 再訪維持 → ログアウト）

### Tests for User Story 2（先に書いて fail を確認）

- [X] T025 [P] [US2] `service-front/src/features/auth/server/actions.test.ts` の signIn / signOut テストを新契約に更新する（失敗時の非特定文言・メール未確認分岐・signOut 後 `/login` リダイレクト）

### Implementation for User Story 2

- [X] T026 [US2] `service-front/src/features/auth/server/actions.ts` の `signIn` から MFA（verify 遷移）分岐を除去し、メール未確認エラー分岐と非特定エラー文言（「メールアドレスまたはパスワードが正しくありません」）を維持する。`signOut` はセッション破棄後 `/login` へ redirect する
- [X] T027 [US2] `service-front/src/features/auth/components/client/LoginForm/LoginForm.tsx` を screens/login.md 通りに改修する（成功時 `/home` へ遷移・`/login/verify` 遷移の除去・エラーは `role="alert"`・未確認時は `ResendConfirmationButton` 表示）。同階層の `LoginForm.test.tsx`・`LoginForm.stories.tsx` を同期更新する
- [X] T028 [US2] `service-front/src/app/(auth)/login/page.tsx` を新 LoginForm 構成・`generatePageMetadata` で調整する
- [X] T029 [US2] `service-front/src/features/auth/components/client/LogoutButton/` を新規作成する（`LogoutButton.tsx` + `index.ts`、`signOut` Server Action を `useTransition` で呼ぶ）。作成後に `/generate-with-tests <LogoutButton.tsx の絶対パス>` でテスト・story・a11y テストを生成する
- [X] T030 [US2] `service-front/src/app/(authenticated)/home/page.tsx` を screens/home.md 通りに本実装する（`supabase.auth.getUser()` でメールアドレス表示 + `LogoutButton`・`Heading` 使用・`generatePageMetadata`）
- [X] T031 [US2] チェックポイント: quickstart.md シナリオ 2 を手動実行する（ログイン成功 / 失敗文言 / ブラウザ再訪の維持 / ログアウト）

**Checkpoint**: US1 + US2 で認証の基本動線が完成

---

## Phase 5: User Story 3 - 未ログインユーザーのアクセス制御 (Priority: P2)

**Goal**: 保護ルートとゲスト専用ルートの双方向リダイレクトを 1 箇所で保証する

**Independent Test**: quickstart.md シナリオ 3（シークレットウィンドウで `/home` 直打ち → `/login`、ログイン済みで `/login` → `/home`）

### Implementation for User Story 3

- [X] T032 [US3] `service-front/src/proxy.ts` を contracts/routes.md 通りに刷新する: `APP_ROUTE_PREFIXES = ['/home']`・`AUTH_ROUTES = ['/login', '/signup']`・トップ `/` は公開（認証必須判定から除外）。既存のコメント・matcher は残存構成に合わせて整理する
- [X] T033 [US3] `service-front/src/app/(authenticated)/layout.tsx` に `supabase.auth.getUser()` による二重防御ガード（未ログインなら `redirect('/login')`）を実装する
- [X] T034 [US3] チェックポイント: quickstart.md シナリオ 3 を手動実行する（未ログイン直打ち・ログイン済みの認証画面アクセス・セッション破棄後の保護画面）

**Checkpoint**: FR-007 / SC-004（保護漏れ 0 件）を満たす

---

## Phase 6: User Story 4 - 旧アプリの痕跡が存在しない (Priority: P2)

**Goal**: 画面文言・設定・ドキュメントを 本アプリに統一し、ダイビング関連の残存 0 件を検証する

**Independent Test**: quickstart.md シナリオ 4（grep sweep 0 件 + 旧 URL 404 + DB スキーマ最小）

### Implementation for User Story 4

- [X] T035 [P] [US4] `service-front/src/shared/config/metadata.ts` のサイト名・説明を「yorunimahouwokakerarete — Instagram フォロワー管理アプリ」に変更する
- [X] T036 [P] [US4] `service-front/src/app/page.tsx` のトップページを本実装する（本アプリの紹介文 + ログイン / 新規登録導線・`Heading` 使用・screens 準拠の a11y）
- [X] T037 [P] [US4] `README.md` を yorunimahouwokakerarete（モノレポ構成・セットアップ手順は quickstart.md 参照）として書き換える
- [X] T038 [US4] 残存語彙の全域 sweep: `grep -riE "ダイビング|dive|diving|器材|レギュレータ" service-front/src supabase packages --include="*.{ts,tsx,sql,json,css}"` で検出された残存（`globals.css`・`sitemap.ts`・`error.tsx`・`not-found.tsx`・`cspell.json` の固有語彙等）をすべて修正する（T035〜T037 完了後）
- [X] T039 [US4] チェックポイント: quickstart.md シナリオ 4 を実行する（grep 0 件・旧 URL `/dives` 等が 404・`supabase db reset` 後のテーブルが `users` のみ）

**Checkpoint**: SC-003（旧痕跡 0 件）を満たし、全ストーリー完成

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 品質ゲートの一括通過と横断的な仕上げ

- [X] T040 [P] Playwright + axe-core の a11y テストを新画面構成（`/`・`/login`・`/signup`・`/signup/complete`・`/home`）に合わせて更新・追加し、違反 0 件にする（SC-005。既存 e2e 設定は `service-front` 内の Playwright 構成に従う）
- [X] T041 [P] `.claude/rules/folder-structure.md` 等の配置例に含まれる削除済みパス参照（`DiveSearchBar` 等)を現存する例に差し替える
- [X] T042 `npx biome check --write .` を実行し、残エラーを手動修正して lint / format を green にする
- [X] T043 quickstart.md の全シナリオ（1〜5）を通しで実行し、SC-001〜SC-005 の達成を確認する
- [X] T044 `/sync-spec` を実行して実装と specs/001-user-auth の整合を最終確認する。constitution のプロダクト名改定（`/speckit-constitution`）をフォローアップとしてユーザーに提案する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1（Setup）**: 依存なし・即開始可能
- **Phase 2（Foundational）**: Phase 1 完了後。**全ユーザーストーリーをブロック**する
- **Phase 3（US1）**: Phase 2 完了後
- **Phase 4（US2）**: Phase 2 完了後（US1 と独立。ただし `actions.test.ts` を共有するため T017 と T025 は同一ファイルの逐次編集）
- **Phase 5（US3）**: Phase 2 完了後（検証には US2 のログイン動線があると効率的）
- **Phase 6（US4）**: T038 の sweep は Phase 3〜5 の改修完了後が効率的（改修前コードへの指摘を避ける）。T035〜T037 は Phase 2 完了後いつでも可
- **Phase 7（Polish）**: 全ストーリー完了後

### Task-level Dependencies（主要なもの）

- T006 ← T004, T005 / T012 ← T007〜T011 / T013 ← T008, T009 / T014, T015 ← T012, T013
- T019 ← T016, T017（テスト先行）/ T020 ← T018, T019 / T022 ← T020（ResendConfirmationButton の残存確認）
- T026 ← T025 / T030 ← T029 / T038 ← T035, T036, T037

### Parallel Opportunities

- Phase 1: T002 は T001 と並列可
- Phase 2: T008・T009・T011 は T007 と並列可（別ディレクトリの削除）
- Phase 3: T016・T017 は並列可（別ファイルのテスト）
- Phase 6: T035・T036・T037 は並列可
- Phase 7: T040・T041 は並列可

## Parallel Example: User Story 1

```bash
# テストを並列で書き換え（fail 確認まで）:
Task: "signup.schema.test.ts を新スキーマ仕様に書き換え"   # T016
Task: "actions.test.ts の signUp テストを新契約に書き換え"  # T017

# その後 T018 → T019 → T020 → T021/T022 → T023 を順次実施
```

---

## Implementation Strategy

### MVP First（Phase 1 → 2 → 3）

1. Setup + Foundational でまっさらな土台（build green）を作る
2. US1（新規登録）を完成させ、quickstart シナリオ 1 で単独検証 → **MVP**
3. 以降 US2 → US3 → US4 を priority 順に積み増す

### Incremental Delivery

各フェーズ末尾のチェックポイントで `tsc / vitest / build` を回し、green を維持したままコミットする（コミットメッセージは Conventional Commits: Phase 2 は `refactor:`・`chore:`、Phase 3〜6 は `feat:`・`test:`）。

### Notes

- Phase 2 の削除は「削除 → 逆引きで参照修正 → typecheck」の順を厳守する（research.md Decision 9）。一括削除して壊れた所を直す方式は取らない
- `actions.ts` / `actions.test.ts` は US1・US2 で共有するため、同時並行編集を避ける
- 各ユーザーストーリーはチェックポイントで独立検証できる
