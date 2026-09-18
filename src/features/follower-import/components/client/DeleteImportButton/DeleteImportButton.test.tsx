import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { deleteImport } from '@/features/follower-import/client/actions';
import { followerImportKeys } from '@/features/follower-import/hooks';
import { renderWithQueryClient } from '@/shared/lib/test-utils';

import { DeleteImportButton } from './DeleteImportButton';

vi.mock('@/features/follower-import/client/actions');

const deleteImportMock = vi.mocked(deleteImport);

describe('DeleteImportButton', () => {
    beforeEach(() => {
        deleteImportMock.mockReset();
    });

    it('「削除」ボタン押下で確認ダイアログを表示する', async () => {
        const user = userEvent.setup();
        renderWithQueryClient(<DeleteImportButton importId="imp-1" />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '削除' }));

        expect(screen.getByRole('dialog', { name: 'この取り込みを削除しますか？' })).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toHaveTextContent('残った記録同士で差分が計算し直されます');
        expect(screen.getByRole('button', { name: '削除する' })).toBeInTheDocument();
    });

    it('キャンセルを押すとダイアログが閉じ、deleteImport は呼ばれない', async () => {
        const user = userEvent.setup();
        renderWithQueryClient(<DeleteImportButton importId="imp-1" />);

        await user.click(screen.getByRole('button', { name: '削除' }));
        await user.click(screen.getByRole('button', { name: 'キャンセル' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(deleteImportMock).not.toHaveBeenCalled();
    });

    it('「削除する」を押すと deleteImport を実行し、成功時は取り込みクエリを無効化する', async () => {
        deleteImportMock.mockResolvedValue({ success: true });
        const user = userEvent.setup();
        const { queryClient } = renderWithQueryClient(<DeleteImportButton importId="imp-1" />);
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        await user.click(screen.getByRole('button', { name: '削除' }));
        await user.click(screen.getByRole('button', { name: '削除する' }));

        await waitFor(() => {
            expect(deleteImportMock).toHaveBeenCalledWith('imp-1');
        });
        await waitFor(() => {
            expect(invalidate).toHaveBeenCalledWith({ queryKey: followerImportKeys.all });
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('deleteImport が失敗した場合、role="alert" でエラーメッセージを表示しクエリを無効化しない', async () => {
        deleteImportMock.mockResolvedValue({
            success: false,
            error: '削除に失敗しました。時間をおいて再度お試しください',
        });
        const user = userEvent.setup();
        const { queryClient } = renderWithQueryClient(<DeleteImportButton importId="imp-1" />);
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        await user.click(screen.getByRole('button', { name: '削除' }));
        await user.click(screen.getByRole('button', { name: '削除する' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            '削除に失敗しました。時間をおいて再度お試しください',
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(invalidate).not.toHaveBeenCalled();
    });
});
