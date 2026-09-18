import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ImportDiffView } from './ImportDiffView';

const summary = (id: string, followersCount: number) => ({
    id,
    accountUsername: 'yorunimahouwokakerarete_owner',
    followersCount,
    followingCount: 2,
    importedAt: '2026-07-17T00:00:00+00:00',
});

const entry = (username: string) => ({ username, profileUrl: `https://www.instagram.com/${username}` });

const meta = {
    title: 'features/follower-import/ImportDiffView',
    component: ImportDiffView,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof ImportDiffView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDiffAndAnalysis: Story = {
    args: {
        diff: {
            current: summary('imp-2', 4),
            previous: summary('imp-1', 3),
            gained: [entry('eve'), entry('frank')],
            lost: [entry('bob')],
        },
        analysis: {
            notFollowingBack: [entry('dave')],
            notFollowedBack: [entry('carol'), entry('eve'), entry('frank')],
        },
    },
};

export const NoChanges: Story = {
    args: {
        diff: { current: summary('imp-2', 3), previous: summary('imp-1', 3), gained: [], lost: [] },
        analysis: null,
    },
};

export const FirstImport: Story = {
    args: {
        diff: { current: summary('imp-1', 3), previous: null, gained: [], lost: [] },
        analysis: null,
    },
};
