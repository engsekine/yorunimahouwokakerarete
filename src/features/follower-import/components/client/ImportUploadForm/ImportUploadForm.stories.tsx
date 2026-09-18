import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ImportUploadForm } from './ImportUploadForm';

const summary = (id: string, importedAt: string, accountUsername = 'yorunimahouwokakerarete_owner') => ({
    id,
    accountUsername,
    followersCount: 1234,
    followingCount: 321,
    importedAt,
});

const meta = {
    title: 'features/follower-import/ImportUploadForm',
    component: ImportUploadForm,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof ImportUploadForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 記録なし: アカウント ID は必須入力 */
export const Default: Story = {
    args: { storedImports: [] },
};

/** 記録 1 件: 保存済みアカウント ID が既定値になる */
export const WithStoredAccount: Story = {
    args: { storedImports: [summary('imp-1', '2026-09-10T09:30:00+09:00')] },
};

/** 記録 2 件（上限）: 取り込むと最も古い記録が置き換わる案内を表示（007 FR-006） */
export const AtRetentionLimit: Story = {
    args: {
        storedImports: [summary('imp-2', '2026-09-17T09:30:00+09:00'), summary('imp-1', '2026-09-10T09:30:00+09:00')],
    },
};
