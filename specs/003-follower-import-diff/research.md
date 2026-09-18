# Research: フォロワーリストのインポートと差分表示 — 003-follower-import-diff

**Date**: 2026-07-17 | **Plan**: [plan.md](./plan.md)

## Decision 1: エクスポートの解析対象 — `followers_*.json` / `following.json` をファイル名パターンで探索

- **Decision**: ZIP 内を `**/followers_*.json`（分割対応）と `**/following.json` のファイル名パターンで探索して解析する（既知の標準パスは `connections/followers_and_following/`）。JSON 構造は「`string_list_data[]`（href = プロフィール URL・value = ユーザーネーム・timestamp = フォロー日時）を持つ配列」を基本とし、**素の配列（分割ファイル: followers_1.json / following_1.json 等）とキー付きオブジェクト（`relationships_followers` / `relationships_following`）の両形式**を受け付ける（エクスポートの形式ゆれ対応）。種別（フォロワー / フォロー中）は **キー付きオブジェクトなら中身のキーを最優先** で確定し（`relationships_following` が followers_1.json という名前のファイルに入っていてもフォロー中として扱う）、素の配列はファイル名（followers / following）で決める。username は `string_list_data[0].value` → `href`（`/_u/<username>` 深リンク形式対応）→ `title` の順で解決する（`value` を持たない形式ゆれ対応）。プロフィール URL は Web で開ける正規 URL を username から組み立てる。構造が一致しないファイルは対象外として無視する。
- **Rationale**: フォルダ構成は Meta 側の変更・言語差の可能性があるため、パス固定でなくパターン探索が頑健（spec Edge Case）。分割ファイル（1 万人超）は連番の全ファイルを統合する（FR-002）。
- **Alternatives considered**: パス固定 → 構成変更で全滅。HTML 形式の解析 → 構造が不安定で対象外（JSON 再エクスポート案内・FR-008）。

## Decision 2: アップロード経路 — Server Action（FormData）+ bodySizeLimit 50MB

- **Decision**: アップロードは `<form>` から Server Action `uploadImport(formData)` で受ける。`next.config.ts` の `serverActions.bodySizeLimit` を `'50mb'` に引き上げ、超過・不正はサーバー側でも検証する。
- **Rationale**: 既存の ActionResult / requireUser パターンと一貫し、クライアント実装が最小。エクスポートの followers/following 部分は数十 MB に収まるのが通例で 50MB で十分（上限は画面に明示）。
- **Alternatives considered**: Route Handler（multipart ストリーミング）→ 大容量には有利だが、本要件の上限では Server Action の単純さが勝る。Supabase Storage 経由 → ファイルの保管自体が不要（解析後は破棄する方針・Decision 6）なので過剰。

## Decision 3: ZIP 展開 — `fflate` を新規依存として採用

- **Decision**: ZIP 展開は `fflate`（zero-dependency・軽量・同期 API あり）の `unzipSync` を使い、対象 JSON のみ取り出す。
- **Rationale**: Node 標準に ZIP 展開はなく、`fflate` は最小フットプリントで実績十分。パーサ lib（純関数）内に閉じるためテスト容易。
- **Alternatives considered**: `adm-zip`（重い・メンテ頻度）、`unzipper`（ストリーム前提で過剰）。却下。

## Decision 4: 相手の同定 — ユーザーネーム基準（正規化して比較）

- **Decision**: エントリの同一性は `kind + username（小文字化・trim）` で判定する。DB にも `unique (import_id, kind, username)` を張り、同一取り込み内の重複は統合時に排除する。相手の改名は「解除 + 新規」に見える制約を差分画面に注記する（spec Edge Case / SC-002 の除外条件）。
- **Rationale**: エクスポートに安定 ID が含まれないため、ユーザーネームが唯一の識別子。Instagram のユーザーネームは大文字小文字を区別しない。
- **Alternatives considered**: プロフィール URL 基準 → URL もユーザーネーム由来で同等。href と value の不一致時は value（ユーザーネーム）を正とする。

## Decision 5: 差分・分析の導出 — 保存せず SQL の集合差で都度計算

- **Decision**: 差分（新規/解除）は隣接取り込みのエントリ集合の差（`not exists` 相殺）を SQL で都度計算する。フォロー関係分析（非相互）も同一取り込み内の kind 間集合差で導出する。差分の実体テーブルは作らない。
- **Rationale**: spec の Key Entities で「導出データ」と定義済み。保存すると削除時の再計算（FR-007）で整合性管理が複雑になる。1 万件 × 隣接 2 取り込みの集合差は `(import_id, kind, username)` の unique index で十分速い（SC-003）。
- **Alternatives considered**: 取り込み時に差分を実体化 → 削除・再取り込みで無効化が必要になり複雑。却下。

## Decision 6: アップロードファイルは保存しない — 解析結果のみ永続化

- **Decision**: アップロードされた ZIP/JSON はメモリ上で解析し、抽出したエントリだけを DB に保存する。ファイル自体はどこにも保管しない。
- **Rationale**: 第三者の公開情報を含むデータの保有を最小化（FR-011 / Assumptions のプライバシー方針）。再解析が必要ならユーザーが再アップロードすればよい。
- **Alternatives considered**: Storage に原本保管 → 保有リスクとストレージ管理が増えるだけ。却下。

## Decision 7: 原子性 — `status` 列 + 失敗時クリーンアップ

- **Decision**: `follower_imports.status`（`processing` / `completed`）を持たせ、(1) import 行を `processing` で作成 → (2) エントリをバッチ INSERT（1,000 件/回・service role）→ (3) `completed` に更新、の順で取り込む。途中失敗時は import 行を削除（エントリは FK cascade）。参照系クエリは `completed` のみを対象にする。
- **Rationale**: PostgREST 経由では複数バッチを 1 トランザクションにできないため、可視性の制御（status）+ 補償削除で FR-009 を満たす。002 の callback と同じ「中途半端な行を残さない」方針。
- **Alternatives considered**: RPC（plpgsql）で一括投入 → 1 万件の JSON 引数渡しが重く、関数管理が増える。将来スケールで再検討。

## Decision 8: アカウント名の検証 — ユーザー申告 + ベストエフォート照合（FR-010）

- **Decision**: 初回取り込み時にユーザーが自分のアカウント名を入力し、以降の取り込みで（a）入力値が前回と異なる場合、（b）ZIP 内に `personal_information.json` が含まれ、その username が登録値と異なる場合、に警告を出し、明示的な確認（チェックボックス）なしには取り込まない。
- **Rationale**: followers/following の JSON 自体には本人のアカウント名が含まれないため、完全自動の検証は不可能。申告 + 含まれる場合のみの照合が規約準拠でできる最善。
- **Alternatives considered**: 検証なし → 別人のエクスポートを混ぜる事故を防げない（spec Edge Case）。002 の接続アカウント名と照合 → 個人アカウント（未接続）で使えず本機能の前提に反する（接続済みなら参考照合として利用可・実装は任意）。

## Decision 9: 書き込み経路 — 参照は RLS（本人 select）・書き込みは service role

- **Decision**: 002 で確立した運用を踏襲する。`follower_imports` / `follower_import_entries` は RLS 有効 + 本人 select ポリシーのみ定義し、INSERT / UPDATE / DELETE は Server Actions が service role クライアント（`shared/lib/supabase/admin.ts`）で行う。GRANT は authenticated に select のみ・service_role に CRUD を明示（本プロジェクトの GRANT 運用）。
- **Rationale**: 書き込みバリデーション（サイズ・形式・所有権）をサーバーコードに集約でき、ポリシーの複雑化（entries → imports の join チェック等）を避けられる。
- **Alternatives considered**: セッションクライアント + insert ポリシー → entries のバッチ INSERT で行ごとのポリシー評価コストがかかり、所有権チェックも二重になる。却下。
