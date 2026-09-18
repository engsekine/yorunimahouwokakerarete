#!/bin/bash
# 既存コンポーネントの編集を検知し、関連テスト・story の更新を提案する

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Edit 操作のみ対象（Write は新規作成扱いなので suggest-test-gen.sh に任せる）
if [[ "$TOOL_NAME" != "Edit" ]]; then
    exit 0
fi

# 対象パスのパターン:
#   - src/shared/components/**/*.tsx
#   - src/features/*/components/**/*.tsx
if [[ ! "$FILE_PATH" =~ /(shared/components|features/[^/]+/components)/.+\.tsx$ ]]; then
    exit 0
fi

# テスト・story ファイル自身の編集は対象外
if [[ "$FILE_PATH" =~ \.(test|stories|spec)\.tsx$ ]]; then
    exit 0
fi

# Next.js 規約ファイル / 再 export はスキップ
case "$(basename "$FILE_PATH")" in
    index.ts | index.tsx | page.tsx | layout.tsx | loading.tsx | error.tsx | not-found.tsx)
        exit 0
        ;;
esac

# 同階層に既存テスト・story があるか確認し、見つかったものだけ報告対象にする
DIR=$(dirname "$FILE_PATH")
BASENAME=$(basename "$FILE_PATH" .tsx)
FOUND=()

for ext in test.tsx test.ts spec.tsx spec.ts stories.tsx; do
    CANDIDATE="$DIR/$BASENAME.$ext"
    if [[ -f "$CANDIDATE" ]]; then
        FOUND+=("$CANDIDATE")
    fi
done

# 既存テスト類が無ければ「テスト未生成」のサインなので suggest-test-gen 側で扱う
if [[ ${#FOUND[@]} -eq 0 ]]; then
    exit 0
fi

# リマインダー出力（stderr に書くと system-reminder として Claude に渡る）
echo "💡 コンポーネント '$FILE_PATH' が編集されました。" >&2
echo "   以下の既存テスト・story の更新が必要か確認してください:" >&2
for f in "${FOUND[@]}"; do
    echo "   - $f" >&2
done
echo "   影響範囲が小さい場合は Read + Edit で直接修正、大きい場合は /generate-with-tests $FILE_PATH も検討。" >&2
