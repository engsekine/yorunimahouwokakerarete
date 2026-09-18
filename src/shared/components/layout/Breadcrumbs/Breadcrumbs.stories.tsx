import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Breadcrumbs } from './Breadcrumbs';

const meta = {
    title: 'shared/layout/Breadcrumbs',
    component: Breadcrumbs,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
    },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleLevel: Story = {
    args: {
        breadcrumbs: [{ name: '会員情報の編集' }],
    },
};

export const TwoLevels: Story = {
    args: {
        breadcrumbs: [{ name: '設定', slug: '/settings' }, { name: '会員情報の編集' }],
    },
};

export const DeepHierarchy: Story = {
    args: {
        breadcrumbs: [
            { name: 'ホーム', slug: '/home' },
            { name: 'フォロワー', slug: '/home/followers' },
            { name: '推移', slug: '/home/followers/trends' },
            { name: '2026年5月22日のログ' },
        ],
    },
};
