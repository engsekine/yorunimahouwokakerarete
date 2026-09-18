# HTML コーディング規約

## セマンティクス

- 適切なセマンティック要素を使用する（`div` / `span` の乱用を避ける）
- ページ構造には `header`, `main`, `footer`, `nav`, `section`, `article`, `aside` を活用する
- 見出しは階層順に使用する（`h1` → `h2` → `h3`、飛ばし禁止）

```html
<!-- Bad -->
<div class="header">
  <div class="title">ページタイトル</div>
</div>

<!-- Good -->
<header>
  <h1>ページタイトル</h1>
</header>
```

## アクセシビリティ

- 画像には必ず `alt` 属性を設定する（装飾画像は `alt=""`）
- フォームの `input` には対応する `label` を設定する（`for` / `htmlFor` で関連付け）
- インタラクティブ要素はキーボード操作に対応させる
- カラーコントラスト比は WCAG AA 基準（4.5:1）を満たす
- `aria-*` 属性を適切に使用する

```html
<!-- Good -->
<label for="email">メールアドレス</label>
<input id="email" type="email" name="email" required>

<img src="logo.png" alt="会社ロゴ">
<img src="decoration.png" alt="">
```

## 属性の順序

属性は以下の順で記述する:

1. `id`
2. `class`
3. `name`
4. `type` / `href` / `src`
5. `for` / `value` / `placeholder`
6. `required` / `disabled` / `readonly`
7. `aria-*` / `data-*`

## インデント・フォーマット

- インデントはスペース2つ
- 属性が多い場合は折り返して1属性1行にする
- 自己終了タグは `/` を省略しない（HTML5準拠）: `<img src="...">`, `<input>`
- JSX では自己終了タグに `/` をつける: `<img src="..." />`

## パフォーマンス

- 画像には `loading="lazy"` を設定する（ファーストビュー以外）
- `<link rel="preload">` で重要なリソースを事前読み込みする
- スクリプトは `defer` または `async` を使用する

## その他

- 文字コードは `UTF-8` を指定する
- `lang` 属性をルート要素に設定する（例: `<html lang="ja">`）
- `viewport` メタタグを設定する
