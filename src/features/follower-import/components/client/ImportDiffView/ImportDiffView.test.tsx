import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ImportDiff, MutualAnalysis } from '@/features/follower-import/types';

import { ImportDiffView } from './ImportDiffView';

const summary = (id: string, followersCount: number) => ({
    id,
    accountUsername: 'yorunimahouwokakerarete_owner',
    followersCount,
    followingCount: 2,
    importedAt: '2026-07-17T00:00:00+00:00',
});

const baseDiff: ImportDiff = {
    current: summary('imp-2', 4),
    previous: summary('imp-1', 3),
    gained: [{ username: 'eve', profileUrl: 'https://www.instagram.com/eve' }],
    lost: [{ username: 'bob', profileUrl: 'https://www.instagram.com/bob' }],
};

describe('ImportDiffView', () => {
    it('新規/解除の件数・一覧・前回比を表示し、外部プロフィールへのリンクを持つ', () => {
        render(<ImportDiffView diff={baseDiff} analysis={null} />);

        expect(screen.getByRole('heading', { name: '新規フォロワー（1 人）' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'フォロー解除した相手（1 人）' })).toBeInTheDocument();
        expect(screen.getByText(/前回比 \+1/)).toBeInTheDocument();

        const link = screen.getByRole('link', { name: '@eve' });
        expect(link).toHaveAttribute('href', 'https://www.instagram.com/eve');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('差分 0 件なら「変化なし」を明示する', () => {
        render(<ImportDiffView diff={{ ...baseDiff, gained: [], lost: [] }} analysis={null} />);

        expect(screen.getByRole('status')).toHaveTextContent('差分 0 件');
    });

    it('比較対象なし（previous = null）は同じアカウント ID で次回取り込むと比較できる旨を案内する（007 FR-003）', () => {
        render(<ImportDiffView diff={{ ...baseDiff, previous: null, gained: [], lost: [] }} analysis={null} />);

        expect(screen.getByText(/比較対象がまだありません。次回、同じアカウント ID で/)).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: /新規フォロワー/ })).not.toBeInTheDocument();
    });

    it('ユーザーネーム変更の注記を常時表示する', () => {
        render(<ImportDiffView diff={baseDiff} analysis={null} />);

        expect(screen.getByText(/ユーザーネームを変更した場合/)).toBeInTheDocument();
    });

    it('分析があれば非相互の 2 一覧を、無ければ following 同梱の案内を表示する', () => {
        const analysis: MutualAnalysis = {
            notFollowingBack: [{ username: 'dave', profileUrl: 'https://www.instagram.com/dave' }],
            notFollowedBack: [{ username: 'carol', profileUrl: 'https://www.instagram.com/carol' }],
        };
        const { rerender } = render(<ImportDiffView diff={baseDiff} analysis={analysis} />);

        expect(screen.getByRole('heading', { name: 'フォローバックされていない相手（1 人）' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '@dave' })).toBeInTheDocument();

        rerender(<ImportDiffView diff={baseDiff} analysis={null} />);
        expect(screen.getByText(/following\.json を含めると/)).toBeInTheDocument();
    });
});
