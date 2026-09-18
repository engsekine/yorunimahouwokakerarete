import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteAllImports } from '@/features/follower-import/client/actions';
import { listImports } from '@/features/follower-import/client/queries';
import { followerImportKeys } from '@/features/follower-import/hooks';
import { renderWithQueryClient } from '@/shared/lib/test-utils';

import { DeleteAllImportsButton } from './DeleteAllImportsButton';

vi.mock('@/features/follower-import/client/actions', () => ({
    deleteAllImports: vi.fn(),
}));

vi.mock('@/features/follower-import/client/queries', () => ({
    listImports: vi.fn(),
}));

const deleteAllImportsMock = vi.mocked(deleteAllImports);
const listImportsMock = vi.mocked(listImports);

const summary = (id: string) => ({
    id,
    accountUsername: 'yorunimahouwokakerarete_owner',
    followersCount: 3,
    followingCount: 2,
    importedAt: '2026-07-17T00:00:00+00:00',
});

const BUTTON_NAME = '取り込んだデータをすべて削除';
const DIALOG_TITLE = '取り込んだデータをすべて削除しますか？';

describe('DeleteAllImportsButton', () => {
    beforeEach(() => {
        deleteAllImportsMock.mockReset();
        listImportsMock.mockReset();
    });

    it('取り込みが無い場合はボタンを無効にする', async () => {
        listImportsMock.mockResolvedValue([]);
        renderWithQueryClient(<DeleteAllImportsButton />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: BUTTON_NAME })).toBeDisabled();
        });
    });

    it('取り込みがあればボタン押下で件数付きの確認ダイアログを表示する', async () => {
        listImportsMock.mockResolvedValue([summary('imp-1'), summary('imp-2')]);
        const user = userEvent.setup();
        renderWithQueryClient(<DeleteAllImportsButton />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: BUTTON_NAME })).toBeEnabled();
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: BUTTON_NAME }));

        const dialog = screen.getByRole('dialog', { name: DIALOG_TITLE });
        expect(dialog).toHaveTextContent('取り込み履歴 2 件');
        expect(screen.getByRole('button', { name: '削除する' })).toBeInTheDocument();
    });

    it('キャンセルを押すとダイアログが閉じ、deleteAllImports は呼ばれない', async () => {
        listImportsMock.mockResolvedValue([summary('imp-1')]);
        const user = userEvent.setup();
        renderWithQueryClient(<DeleteAllImportsButton />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: BUTTON_NAME })).toBeEnabled();
        });
        await user.click(screen.getByRole('button', { name: BUTTON_NAME }));
        await user.click(screen.getByRole('button', { name: 'キャンセル' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(deleteAllImportsMock).not.toHaveBeenCalled();
    });

    it('「削除する」で deleteAllImports を実行し、成功時はクエリを無効化して完了を通知する', async () => {
        listImportsMock.mockResolvedValue([summary('imp-1')]);
        deleteAllImportsMock.mockResolvedValue({ success: true });
        const user = userEvent.setup();
        const { queryClient } = renderWithQueryClient(<DeleteAllImportsButton />);
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        await waitFor(() => {
            expect(screen.getByRole('button', { name: BUTTON_NAME })).toBeEnabled();
        });
        await user.click(screen.getByRole('button', { name: BUTTON_NAME }));
        await user.click(screen.getByRole('button', { name: '削除する' }));

        await waitFor(() => {
            expect(deleteAllImportsMock).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            expect(invalidate).toHaveBeenCalledWith({ queryKey: followerImportKeys.all });
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('取り込んだデータを削除しました');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('deleteAllImports が失敗した場合、role="alert" でエラーを表示しクエリを無効化しない', async () => {
        listImportsMock.mockResolvedValue([summary('imp-1')]);
        deleteAllImportsMock.mockResolvedValue({
            success: false,
            error: 'データの削除に失敗しました。時間をおいて再度お試しください',
        });
        const user = userEvent.setup();
        const { queryClient } = renderWithQueryClient(<DeleteAllImportsButton />);
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        await waitFor(() => {
            expect(screen.getByRole('button', { name: BUTTON_NAME })).toBeEnabled();
        });
        await user.click(screen.getByRole('button', { name: BUTTON_NAME }));
        await user.click(screen.getByRole('button', { name: '削除する' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'データの削除に失敗しました。時間をおいて再度お試しください',
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(invalidate).not.toHaveBeenCalled();
    });

    it('一覧の取得に失敗してもボタンは押せる（破損データの掃除に使えるようにする）', async () => {
        listImportsMock.mockRejectedValue(new Error('boom'));
        renderWithQueryClient(<DeleteAllImportsButton />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: BUTTON_NAME })).toBeEnabled();
        });
    });
});
