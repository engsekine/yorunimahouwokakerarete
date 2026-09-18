import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { SITE_NAME } from '@/shared/constants/site';

interface HeaderProps {
    actions?: ReactNode;
}

/**
 * サイト共通ヘッダー。ロゴ（ホームへのリンク）と右側の actions のみの最小構成。
 * ナビゲーション項目はフォロワー管理機能の追加時に拡張する。
 */
export const Header = ({ actions }: HeaderProps) => {
    return (
        <header className="border-border border-b bg-background">
            <div className="flex h-14 items-center justify-between px-4">
                <Link href="/" aria-label={`${SITE_NAME} ホーム`}>
                    <Image src="/logo.png" alt="" width={80} height={40} priority className="h-10 w-auto" />
                </Link>
                <div className="flex items-center gap-2">{actions}</div>
            </div>
        </header>
    );
};
