import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
    it('タイトルを h1 見出しとして表示する', () => {
        render(<PageHeader title="ダッシュボード" />);
        expect(screen.getByRole('heading', { level: 1, name: 'ダッシュボード' })).toBeInTheDocument();
    });

    it('説明を指定すると表示する', () => {
        render(<PageHeader title="インポート" description="エクスポートを取り込みます" />);
        expect(screen.getByText('エクスポートを取り込みます')).toBeInTheDocument();
    });

    it('actions を右側に描画する', () => {
        render(<PageHeader title="ページ" actions={<button type="button">新規</button>} />);
        expect(screen.getByRole('button', { name: '新規' })).toBeInTheDocument();
    });
});
