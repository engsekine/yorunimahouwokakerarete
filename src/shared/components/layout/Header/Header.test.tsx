import { render, screen } from '@testing-library/react';
import { SITE_NAME } from '@/shared/constants/site';
import { Header } from './Header';

describe('Header', () => {
    it('ロゴをホームへのリンクとして表示する（サイト名テキストは表示しない）', () => {
        render(<Header />);

        const logoLink = screen.getByRole('link', { name: `${SITE_NAME} ホーム` });
        expect(logoLink).toHaveAttribute('href', '/');
        expect(logoLink).not.toHaveTextContent(SITE_NAME);
    });

    it('actions プロパティで渡された要素を表示する', () => {
        render(<Header actions={<button type="button">ログイン</button>} />);

        expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    });

    it('actions プロパティが無い場合はボタンを描画しない', () => {
        render(<Header />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
