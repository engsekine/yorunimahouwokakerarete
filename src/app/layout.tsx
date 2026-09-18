import { Geist_Mono, Noto_Sans_JP } from 'next/font/google';
import Script from 'next/script';

import { SITE_METADATA } from '@/shared/config/metadata';

import './globals.css';
import { Providers } from './providers';

/**
 * 本文フォント。Noto Sans JP は可変フォントのため weight 指定は不要。
 * `subsets` は preload 対象の指定で、日本語グリフは Google Fonts 側の unicode-range 分割により
 * 必要な範囲だけ遅延取得される（next/font がセルフホストする）。
 * CSS 変数は theme.css の `--font-sans` から参照する
 */
const notoSansJp = Noto_Sans_JP({
    variable: '--font-noto-sans-jp',
    subsets: ['latin'],
    display: 'swap',
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata = SITE_METADATA;

/**
 * ルートレイアウト。共通の枠（Header/Footer や AdminShell）は各領域のレイアウトに委ねる
 * （公開領域 = Header/Footer、認証領域 = AdminShell）。ここでは html/body と
 * Providers・テーマ初期化スクリプトのみを提供する。
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="ja"
            suppressHydrationWarning
            className={`${notoSansJp.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full">
                <Script id="theme-init" strategy="beforeInteractive">
                    {`(function () {
                        try {
                            var saved = localStorage.getItem('theme');
                            var prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
                            if (saved === 'dark' || (!saved && prefersDark)) document.documentElement.classList.add('dark');
                        } catch (e) {}
                    })();`}
                </Script>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
