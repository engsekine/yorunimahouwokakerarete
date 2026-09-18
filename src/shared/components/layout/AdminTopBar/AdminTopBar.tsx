'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';

import { ThemeToggle } from '@/shared/components/theme/ThemeToggle';
import { SITE_NAME } from '@/shared/constants/site';

interface AdminTopBarProps {
    /** サイドバーの開閉/折りたたみトグル */
    onToggleSidebar: () => void;
    /** サイドバーが開いているか（aria-expanded 用） */
    sidebarExpanded: boolean;
}

/**
 * 管理画面の上部バー。サイドバートグル・サイト名・テーマ切替。
 * ログインを持たない構成のため、ユーザー表示・ログアウト導線は置かない
 */
export const AdminTopBar = ({ onToggleSidebar, sidebarExpanded }: AdminTopBarProps) => (
    <header className="flex h-14 items-center justify-between gap-4 border-border border-b bg-background px-4">
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={onToggleSidebar}
                aria-label="サイドバーを切り替える"
                aria-expanded={sidebarExpanded}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
                <Menu aria-hidden="true" className="size-5" />
            </button>
            <Link href="/" className="font-bold text-lg">
                {SITE_NAME}
            </Link>
        </div>
        <div className="flex items-center gap-3">
            <ThemeToggle />
        </div>
    </header>
);
