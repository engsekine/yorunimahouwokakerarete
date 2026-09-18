import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ExportGuide } from './ExportGuide';

const meta = {
    title: 'features/follower-import/ExportGuide',
    component: ExportGuide,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof ExportGuide>;

export default meta;
type Story = StoryObj<typeof meta>;

/** PC（ブラウザ）タブが既定で表示される */
export const Default: Story = {};

/** 「スマートフォン（アプリ）」タブをクリックして切り替えた状態 */
export const Smartphone: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const smartphoneTab = canvas.getByRole('tab', { name: 'スマートフォン（アプリ）' });

        await userEvent.click(smartphoneTab);

        await expect(smartphoneTab).toHaveAttribute('aria-selected', 'true');
        await expect(canvas.getByText(/Instagram アプリでプロフィール画面を開き/)).toBeVisible();
    },
};
