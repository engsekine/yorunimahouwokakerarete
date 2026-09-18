/** http / https のスキームで始まるか */
const hasHttpScheme = (value: string): boolean => /^https?:\/\//i.test(value);

/** 何らかのスキーム（`ftp://` 等）で始まるか。http(s) 以外は補完せず不正扱いにするための判定 */
const hasAnyScheme = (value: string): boolean => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);

/**
 * サイト URL の環境変数を、必ず有効なオリジン（`https://example.com` の形）に正規化する。
 *
 * - 未設定・空・URL として不正な値は例外を投げず `fallback` を返す
 * - `example.vercel.app` のようにスキームが無い値には `https://` を補う
 * - 末尾のスラッシュやパスは取り除きオリジンだけにする
 *
 * `new URL(process.env.NEXT_PUBLIC_SITE_URL)` を直接呼ぶと、デプロイ先で値がドメインだけだった場合に
 * `TypeError: Invalid URL` でビルドが落ちるため、metadata / sitemap の起点はこの関数を通す
 */
export const normalizeSiteUrl = (value: string | undefined, fallback: string): string => {
    const trimmed = value?.trim() ?? '';
    if (trimmed === '') return fallback;

    if (hasAnyScheme(trimmed) && !hasHttpScheme(trimmed)) return fallback;
    const withScheme = hasHttpScheme(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(withScheme);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;
        if (url.hostname === '') return fallback;
        return url.origin;
    } catch {
        return fallback;
    }
};
