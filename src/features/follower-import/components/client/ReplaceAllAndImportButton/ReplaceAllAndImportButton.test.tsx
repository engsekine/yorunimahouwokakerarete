import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReplaceAllAndImportButton } from './ReplaceAllAndImportButton';

describe('ReplaceAllAndImportButton', () => {
    it('トリガーボタン押下で確認ダイアログを表示し、件数とアカウント名を含む説明文を表示する', async () => {
        const user = userEvent.setup();
        render(
            <ReplaceAllAndImportButton
                storedCount={12}
                conflictingAccountUsername="other_account"
                isPending={false}
                onConfirm={vi.fn()}
            />,
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '既存の記録をすべて削除して取り込む' }));

        const dialog = screen.getByRole('dialog', { name: '保存済みの記録をすべて削除して取り込みますか？' });
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveTextContent(
            '@other_account の取り込み記録 12 件とフォロワー一覧をすべて削除してから、新しいエクスポートを取り込みます。この操作は取り消せません。',
        );
        expect(screen.getByRole('button', { name: '削除して取り込む' })).toBeInTheDocument();
    });

    it('キャンセルを押すとダイアログが閉じ、onConfirm は呼ばれない', async () => {
        const onConfirm = vi.fn();
        const user = userEvent.setup();
        render(
            <ReplaceAllAndImportButton
                storedCount={3}
                conflictingAccountUsername="someone"
                isPending={false}
                onConfirm={onConfirm}
            />,
        );

        await user.click(screen.getByRole('button', { name: '既存の記録をすべて削除して取り込む' }));
        await user.click(screen.getByRole('button', { name: 'キャンセル' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('「削除して取り込む」を押すと onConfirm を実行し、ダイアログが閉じる', async () => {
        const onConfirm = vi.fn();
        const user = userEvent.setup();
        render(
            <ReplaceAllAndImportButton
                storedCount={3}
                conflictingAccountUsername="someone"
                isPending={false}
                onConfirm={onConfirm}
            />,
        );

        await user.click(screen.getByRole('button', { name: '既存の記録をすべて削除して取り込む' }));
        await user.click(screen.getByRole('button', { name: '削除して取り込む' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    it('isPending が true のとき、トリガーボタンが無効化される', () => {
        render(
            <ReplaceAllAndImportButton
                storedCount={3}
                conflictingAccountUsername="someone"
                isPending
                onConfirm={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: '既存の記録をすべて削除して取り込む' })).toBeDisabled();
    });

    it('isPending が true のとき、ダイアログの実行ボタンも無効化される', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <ReplaceAllAndImportButton
                storedCount={3}
                conflictingAccountUsername="someone"
                isPending={false}
                onConfirm={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: '既存の記録をすべて削除して取り込む' }));

        rerender(
            <ReplaceAllAndImportButton
                storedCount={3}
                conflictingAccountUsername="someone"
                isPending
                onConfirm={vi.fn()}
            />,
        );

        /** ConfirmDialog は処理中に実行ボタンのラベルを「処理中...」へ変える */
        expect(screen.getByRole('button', { name: /処理中|削除して取り込む/ })).toBeDisabled();
    });
});
