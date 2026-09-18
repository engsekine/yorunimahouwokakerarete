import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
    it('children を表示する', () => {
        render(<Card>本文</Card>);
        expect(screen.getByText('本文')).toBeInTheDocument();
    });

    it('title を指定すると h2 見出しを表示する', () => {
        render(<Card title="接続情報">本文</Card>);
        expect(screen.getByRole('heading', { level: 2, name: '接続情報' })).toBeInTheDocument();
    });

    it('title 未指定なら見出しを描画しない', () => {
        render(<Card>本文</Card>);
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('actions を描画する', () => {
        render(
            <Card title="一覧" actions={<button type="button">更新</button>}>
                本文
            </Card>,
        );
        expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
    });
});
