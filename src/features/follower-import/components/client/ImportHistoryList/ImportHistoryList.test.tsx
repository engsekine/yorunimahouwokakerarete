import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../DeleteImportButton', () => ({
    DeleteImportButton: ({ importId }: { importId: string }) => <button type="button">削除 {importId}</button>,
}));

import { ImportHistoryList } from './ImportHistoryList';

const imports = [
    {
        id: 'imp-2',
        accountUsername: 'yorunimahouwokakerarete_owner',
        followersCount: 4,
        followingCount: 2,
        importedAt: '2026-07-17T00:00:00+00:00',
    },
    {
        id: 'imp-1',
        accountUsername: 'yorunimahouwokakerarete_owner',
        followersCount: 3,
        followingCount: 2,
        importedAt: '2026-07-16T00:00:00+00:00',
    },
];

describe('ImportHistoryList', () => {
    it('取り込みごとに詳細へのリンクと削除ボタンをテーブル行で表示する', () => {
        render(<ImportHistoryList imports={imports} />);

        const detailLinks = screen.getAllByRole('link');
        expect(detailLinks).toHaveLength(2);
        expect(detailLinks[0]).toHaveAttribute('href', '/imports/imp-2');
        expect(screen.getByRole('button', { name: '削除 imp-2' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '削除 imp-1' })).toBeInTheDocument();
        // header + 2 データ行
        expect(screen.getAllByRole('row')).toHaveLength(3);
        expect(screen.getByRole('columnheader', { name: 'フォロワー' })).toBeInTheDocument();
    });

    it('各記録のアカウント ID を @ 付きの列で表示する（007 FR-009）', () => {
        render(<ImportHistoryList imports={imports} />);

        expect(screen.getByRole('columnheader', { name: 'アカウント ID' })).toBeInTheDocument();
        expect(screen.getAllByRole('cell', { name: '@yorunimahouwokakerarete_owner' })).toHaveLength(2);
    });

    it('取り込みが無ければ空状態の案内を表示する', () => {
        render(<ImportHistoryList imports={[]} />);

        expect(screen.getByText('まだ取り込みがありません。')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
