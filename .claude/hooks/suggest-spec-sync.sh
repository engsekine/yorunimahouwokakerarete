#!/bin/bash
# 仕様書同期が必要なファイル編集を検知し、`/sync-spec` の実行を提案する

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Edit / Write 両方を対象（新規・既存いずれの変更でも仕様書ドリフトは発生し得る）
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
    exit 0
fi

# 仕様書同期トリガーとなるパスのパターン
# - features 配下の schemas / client / lib / constants / components
# - app 配下の page.tsx
# - shared/lib/storage（保存キー・原子性の規約）
TRIGGER_PATTERN='(src/features/[^/]+/(schemas|client|lib|constants|components)/|src/app/.+/page\.(ts|tsx)$|src/shared/lib/storage/.+\.ts$)'

if [[ ! "$FILE_PATH" =~ $TRIGGER_PATTERN ]]; then
    exit 0
fi

# テスト・story・index ファイル自身の編集は対象外（実装でも仕様書連動でもないため）
case "$FILE_PATH" in
    *.test.* | *.spec.* | *.stories.* | */index.ts | */index.tsx)
        exit 0
        ;;
esac

# specs/（spec-kit 形式の仕様書）が存在しないリポジトリでは無効化
if [[ ! -d "specs" ]]; then
    REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
    if [[ -z "$REPO_ROOT" || ! -d "$REPO_ROOT/specs" ]]; then
        exit 0
    fi
fi

# リマインダー出力（stderr に書くと system-reminder として Claude に渡る）
echo "💡 '$FILE_PATH' は仕様書同期の対象になり得るファイルです。" >&2
echo "   コミット前に \`/sync-spec\` で specs/ とのずれを確認してください。" >&2
echo "   個別チェックなら: /sync-spec $FILE_PATH" >&2
