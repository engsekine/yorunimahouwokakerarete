import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
    usePathname: () => '/',
}));

import { AdminShell, SIDEBAR_COOKIE } from './AdminShell';

const setViewport = (isDesktop: boolean) => {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: isDesktop,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
    }));
};

describe('AdminShell', () => {
    beforeEach(() => {
        document.cookie = `${SIDEBAR_COOKIE}=; path=/; max-age=0`;
    });

    it('上部バー・サイドバー・メインコンテンツを表示する', () => {
        setViewport(true);
        render(
            <AdminShell defaultCollapsed={false}>
                <p>ページ本文</p>
            </AdminShell>,
        );

        expect(screen.getByRole('banner')).toBeInTheDocument(); // AdminTopBar header
        expect(screen.getByRole('navigation', { name: '管理メニュー' })).toBeInTheDocument();
        expect(screen.getByRole('main')).toHaveTextContent('ページ本文');
    });

    it('デスクトップでトグルを押すと折りたたみ状態が Cookie に保存される', async () => {
        setViewport(true);
        const user = userEvent.setup();
        render(
            <AdminShell defaultCollapsed={false}>
                <p>本文</p>
            </AdminShell>,
        );

        await user.click(screen.getByRole('button', { name: 'サイドバーを切り替える' }));

        expect(document.cookie).toContain(`${SIDEBAR_COOKIE}=1`);
    });

    it('defaultCollapsed=true でも children（main）を描画する', () => {
        setViewport(true);
        render(
            <AdminShell defaultCollapsed>
                <p>折りたたみ本文</p>
            </AdminShell>,
        );
        expect(screen.getByRole('main')).toHaveTextContent('折りたたみ本文');
    });
});
