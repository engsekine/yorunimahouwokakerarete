# TypeScript コーディング規約

## 型定義

- `any` の使用を禁止する（`unknown` を使用する）
- 型推論できる場合は型注釈を省略してよい
- オブジェクト型は `interface` を基本とし、ユニオン型・交差型には `type` を使用する
- 型名はPascalCase（例: `UserData`, `ApiResponse`）

```typescript
// Bad
const fetchUser = async (id: any): Promise<any> => { ... };

// Good
const fetchUser = async (id: string): Promise<User> => { ... };
```

## null / undefined 安全性

- `strictNullChecks: true` を前提とする
- Optional Chaining (`?.`) と Nullish Coalescing (`??`) を積極的に使用する
- 非nullアサーション (`!`) の使用は最小限にする

```typescript
// Good
const name = user?.profile?.name ?? '名無し';
```

## 非同期処理

- `Promise` より `async/await` を優先する
- エラーハンドリングは `try/catch` で行う
- 並列処理が可能な場合は `Promise.all` を使用する

## Enum / Union型

- 文字列 Enum より Union型を優先する

```typescript
// Union型（推奨）
type Status = 'pending' | 'active' | 'inactive';

// Enum（必要な場合のみ）
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
}
```

## 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| 変数・関数 | camelCase | `getUserName` |
| クラス・型・インターフェース | PascalCase | `UserService` |
| 定数（イミュータブル） | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| プライベートメンバー | `_` プレフィックス | `_cache` |

## インポート

- インポートは以下の順に並べる（空行で区切る）:
  1. 外部ライブラリ
  2. 内部モジュール（絶対パス）
  3. 相対パス

```typescript
import React from 'react';
import { z } from 'zod';

import { UserService } from '@/services/user';

import { formatDate } from './utils';
```

## 宣言的なコードスタイル

- 手続き的なループより配列メソッド（`map` / `filter` / `reduce` / `find`）を優先する
- 条件分岐は早期リターンで深いネストを避ける
- ガード節（早期リターン）は1行形式で書く。ただし条件の中に複数処理がある場合はブロック形式にする
- 状態の変更より新しい値の生成を優先する（イミュータブル操作）

```typescript
// Bad: 手続き的
const result: string[] = [];
for (let i = 0; i < items.length; i++) {
  if (items[i].active) {
    result.push(items[i].name);
  }
}

// Good: 宣言的
const result = items.filter((item) => item.active).map((item) => item.name);
```

```typescript
// Bad: 深いネスト
const getLabel = (user: User) => {
  if (user) {
    if (user.role === 'admin') {
      return 'Admin';
    } else {
      return 'User';
    }
  } else {
    return 'Guest';
  }
};

// Good: 早期リターン（ガード節は1行形式）
const getLabel = (user: User | null): string => {
  if (!user) return 'Guest';
  if (user.role === 'admin') return 'Admin';
  return 'User';
};
```

```typescript
// Bad: 直接変更
const addItem = (items: Item[], newItem: Item) => {
  items.push(newItem);
  return items;
};

// Good: 新しい配列を生成
const addItem = (items: Item[], newItem: Item): Item[] => [...items, newItem];
```

## その他

- `console.log` は本番コードに残さない（`console.error` / `console.warn` は許可）
- `for...of` を優先し、インデックスループを避ける
- オブジェクトの分割代入を活用する
