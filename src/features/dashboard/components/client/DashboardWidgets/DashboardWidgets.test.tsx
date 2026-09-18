import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLatestComparisonSummary, listImports } from '@/features/follower-import/client/queries';
import { renderWithQueryClient } from '@/shared/lib/test-utils';

import { DashboardWidgets } from './DashboardWidgets';

vi.mock('@/features/follower-import/client/queries', () => ({
    listImports: vi.fn(),
    getLatestComparisonSummary: vi.fn(),
}));

const listImportsMock = vi.mocked(listImports);
const comparisonMock = vi.mocked(getLatestComparisonSummary);

const imp2 = {
    id: 'imp-2',
    accountUsername: 'o',
    followersCount: 4,
    followingCount: 2,
    importedAt: '2026-07-17T00:00:00Z',
};
const imp1 = {
    id: 'imp-1',
    accountUsername: 'o',
    followersCount: 3,
    followingCount: 2,
    importedAt: '2026-07-16T00:00:00Z',
};

describe('DashboardWidgets', () => {
    beforeEach(() => {
        listImportsMock.mockReset();
        comparisonMock.mockReset();
    });

    it('取り込みなしなら最初の一歩の導線を表示する', async () => {
        listImportsMock.mockResolvedValue([]);
        comparisonMock.mockResolvedValue(null);

        renderWithQueryClient(<DashboardWidgets />);

        expect(await screen.findByRole('link', { name: 'エクスポートを取り込む' })).toHaveAttribute('href', '/imports');
    });

    it('取り込みがあれば最新（先頭）の要約と比較要約を表示する（007 US4）', async () => {
        listImportsMock.mockResolvedValue([imp2, imp1]);
        comparisonMock.mockResolvedValue({
            current: imp2,
            previous: imp1,
            followerDelta: 1,
            gainedCount: 2,
            lostCount: 1,
        });

        renderWithQueryClient(<DashboardWidgets />);

        expect(await screen.findByText('4')).toBeInTheDocument();
        expect(await screen.findByText('+1')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '差分の詳細を見る' })).toHaveAttribute('href', '/imports/imp-2');
        expect(screen.getByRole('link', { name: '取り込み・差分を見る' })).toBeInTheDocument();
    });

    it('取得が失敗しても画面は壊れず、案内を表示する（FR-006）', async () => {
        listImportsMock.mockRejectedValue(new Error('boom'));
        comparisonMock.mockRejectedValue(new Error('boom'));

        renderWithQueryClient(<DashboardWidgets />);

        expect(await screen.findByText(/情報を取得できませんでした/)).toBeInTheDocument();
    });

    it('比較要約だけ失敗した場合は件数を表示したまま要約部分だけ案内になる', async () => {
        listImportsMock.mockResolvedValue([imp2, imp1]);
        comparisonMock.mockRejectedValue(new Error('boom'));

        renderWithQueryClient(<DashboardWidgets />);

        expect(await screen.findByText('4')).toBeInTheDocument();
        expect(await screen.findByText(/比較の情報を取得できませんでした/)).toBeInTheDocument();
    });
});
