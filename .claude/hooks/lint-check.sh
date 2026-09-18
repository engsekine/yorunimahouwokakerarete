#!/bin/bash
# Edit/Write 時の Lint チェック（リポジトリ root の biome を使用）

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# TypeScript / TSX / JSX のみ対象
if [[ "$FILE_PATH" =~ \.(ts|tsx|jsx)$ ]] && [[ -f "$FILE_PATH" ]]; then
    echo "🔍 Running biome lint on $FILE_PATH..."
    if ! npx biome lint "$FILE_PATH" 2>/dev/null; then
        echo "⚠️  Lint warnings found in $FILE_PATH (proceeding anyway)"
    fi
fi
