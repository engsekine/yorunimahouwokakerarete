import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DeleteAllImportsButton } from './DeleteAllImportsButton';

/**
 * ブラウザ保存（localStorage）を実データとして読むため、取り込みが無い環境では無効表示になる。
 * 有効状態を確認したい場合は、先に /imports で取り込むか、Storybook のブラウザで
 * `yorunimahouwokakerarete:follower-imports` にサマリ配列を保存する。
 */
const meta = {
    title: 'features/follower-import/DeleteAllImportsButton',
    component: DeleteAllImportsButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
} satisfies Meta<typeof DeleteAllImportsButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
