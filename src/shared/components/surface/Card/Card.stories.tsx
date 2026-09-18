import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/shared/components/ui/Button';
import { Card } from './Card';

const meta = {
    title: 'shared/surface/Card',
    component: Card,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: 'カードの本文コンテンツ。',
    },
};

export const WithTitle: Story = {
    args: {
        title: '接続情報',
        children: 'カードの本文コンテンツ。',
    },
};

export const WithTitleAndActions: Story = {
    args: {
        title: '取り込み履歴',
        actions: <Button variant="outline">更新</Button>,
        children: 'カードの本文コンテンツ。',
    },
};
