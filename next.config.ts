import type { NextConfig } from 'next';

const isProduction = process.env['NODE_ENV'] === 'production';

/**
 * script-src。'unsafe-eval' は Next.js dev（React Refresh / source map の eval）にのみ必要で、
 * 本番で許可すると CSP の XSS 緩和効果が大きく落ちるため開発時のみ付与する。
 * 'unsafe-inline' は Next.js が注入するインラインスクリプトのため現状は必要（nonce 化は今後の課題）
 */
const scriptSrc = ["'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"])].join(' ');

/**
 * 外部サービス（DB / 認証基盤）へは一切接続しない構成のため、connect-src は自オリジンのみ。
 * データはすべてブラウザの localStorage に保存する（ネットワーク送信なし）。
 * 外部の画像も表示しないため、img-src も自オリジンと data: / blob: に限定する。
 */
const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    // プラグイン埋め込み・<base> 差し替え・外部へのフォーム送信をすべて禁止する
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
    // Playwright の webServer と通常の dev サーバーが同じ .next を共有して
    // キャッシュが破損する事故を防ぐため、ビルドディレクトリを上書き可能にする
    distDir: process.env['NEXT_DIST_DIR'] ?? '.next',
    reactStrictMode: true,
    typedRoutes: true,
    typescript: {
        ignoreBuildErrors: false,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
    },

    // セキュリティヘッダー
    headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        // HTTPS → HTTP へのダウングレード時にパス・クエリ（取り込み ID 等）を外部へ送らない
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        // 利用しないブラウザ機能を明示的に無効化する（XSS 成立時の被害範囲を狭める）
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: contentSecurityPolicy,
                    },
                    // HSTS は本番のみ（ローカルは http://localhost:9323 等の平文 dev サーバーも使うため）
                    ...(isProduction
                        ? [
                              {
                                  key: 'Strict-Transport-Security',
                                  value: 'max-age=63072000; includeSubDomains',
                              },
                          ]
                        : []),
                ],
            },
        ];
    },
} as NextConfig;

export default nextConfig;
