#!/bin/bash
# 新規コンポーネント作成を検知し、テスト生成スキルの使用を提案する

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Write 操作のみ対象（Edit は既存ファイル編集なのでスキップ）
if [[ "$TOOL_NAME" != "Write" ]]; then
    exit 0
fi

# 対象パスのパターン:
#   - src/shared/components/**/*.tsx
#   - src/features/*/components/**/*.tsx
# 除外:
#   - *.test.tsx / *.stories.tsx / *.spec.tsx
#   - index.ts (re-export のみ)
#   - page.tsx / layout.tsx / loading.tsx / error.tsx / not-found.tsx (Next.js 規約ファイル)
if [[ ! "$FILE_PATH" =~ /(shared/components|features/[^/]+/components)/.+\.tsx$ ]]; then
    exit 0
fi

if [[ "$FILE_PATH" =~ \.(test|stories|spec)\.tsx$ ]]; then
    exit 0
fi

case "$(basename "$FILE_PATH")" in
    index.ts | index.tsx | page.tsx | layout.tsx | loading.tsx | error.tsx | not-found.tsx)
        exit 0
        ;;
esac

# Claude に向けたリマインダー出力（stderr に書くと system-reminder として扱われる）
echo "💡 新規コンポーネント '$FILE_PATH' が作成されました。" >&2
echo "   /generate-with-tests $FILE_PATH の実行を検討してください（Vitest / Storybook / Playwright テストを並列生成）。" >&2
