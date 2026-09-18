import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SITE_NAME } from '@/shared/constants/site';

import { AdminTopBar } from './AdminTopBar';

describe('AdminTopBar', () => {
    it('サイト名・テーマ切替・サイドバートグルを表示する', () => {
        render(<AdminTopBar onToggleSidebar={vi.fn()} sidebarExpanded />);

        expect(screen.getByRole('button', { name: 'サイドバーを切り替える' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'ダークモードを切り替える' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: SITE_NAME })).toHaveAttribute('href', '/');
    });

    it('サイドバートグルの aria-expanded が状態を反映する', () => {
        const { rerender } = render(<AdminTopBar onToggleSidebar={vi.fn()} sidebarExpanded />);
        expect(screen.getByRole('button', { name: 'サイドバーを切り替える' })).toHaveAttribute('aria-expanded', 'true');

        rerender(<AdminTopBar onToggleSidebar={vi.fn()} sidebarExpanded={false} />);
        expect(screen.getByRole('button', { name: 'サイドバーを切り替える' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('トグルを押すと onToggleSidebar が呼ばれる', async () => {
        const onToggle = vi.fn();
        const user = userEvent.setup();
        render(<AdminTopBar onToggleSidebar={onToggle} sidebarExpanded />);

        await user.click(screen.getByRole('button', { name: 'サイドバーを切り替える' }));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });
});
