import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import { SITE_METADATA } from '@/shared/config/metadata';

import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
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
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
