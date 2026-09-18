# CSS コーディング規約

## 基本方針

- スタイリングは全て Tailwind CSS で行う
- カスタム CSS ファイルの作成や `style` 属性の使用は原則禁止
- globals.css には Tailwind のインポートとカスタムプロパティ(CSS 変数)のみ記述する

## 命名規則

### クラス名

- Tailwind CSS の utility-first で記述する
- BEM やカスタムクラス名は使用しない
- キャメルケースは使用しない

```css
/* BEM */
.card {
}
.card__title {
}
.card__image {
}
.card--featured {
}

/* Tailwind は utility-first で記述 */
```

## プロパティの順序

以下の順でプロパティを記述する:

1. **レイアウト**: `display`, `position`, `top/right/bottom/left`, `z-index`, `float`
2. **ボックスモデル**: `width`, `height`, `margin`, `padding`, `border`
3. **背景・見た目**: `background`, `color`, `opacity`, `box-shadow`
4. **テキスト**: `font-*`, `line-height`, `letter-spacing`, `text-*`
5. **その他**: `cursor`, `pointer-events`, `transition`, `animation`

```css
.button {
  /* レイアウト */
  display: inline-flex;
  position: relative;
  /* ボックスモデル */
  padding: 8px 16px;
  border: 1px solid currentColor;
  border-radius: 4px;
  /* 背景 */
  background-color: #3b82f6;
  color: #ffffff;
  /* テキスト */
  font-size: 14px;
  font-weight: 600;
  /* その他 */
  cursor: pointer;
  transition: background-color 0.2s;
}
```

## 変数（カスタムプロパティ）

- カラー・スペーシング・フォントサイズは CSS カスタムプロパティで管理する
- `:root` で定義し、セマンティックな名前をつける

```css
:root {
  /* Color */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-text: #111827;
  --color-text-muted: #6b7280;

  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* Typography */
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
}
```

## レスポンシブ

- モバイルファーストで記述する（`min-width` メディアクエリを使用）
- ブレークポイントはプロジェクトで統一する

```css
/* モバイルファースト */
.container {
  padding: 16px;
}

@media (min-width: 768px) {
  .container {
    padding: 24px;
  }
}
```

## Tailwind CSS を使用する場合

- クラスの順序: レイアウト → ボックス → 背景 → テキスト → インタラクション
- 条件付きクラスは `clsx` / `cn` ユーティリティを使用する
- 長いクラスリストは複数行に分割してコメントを添える

## その他

- `!important` の使用を禁止する（サードパーティ上書き等やむを得ない場合はコメントで理由を記載）
- マジックナンバーを避け、変数・計算式を使用する
- インラインスタイルは避ける（動的な値のみ許可）
