import type { ReactNode } from 'react';

import { Footer } from '@/shared/components/layout/Footer';
import { Header } from '@/shared/components/layout/Header';
import { ThemeToggle } from '@/shared/components/theme/ThemeToggle';

interface PublicShellProps {
    children: ReactNode;
}

/**
 * 公開領域（トップ・ログイン・新規登録）の枠。
 * 管理画面シェル（AdminShell）とは別に、Header + Footer の従来レイアウトを提供する。
 */
export const PublicShell = ({ children }: PublicShellProps) => (
    <div className="flex min-h-dvh flex-col">
        <Header actions={<ThemeToggle />} />
        <main className="flex flex-1 justify-center bg-background">{children}</main>
        <Footer />
    </div>
);
