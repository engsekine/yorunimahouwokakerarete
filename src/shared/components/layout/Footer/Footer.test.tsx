import { render, screen } from '@testing-library/react';
import { COPYRIGHT_HOLDER } from '@/shared/constants/site';
import { Footer } from './Footer';

describe('Footer', () => {
    it('フッターナビゲーションをランドマークとして公開する', () => {
        render(<Footer />);

        expect(screen.getByRole('navigation', { name: 'フッターナビゲーション' })).toBeInTheDocument();
    });

    it('基本リンクを表示する', () => {
        render(<Footer />);

        const homeLink = screen.getByRole('link', { name: 'ホーム' });
        expect(homeLink).toHaveAttribute('href', '/');
    });

    it('現在年の著作権表記を表示する', () => {
        render(<Footer />);

        const currentYear = new Date().getFullYear();
        const copyright = screen.getByText(
            new RegExp(`${currentYear}\\s+${COPYRIGHT_HOLDER}\\.\\s+All rights reserved\\.`),
        );
        expect(copyright).toBeInTheDocument();
    });
});
