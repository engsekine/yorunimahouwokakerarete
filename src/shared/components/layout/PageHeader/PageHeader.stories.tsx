import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/shared/components/ui/Button';
import { PageHeader } from './PageHeader';

const meta = {
    title: 'shared/layout/PageHeader',
    component: PageHeader,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'ダッシュボード',
    },
};

export const WithDescription: Story = {
    args: {
        title: 'フォロワーインポート',
        description: 'エクスポートを取り込んで差分を確認できます。',
    },
};

export const WithActions: Story = {
    args: {
        title: '取り込み詳細',
        description: 'この取り込みのフォロワー一覧と差分を確認できます。',
        actions: <Button>この取り込みを削除</Button>,
    },
};
