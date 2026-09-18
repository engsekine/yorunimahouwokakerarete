import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ReplaceAllAndImportButton } from './ReplaceAllAndImportButton';

const meta = {
    title: 'features/follower-import/ReplaceAllAndImportButton',
    component: ReplaceAllAndImportButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof ReplaceAllAndImportButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 別アカウントの記録が保存済みで取り込みが拒否された状態（007 FR-007a） */
export const Default: Story = {
    args: {
        storedCount: 2,
        conflictingAccountUsername: 'yorunimahouwokakerarete_owner',
        isPending: false,
        onConfirm: fn(),
    },
};

/** 削除して取り込む処理中: ボタンとダイアログの実行ボタンが無効化される */
export const Pending: Story = {
    args: {
        ...Default.args,
        isPending: true,
    },
};
