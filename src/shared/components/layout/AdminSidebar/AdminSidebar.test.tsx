import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const usePathname = vi.fn();

vi.mock('next/navigation', () => ({
    usePathname: () => usePathname(),
}));

import { AdminSidebar } from './AdminSidebar';

describe('AdminSidebar', () => {
    beforeEach(() => {
        usePathname.mockReset();
    });

    it('全メニュー項目をリンクとして表示する', () => {
        usePathname.mockReturnValue('/');
        render(<AdminSidebar />);

        expect(screen.getByRole('navigation', { name: '管理メニュー' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'ホーム' })).toHaveAttribute('href', '/');
        expect(screen.getByRole('link', { name: 'インポート' })).toHaveAttribute('href', '/imports');
    });

    it('トップ（/）ではホームに aria-current="page" を付ける', () => {
        usePathname.mockReturnValue('/');
        render(<AdminSidebar />);

        expect(screen.getByRole('link', { name: 'ホーム' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'インポート' })).not.toHaveAttribute('aria-current');
    });

    it('現在ページのメニューに aria-current="page" を付ける', () => {
        usePathname.mockReturnValue('/imports');
        render(<AdminSidebar />);

        expect(screen.getByRole('link', { name: 'インポート' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'ホーム' })).not.toHaveAttribute('aria-current');
    });

    it('詳細ページでは親メニューをハイライトする', () => {
        usePathname.mockReturnValue('/imports/abc-123');
        render(<AdminSidebar />);

        expect(screen.getByRole('link', { name: 'インポート' })).toHaveAttribute('aria-current', 'page');
    });

    it('折りたたみ時もラベルはアクセシブルネームとして保持される', () => {
        usePathname.mockReturnValue('/');
        render(<AdminSidebar collapsed />);

        // sr-only でもアクセシブルネームは取得できる
        expect(screen.getByRole('link', { name: 'ホーム' })).toBeInTheDocument();
    });
});
