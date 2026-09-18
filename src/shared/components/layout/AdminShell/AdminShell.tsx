'use client';

import { type ReactNode, useState } from 'react';

import { AdminSidebar } from '@/shared/components/layout/AdminSidebar';
import { AdminTopBar } from '@/shared/components/layout/AdminTopBar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/Sheet';
import { SITE_NAME } from '@/shared/constants/site';

/** デスクトップ折りたたみ状態を保存する Cookie 名（SSR 初期描画で読む） */
export const SIDEBAR_COOKIE = 'admin-sidebar-collapsed';

interface AdminShellProps {
    /** Cookie 由来の初期折りたたみ状態（SSR ちらつき防止） */
    defaultCollapsed: boolean;
    children: ReactNode;
}

/**
 * 管理画面シェル（左サイドバー + 上部バー + メインコンテンツ）。
 * デスクトップ: サイドバー常設 + 折りたたみ（Cookie 永続）。
 * モバイル: サイドバー非常設・上部バーのトグルで Sheet を開く。
 */
export const AdminShell = ({ defaultCollapsed, children }: AdminShellProps) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);

    /** デスクトップは折りたたみトグル + Cookie 更新、モバイルは Sheet 開閉 */
    const handleToggleSidebar = () => {
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        if (isDesktop) {
            setCollapsed((prev) => {
                const next = !prev;
                document.cookie = `${SIDEBAR_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`;
                return next;
            });
        } else {
            setMobileOpen((prev) => !prev);
        }
    };

    return (
        <div className="flex min-h-dvh flex-col">
            <AdminTopBar onToggleSidebar={handleToggleSidebar} sidebarExpanded={!collapsed || mobileOpen} />
            <div className="flex flex-1">
                {/* デスクトップ常設サイドバー */}
                <aside className={`hidden shrink-0 border-border border-r md:block ${collapsed ? 'w-16' : 'w-60'}`}>
                    <AdminSidebar collapsed={collapsed} />
                </aside>

                {/* モバイル用サイドバー（Sheet） */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="left" className="w-64 p-0">
                        {/* タイトルはサイト名のみをメニュー（先頭「ホーム」）の上に置く。右上の閉じるボタン（absolute）と重ならないよう右に余白を取り、長い名前は折り返す */}
                        <SheetHeader className="pr-12">
                            <SheetTitle className="break-all">{SITE_NAME}</SheetTitle>
                        </SheetHeader>
                        <AdminSidebar onNavigate={() => setMobileOpen(false)} />
                    </SheetContent>
                </Sheet>

                <main className="flex-1 bg-background px-4 py-8 md:px-8">{children}</main>
            </div>
        </div>
    );
};
