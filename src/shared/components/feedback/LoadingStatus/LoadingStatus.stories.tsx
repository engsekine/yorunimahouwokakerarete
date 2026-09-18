import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LoadingStatus } from './LoadingStatus';

const meta = {
    title: 'shared/feedback/LoadingStatus',
    component: LoadingStatus,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof LoadingStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
    args: {
        label: '接続を確認しています…',
    },
};
