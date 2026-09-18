# アクセシビリティ コーディング規約

## 基本原則

**WCAG 2.1 レベルAA 準拠を目指す**

アクセシビリティの4つの原則（POUR）:
1. **Perceivable（知覚可能）**: 情報とUIコンポーネントは、ユーザーが知覚できる方法で提示する
2. **Operable（操作可能）**: UIコンポーネントとナビゲーションは操作可能である
3. **Understandable（理解可能）**: 情報とUIの操作は理解可能である
4. **Robust（堅牢）**: コンテンツは、支援技術を含む様々なユーザーエージェントで解釈できる

## セマンティックHTML

### 適切な要素を使用する

```html
<!-- 悪い例 -->
<div onclick="handleClick()">クリック</div>
<span class="heading">タイトル</span>

<!-- 良い例 -->
<button onClick={handleClick}>クリック</button>
<h1>タイトル</h1>
```

### ランドマーク要素を活用する

```html
<header>
  <nav aria-label="メインナビゲーション">
    <!-- ナビゲーションコンテンツ -->
  </nav>
</header>

<main>
  <article>
    <h1>記事タイトル</h1>
    <!-- 記事コンテンツ -->
  </article>

  <aside aria-label="関連情報">
    <!-- サイドバー -->
  </aside>
</main>

<footer>
  <!-- フッターコンテンツ -->
</footer>
```

### 見出しの階層構造

```html
<!-- 悪い例（階層を飛ばす） -->
<h1>ページタイトル</h1>
<h3>サブセクション</h3>

<!-- 良い例 -->
<h1>ページタイトル</h1>
<h2>メインセクション</h2>
<h3>サブセクション</h3>
```

## キーボード操作

### フォーカス管理

```tsx
// 良い例: カスタムボタンコンポーネント
interface CustomButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const CustomButton = ({ onClick, children, disabled }: CustomButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </button>
  );
};
```

### タブオーダー

```html
<!-- 悪い例（tabindex > 0 を使用） -->
<input tabindex="3">
<input tabindex="1">
<input tabindex="2">

<!-- 良い例（自然なDOM順序を使用） -->
<input>
<input>
<input>

<!-- tabindex="-1" はプログラムからのフォーカスのみ許可 -->
<div tabindex="-1" id="error-message">エラーメッセージ</div>
```

### スキップリンク

```html
<!-- ページの先頭に配置 -->
<a href="#main-content" class="skip-link">
  メインコンテンツへスキップ
</a>

<nav>
  <!-- ナビゲーション -->
</nav>

<main id="main-content">
  <!-- メインコンテンツ -->
</main>
```

```css
/* スキップリンクのスタイル */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

## ARIA（Accessible Rich Internet Applications）

### ARIAの使用原則

1. **可能な限りネイティブHTMLを使用する**
2. **ARIAで機能を変更しない** - `role` を変更してもキーボード動作は変わらない
3. **すべてのインタラクティブ要素はアクセシブルな名前を持つ**
4. **すべてのインタラクティブ要素はフォーカス可能**
5. **フォーカス可能な要素には適切な role がある**

### よく使うARIA属性

```tsx
// aria-label: 要素のラベル
<button aria-label="閉じる">
  <CloseIcon />
</button>

// aria-labelledby: 他の要素をラベルとして参照
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">確認</h2>
  <!-- ダイアログコンテンツ -->
</div>

// aria-describedby: 追加の説明
<input
  type="email"
  aria-describedby="email-hint"
  aria-invalid={hasError}
/>
<span id="email-hint">example@domain.com の形式で入力してください</span>

// aria-expanded: 展開状態
<button
  aria-expanded={isOpen}
  aria-controls="menu"
  onClick={toggleMenu}
>
  メニュー
</button>
<ul id="menu" hidden={!isOpen}>
  {/* メニュー項目 */}
</ul>

// aria-hidden: スクリーンリーダーから隠す
<span aria-hidden="true">🎉</span>
<span className="sr-only">お祝い</span>

// aria-live: 動的コンテンツの通知
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// aria-current: 現在のページ/ステップ
<nav>
  <a href="/home" aria-current="page">ホーム</a>
  <a href="/about">About</a>
</nav>
```

### ARIAロール

```tsx
// リスト
<div role="list">
  <div role="listitem">項目1</div>
  <div role="listitem">項目2</div>
</div>

// タブパネル
<div role="tablist">
  <button role="tab" aria-selected={activeTab === 0} aria-controls="panel-0">
    タブ1
  </button>
  <button role="tab" aria-selected={activeTab === 1} aria-controls="panel-1">
    タブ2
  </button>
</div>
<div role="tabpanel" id="panel-0" hidden={activeTab !== 0}>
  {/* パネル1の内容 */}
</div>
<div role="tabpanel" id="panel-1" hidden={activeTab !== 1}>
  {/* パネル2の内容 */}
</div>

// アラート
<div role="alert">
  エラーが発生しました
</div>

// ステータス（aria-live="polite"と同等）
<div role="status">
  読み込み中...
</div>
```

## フォーム

### ラベルと入力フィールド

```tsx
// 良い例1: label の for 属性
<label htmlFor="username">ユーザー名</label>
<input id="username" type="text" name="username" />

// 良い例2: label で囲む
<label>
  メールアドレス
  <input type="email" name="email" />
</label>

// 良い例3: aria-labelで補完
<input
  type="search"
  aria-label="サイト内検索"
  placeholder="検索..."
/>
```

### エラーメッセージ

```tsx
interface FormFieldProps {
  label: string;
  error?: string;
  id: string;
}

export const FormField = ({ label, error, id }: FormFieldProps) => {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
```

### 必須フィールド

```html
<!-- 良い例 -->
<label for="email">
  メールアドレス
  <span aria-label="必須">*</span>
</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
/>
```

## 画像とメディア

### 画像のalt属性

```html
<!-- 意味のある画像 -->
<img src="chart.png" alt="2024年の売上推移グラフ。1月から12月にかけて右肩上がり" />

<!-- 装飾的な画像 -->
<img src="decoration.png" alt="" />

<!-- 複雑な情報を含む画像 -->
<figure>
  <img src="complex-diagram.png" alt="システムアーキテクチャ図" />
  <figcaption>
    詳細な説明: クライアント層、アプリケーション層、データベース層の3層構造...
  </figcaption>
</figure>

<!-- アイコンボタン -->
<button aria-label="設定">
  <img src="settings-icon.svg" alt="" aria-hidden="true" />
</button>
```

### 動画

```html
<video controls>
  <source src="video.mp4" type="video/mp4" />
  <track kind="captions" src="captions.vtt" srclang="ja" label="日本語字幕" />
  <track kind="descriptions" src="descriptions.vtt" srclang="ja" label="音声解説" />
  お使いのブラウザは動画タグをサポートしていません。
</video>
```

## カラーとコントラスト

### コントラスト比の基準

- **通常テキスト**: 4.5:1 以上（WCAG AA）/ 7:1 以上（WCAG AAA）
- **大きいテキスト**（18pt以上または14pt太字以上）: 3:1 以上（WCAG AA）/ 4.5:1 以上（WCAG AAA）
- **UIコンポーネント**: 3:1 以上

```css
/* 悪い例 */
.text {
  color: #777;  /* グレー */
  background: #fff;  /* 白 - コントラスト比 4.47:1（ギリギリ） */
}

/* 良い例 */
.text {
  color: #595959;  /* ダークグレー */
  background: #fff;  /* 白 - コントラスト比 7.0:1（AAA基準） */
}

/* フォーカスインジケーター */
button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### 色だけに依存しない

```tsx
// 悪い例
<span style={{ color: 'red' }}>エラー</span>
<span style={{ color: 'green' }}>成功</span>

// 良い例
<span className="error">
  <ErrorIcon aria-hidden="true" />
  エラー
</span>
<span className="success">
  <SuccessIcon aria-hidden="true" />
  成功
</span>
```

## インタラクティブコンポーネント

### モーダルダイアログ

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // モーダルを開いたときに最初の要素にフォーカス
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    // Escキーで閉じる
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
    >
      <h2 id="modal-title">{title}</h2>
      <div>{children}</div>
      <button onClick={onClose}>閉じる</button>
    </div>
  );
};
```

### ドロップダウンメニュー

```tsx
export const Dropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        メニュー
      </button>
      {isOpen && (
        <ul role="menu">
          <li role="menuitem">
            <button onClick={() => console.log('項目1')}>項目1</button>
          </li>
          <li role="menuitem">
            <button onClick={() => console.log('項目2')}>項目2</button>
          </li>
        </ul>
      )}
    </div>
  );
};
```

### トグルスイッチ

```tsx
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const Toggle = ({ checked, onChange, label }: ToggleProps) => {
  return (
    <label>
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="toggle-button"
      >
        <span className="sr-only">{checked ? 'オン' : 'オフ'}</span>
      </button>
    </label>
  );
};
```

## レスポンシブとモバイル

### ビューポート

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```

### タッチターゲットサイズ

```css
/* 最小44×44pxのタッチターゲット */
button,
a {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}
```

### レスポンシブテキスト

```css
/* rem単位を使用 */
body {
  font-size: 16px;  /* ベースサイズ */
}

h1 {
  font-size: 2rem;  /* 32px */
}

/* ユーザーのフォントサイズ設定を尊重 */
/* font-size: 16px; の代わりに rem を使用 */
```

## スクリーンリーダー対応

### スクリーンリーダー専用テキスト

```css
/* スクリーンリーダーのみに表示 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* フォーカス時には表示 */
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### aria-live領域

```tsx
// 通知コンポーネント
export const Notification = ({ message }: { message: string }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
};

// 緊急の通知
export const Alert = ({ message }: { message: string }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {message}
    </div>
  );
};
```

## アニメーションと動き

### prefers-reduced-motion

```css
/* アニメーションを追加 */
.element {
  transition: transform 0.3s ease;
}

/* ユーザーが動きを減らす設定をしている場合は無効化 */
@media (prefers-reduced-motion: reduce) {
  .element {
    transition: none;
  }
}
```

### 自動再生の制御

```tsx
// 動画の自動再生は避ける。または一時停止ボタンを提供
<video controls autoplay={false}>
  <source src="video.mp4" />
</video>
```

## テストとチェックリスト

### 手動テスト

- [ ] キーボードのみですべての機能が使えるか
- [ ] Tabキーでフォーカスが論理的な順序で移動するか
- [ ] フォーカスインジケーターが明確に表示されるか
- [ ] スクリーンリーダー（NVDA, JAWS, VoiceOver）で操作できるか
- [ ] 200%までズームしても情報が失われないか
- [ ] カラーコントラストが基準を満たしているか

### 自動テストツール

```bash
# axe-core を使用した自動テスト
npm install --save-dev @axe-core/react

# jest-axe でユニットテスト
npm install --save-dev jest-axe
```

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 推奨ツール

- **axe DevTools**: ブラウザ拡張機能
- **Lighthouse**: Chrome DevTools
- **WAVE**: Webアクセシビリティ評価ツール
- **Pa11y**: コマンドラインツール
- **Storybook addon-a11y**: Storybookアドオン

## 参考リンク

- [WCAG 2.1 (日本語訳)](https://waic.jp/docs/WCAG21/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Web Accessibility](https://developer.mozilla.org/ja/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
