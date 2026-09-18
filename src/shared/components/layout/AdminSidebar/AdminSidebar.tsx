'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { NAV_ITEMS, resolveActiveHref } from '@/shared/config/nav';

interface AdminSidebarProps {
    /** デスクトップの折りたたみ表示（アイコンのみ） */
    collapsed?: boolean;
    /** メニュー選択時のコールバック（モバイル Sheet を閉じる用） */
    onNavigate?: () => void;
}

/**
 * 管理画面のサイドバーメニュー。
 * `usePathname` + `resolveActiveHref` で現在地を判定し `aria-current="page"` を付ける。
 * 折りたたみ時はアイコンのみ表示だが、ラベルは sr-only + aria-label で保持する。
 */
export const AdminSidebar = ({ collapsed = false, onNavigate }: AdminSidebarProps) => {
    const pathname = usePathname();
    const activeHref = resolveActiveHref(pathname);

    return (
        <nav aria-label="管理メニュー" className="flex flex-col gap-1 p-2">
            {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        {...(onNavigate ? { onClick: onNavigate } : {})}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                            isActive
                                ? 'bg-muted font-medium text-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <Icon aria-hidden="true" className="size-5 shrink-0" />
                        <span className={collapsed ? 'sr-only' : undefined}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};
