import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ImportHistoryList } from './ImportHistoryList';

const meta = {
    title: 'features/follower-import/ImportHistoryList',
    component: ImportHistoryList,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof ImportHistoryList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        imports: [
            {
                id: 'imp-2',
                accountUsername: 'yorunimahouwokakerarete_owner',
                followersCount: 1234,
                followingCount: 321,
                importedAt: '2026-07-17T09:30:00+09:00',
            },
            {
                id: 'imp-1',
                accountUsername: 'yorunimahouwokakerarete_owner',
                followersCount: 1200,
                followingCount: 320,
                importedAt: '2026-07-10T09:30:00+09:00',
            },
        ],
    },
};

/** 旧データで別アカウントの記録が混在している見え方（次の取り込み時に整理される / 007 FR-011） */
export const MixedAccountsLegacy: Story = {
    args: {
        imports: [
            {
                id: 'imp-3',
                accountUsername: 'yorunimahouwokakerarete_owner',
                followersCount: 1234,
                followingCount: 321,
                importedAt: '2026-09-17T09:30:00+09:00',
            },
            {
                id: 'imp-2',
                accountUsername: 'other_account',
                followersCount: 87,
                followingCount: 40,
                importedAt: '2026-09-12T09:30:00+09:00',
            },
            {
                id: 'imp-1',
                accountUsername: 'yorunimahouwokakerarete_owner',
                followersCount: 1200,
                followingCount: 320,
                importedAt: '2026-09-10T09:30:00+09:00',
            },
        ],
    },
};

export const Empty: Story = {
    args: {
        imports: [],
    },
};
