import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FollowerListView } from './FollowerListView';

const followers = Array.from({ length: 8 }, (_, i) => ({
    username: `follower_${i + 1}`,
    profileUrl: `https://www.instagram.com/follower_${i + 1}`,
}));
const following = [
    { username: 'alice', profileUrl: 'https://www.instagram.com/alice' },
    { username: 'dave', profileUrl: 'https://www.instagram.com/dave' },
];

const meta = {
    title: 'features/follower-import/FollowerListView',
    component: FollowerListView,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof FollowerListView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        followers,
        following,
    },
};

export const FollowingNotIncluded: Story = {
    args: {
        followers,
        following: null,
    },
};

export const Empty: Story = {
    args: {
        followers: [],
        following: [],
    },
};
