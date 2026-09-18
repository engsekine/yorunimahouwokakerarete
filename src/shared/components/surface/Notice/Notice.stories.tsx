import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Notice } from './Notice';

const meta = {
    title: 'shared/surface/Notice',
    component: Notice,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
    args: {
        variant: 'success',
        children: '保存しました。',
    },
};

export const ErrorNotice: Story = {
    args: {
        variant: 'error',
        children: '取り込みに失敗しました。時間をおいて再度お試しください。',
    },
};

export const Info: Story = {
    args: {
        variant: 'info',
        children: '情報を取得できませんでした。',
    },
};
