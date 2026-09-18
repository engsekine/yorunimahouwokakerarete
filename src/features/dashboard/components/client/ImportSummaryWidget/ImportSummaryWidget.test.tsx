import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ComparisonSummary, ImportSummary } from '@/features/follower-import';

import { ImportSummaryWidget } from './ImportSummaryWidget';

const latest: ImportSummary = {
    id: 'imp-2',
    accountUsername: 'yorunimahouwokakerarete_owner',
    followersCount: 1234,
    followingCount: 321,
    importedAt: '2026-07-17T00:00:00+00:00',
};

const previous: ImportSummary = {
    ...latest,
    id: 'imp-1',
    followersCount: 1230,
    importedAt: '2026-07-10T00:00:00+00:00',
};

const comparison: ComparisonSummary = { current: latest, previous, followerDelta: 4, gainedCount: 6, lostCount: 2 };

describe('ImportSummaryWidget', () => {
    it('読み込み中は status を表示する', () => {
        render(<ImportSummaryWidget latest={undefined} comparison={undefined} isLoading />);

        expect(screen.getByRole('status')).toHaveTextContent('読み込み中');
    });

    it('取得失敗（latest undefined）は取得できない旨の通知を表示する', () => {
        render(<ImportSummaryWidget latest={undefined} comparison={undefined} />);

        expect(screen.getByRole('status')).toHaveTextContent('取得できませんでした');
    });

    it('取り込みなし（null）は最初の一歩への導線を表示する', () => {
        render(<ImportSummaryWidget latest={null} comparison={null} />);

        expect(screen.getByText('まだ取り込みがありません。')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'エクスポートを取り込む' })).toHaveAttribute('href', '/imports');
    });

    it('最新取り込みのフォロワー数（3 桁区切り）と一覧への導線を表示する', () => {
        render(<ImportSummaryWidget latest={latest} comparison={comparison} />);

        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '取り込み・差分を見る' })).toHaveAttribute('href', '/imports');
    });

    it('取り込み対象のアカウント ID を @ 付きで表示する', () => {
        render(<ImportSummaryWidget latest={latest} comparison={comparison} />);

        expect(screen.getByText('@yorunimahouwokakerarete_owner')).toBeInTheDocument();
        expect(screen.getByText('対象アカウント')).toBeInTheDocument();
    });

    describe('比較要約（007 US4）', () => {
        it('前回比・新規フォロワー・フォロー解除の件数と、差分画面への導線を表示する', () => {
            render(<ImportSummaryWidget latest={latest} comparison={comparison} />);

            expect(screen.getByText('+4')).toBeInTheDocument();
            expect(screen.getByText('6 人')).toBeInTheDocument();
            expect(screen.getByText('2 人')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: '差分の詳細を見る' })).toHaveAttribute('href', '/imports/imp-2');
        });

        it('フォロワーが減った場合は負の前回比を表示する', () => {
            render(
                <ImportSummaryWidget
                    latest={latest}
                    comparison={{ ...comparison, followerDelta: -3, gainedCount: 0, lostCount: 3 }}
                />,
            );

            expect(screen.getByText('-3')).toBeInTheDocument();
        });

        it('差分 0 件なら「前回から変化はありません」を status で明示する', () => {
            render(
                <ImportSummaryWidget
                    latest={latest}
                    comparison={{ ...comparison, followerDelta: 0, gainedCount: 0, lostCount: 0 }}
                />,
            );

            expect(screen.getByRole('status')).toHaveTextContent('前回から変化はありません');
            expect(screen.getByText('±0')).toBeInTheDocument();
        });

        it('比較対象なし（previous null）は同じアカウント ID で次回取り込むと比較できる旨を案内する', () => {
            render(
                <ImportSummaryWidget
                    latest={latest}
                    comparison={{ current: latest, previous: null, followerDelta: null, gainedCount: 0, lostCount: 0 }}
                />,
            );

            expect(screen.getByText(/比較対象がまだありません。次回、同じアカウント ID で/)).toBeInTheDocument();
            expect(screen.queryByText(/新規フォロワー/)).not.toBeInTheDocument();
            expect(screen.getByText('1,234')).toBeInTheDocument();
        });

        it('要約の取得失敗（comparison undefined）は件数を表示したまま要約部分だけ案内に置き換える', () => {
            render(<ImportSummaryWidget latest={latest} comparison={undefined} />);

            expect(screen.getByText('1,234')).toBeInTheDocument();
            expect(screen.getByText(/比較の情報を取得できませんでした/)).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: '差分の詳細を見る' })).not.toBeInTheDocument();
        });
    });
});
