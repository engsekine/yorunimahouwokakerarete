import type { Metadata } from 'next';

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/shared/constants/site';

/** サイト共通の OG 画像設定 */
const OG_IMAGE = {
    url: '/og-image.png',
    type: 'image/png',
    width: 1200,
    height: 630,
} as const;

/** ルートレイアウトで使用するサイト全体の metadata */
export const SITE_METADATA: Metadata = {
    title: {
        template: `%s | ${SITE_NAME}`,
        default: SITE_NAME,
    },
    description: SITE_DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    robots: {
        index: true,
        follow: true,
        nocache: true,
        googleBot: {
            index: true,
            follow: true,
            noimageindex: true,
        },
    },
    openGraph: {
        title: {
            template: `%s | ${SITE_NAME}`,
            default: SITE_NAME,
        },
        description: SITE_DESCRIPTION,
        type: 'website',
        url: SITE_URL,
        siteName: SITE_NAME,
        images: [OG_IMAGE],
        locale: 'ja_JP',
    },
    twitter: {
        card: 'summary_large_image',
        title: {
            template: `%s | ${SITE_NAME}`,
            default: SITE_NAME,
        },
        description: SITE_DESCRIPTION,
        images: OG_IMAGE.url,
    },
    alternates: {
        canonical: '/',
    },
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon.ico',
        apple: '/favicon.ico',
    },
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
};

/** ページ単位の metadata 生成に必要な情報 */
export interface PageMetadata {
    slug: string;
    title: string;
    description: string;
    publishedTime?: string;
    modifiedTime?: string;
}

interface GeneratePageMetadataOptions {
    noIndex?: boolean;
}

/** ページ用の metadata を生成する */
export const generatePageMetadata = (page: PageMetadata, options?: GeneratePageMetadataOptions): Metadata => ({
    title: page.title,
    description: page.description,
    ...(options?.noIndex === true && {
        robots: {
            index: false,
            follow: false,
            nocache: true,
            googleBot: {
                index: false,
                follow: false,
                noimageindex: true,
            },
        },
    }),
    openGraph: {
        title: page.title,
        description: page.description,
        type: 'article',
        images: [OG_IMAGE],
        publishedTime: page.publishedTime,
        modifiedTime: page.modifiedTime,
    },
    twitter: {
        title: page.title,
        description: page.description,
        card: 'summary_large_image',
        images: OG_IMAGE.url,
    },
    alternates: {
        canonical: page.slug,
    },
});
