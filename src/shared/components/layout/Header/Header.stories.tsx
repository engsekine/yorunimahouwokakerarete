import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Header } from './Header';

const meta = {
    title: 'shared/layout/Header',
    component: Header,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
    },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
    args: {
        actions: (
            <button
                type="button"
                className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm hover:opacity-90"
            >
                ログイン
            </button>
        ),
    },
};

export const WithMultipleActions: Story = {
    args: {
        actions: (
            <div className="flex items-center gap-2">
                <button type="button" className="rounded-md px-3 py-1.5 text-foreground text-sm hover:bg-accent">
                    新規登録
                </button>
                <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm hover:opacity-90"
                >
                    ログイン
                </button>
            </div>
        ),
    },
};
