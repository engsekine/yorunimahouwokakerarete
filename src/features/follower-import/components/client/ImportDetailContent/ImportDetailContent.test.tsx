import { screen } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getImportDetail } from '@/features/follower-import/client/queries';
import type { ImportDetail } from '@/features/follower-import/types';
import { renderWithQueryClient } from '@/shared/lib/test-utils';

import { ImportDetailContent } from './ImportDetailContent';

const { notFoundMock } = vi.hoisted(() => ({ notFoundMock: vi.fn() }));

vi.mock('@/features/follower-import/client/queries', () => ({
    getImportDetail: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    notFound: () => {
        notFoundMock();
        throw new Error('NEXT_NOT_FOUND');
    },
}));

const getImportDetailMock = vi.mocked(getImportDetail);

/** notFound() の throw を受け止める境界（Next.js の not-found.tsx 相当） */
class NotFoundBoundary extends Component<{ children: ReactNode }, { caught: boolean }> {
    override state = { caught: false };

    static getDerivedStateFromError() {
        return { caught: true };
    }

    override render() {
        return this.state.caught ? <p>Not Found 境界</p> : this.props.children;
    }
}

const entry = (username: string) => ({ username, profileUrl: `https://www.instagram.com/${username}` });

const detail: ImportDetail = {
    diff: {
        current: {
            id: 'imp-2',
            accountUsername: 'yorunimahouwokakerarete_owner',
            followersCount: 3,
            followingCount: 2,
            importedAt: '2026-07-17T00:00:00+00:00',
        },
        previous: null,
        gained: [],
        lost: [],
    },
    analysis: { notFollowingBack: [entry('dave')], notFollowedBack: [] },
    followers: [entry('alice'), entry('carol'), entry('eve')],
    following: [entry('alice'), entry('dave')],
};

describe('ImportDetailContent', () => {
    beforeEach(() => {
        getImportDetailMock.mockReset();
        notFoundMock.mockReset();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    it('読み込み中は status を表示する', () => {
        getImportDetailMock.mockReturnValue(new Promise(() => undefined));

        renderWithQueryClient(<ImportDetailContent importId="imp-2" />);

        expect(screen.getByRole('status')).toHaveTextContent('読み込み中');
    });

    it('差分・分析・メンバー一覧・戻るリンクを表示する', async () => {
        getImportDetailMock.mockResolvedValue(detail);

        renderWithQueryClient(<ImportDetailContent importId="imp-2" />);

        expect(await screen.findByText(/比較対象がまだありません/)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'メンバー一覧' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /フォロワー（3）/ })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'インポート一覧に戻る' })).toHaveAttribute('href', '/imports');
    });

    it('存在しない id は notFound() に委ねる（not-found 境界へ throw する）', async () => {
        getImportDetailMock.mockResolvedValue(null);

        renderWithQueryClient(
            <NotFoundBoundary>
                <ImportDetailContent importId="missing" />
            </NotFoundBoundary>,
        );

        expect(await screen.findByText('Not Found 境界')).toBeInTheDocument();
        expect(notFoundMock).toHaveBeenCalled();
    });

    it('取得に失敗したらエラー通知を表示する', async () => {
        getImportDetailMock.mockRejectedValue(new Error('boom'));

        renderWithQueryClient(<ImportDetailContent importId="imp-2" />);

        expect(await screen.findByRole('alert')).toHaveTextContent('取り込み結果を読み込めませんでした');
    });
});
