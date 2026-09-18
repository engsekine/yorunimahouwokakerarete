import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ImportSummaryWidget } from './ImportSummaryWidget';

const latest = {
    id: 'imp-2',
    accountUsername: 'yorunimahouwokakerarete_owner',
    followersCount: 1234,
    followingCount: 321,
    importedAt: '2026-09-17T09:30:00+09:00',
};

const previous = { ...latest, id: 'imp-1', followersCount: 1230, importedAt: '2026-09-10T09:30:00+09:00' };

const meta = {
    title: 'features/dashboard/ImportSummaryWidget',
    component: ImportSummaryWidget,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof ImportSummaryWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 直近の取り込みと前回の比較要約（前回比・新規・解除）を表示（007 US4） */
export const WithComparison: Story = {
    args: {
        latest,
        comparison: { current: latest, previous, followerDelta: 4, gainedCount: 6, lostCount: 2 },
    },
};

/** 前回と同一内容: 変化なしを明示 */
export const Unchanged: Story = {
    args: {
        latest,
        comparison: { current: latest, previous, followerDelta: 0, gainedCount: 0, lostCount: 0 },
    },
};

/** 記録が 1 件だけ: 比較対象なしの案内 */
export const NoPrevious: Story = {
    args: {
        latest,
        comparison: { current: latest, previous: null, followerDelta: null, gainedCount: 0, lostCount: 0 },
    },
};

/** 比較要約の取得だけ失敗: 件数は表示したまま要約部分だけ案内 */
export const ComparisonFailed: Story = {
    args: { latest, comparison: undefined },
};

export const Empty: Story = {
    args: { latest: null, comparison: null },
};

export const Failed: Story = {
    args: { latest: undefined, comparison: undefined },
};

export const Loading: Story = {
    args: { latest: undefined, comparison: undefined, isLoading: true },
};
