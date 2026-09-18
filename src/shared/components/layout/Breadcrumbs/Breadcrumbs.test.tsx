import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
    it('常に「ホーム」リンクをルートに表示する', () => {
        render(<Breadcrumbs breadcrumbs={[{ name: '現在ページ' }]} />);

        const homeLink = screen.getByRole('link', { name: 'ホーム' });
        expect(homeLink).toBeInTheDocument();
        expect(homeLink).toHaveAttribute('href', '/');
    });

    it('slug を持つ階層はリンクとしてレンダリングする', () => {
        render(<Breadcrumbs breadcrumbs={[{ name: '設定', slug: '/settings' }, { name: '会員情報の編集' }]} />);

        const settingsLink = screen.getByRole('link', { name: '設定' });
        expect(settingsLink).toHaveAttribute('href', '/settings');
    });

    it('slug を持たない最終階層は現在ページとしてレンダリングする', () => {
        render(<Breadcrumbs breadcrumbs={[{ name: '会員情報の編集' }]} />);

        const currentPage = screen.getByText('会員情報の編集');
        expect(currentPage).toHaveAttribute('aria-current', 'page');
        expect(currentPage.tagName.toLowerCase()).not.toBe('a');
    });

    it('JSON-LD 構造化データを script タグで埋め込む', () => {
        const { container } = render(<Breadcrumbs breadcrumbs={[{ name: 'プライバシーポリシー' }]} />);

        const script = container.querySelector('script[type="application/ld+json"]');
        expect(script).not.toBeNull();

        const jsonLd = JSON.parse(script?.textContent ?? '{}');
        expect(jsonLd['@type']).toBe('BreadcrumbList');
        expect(jsonLd.itemListElement).toHaveLength(2);
        expect(jsonLd.itemListElement[0].position).toBe(1);
        expect(jsonLd.itemListElement[1].name).toBe('プライバシーポリシー');
    });

    it('JSON-LD の name に </script> が含まれてもスクリプトを閉じられない（`<` をエスケープする）', () => {
        const { container } = render(<Breadcrumbs breadcrumbs={[{ name: '</script><img src=x onerror=alert(1)>' }]} />);

        const script = container.querySelector('script[type="application/ld+json"]');
        expect(script?.innerHTML).not.toContain('</script>');
        expect(script?.innerHTML).toContain('\\u003c/script>');

        /** エスケープ後も JSON として等価に復元できる */
        const jsonLd = JSON.parse(script?.innerHTML ?? '{}');
        expect(jsonLd.itemListElement[1].name).toBe('</script><img src=x onerror=alert(1)>');
    });

    it('多階層の breadcrumb を順序通りに表示する', () => {
        render(
            <Breadcrumbs
                breadcrumbs={[
                    { name: 'マイページ', slug: '/home' },
                    { name: 'フォロワー', slug: '/home/followers' },
                    { name: '推移' },
                ]}
            />,
        );

        const list = screen.getByRole('navigation', { name: 'パンくずリスト' });
        const links = list.querySelectorAll('a');
        const labels = Array.from(links).map((a) => a.textContent);

        expect(labels).toEqual(['ホーム', 'マイページ', 'フォロワー']);
        expect(screen.getByText('推移')).toHaveAttribute('aria-current', 'page');
    });
});
