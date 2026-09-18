import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { uploadImport } from '@/features/follower-import/client/actions';
import type { ImportSummary } from '@/features/follower-import/types';
import { renderWithQueryClient } from '@/shared/lib/test-utils';

import { ImportUploadForm } from './ImportUploadForm';

const { pushMock } = vi.hoisted(() => ({
    pushMock: vi.fn(),
}));

vi.mock('@/features/follower-import/client/actions', () => ({
    uploadImport: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
}));

const mockedUploadImport = vi.mocked(uploadImport);

const ACCOUNT_LABEL = '対象の Instagram アカウント ID';

/** ダミーの followers HTML ファイル（ファイル入力を満たすため） */
const createExportFile = (name = 'followers_1.html'): File => new File(['dummy content'], name, { type: 'text/html' });

/** 本人名入りの personal_information.json（自動入力の検証用） */
const createPersonalInfoFile = (username: string): File =>
    new File(
        [JSON.stringify({ profile_user: [{ string_map_data: { Username: { value: username } } }] })],
        'personal_information.json',
        {
            type: 'application/json',
        },
    );

const summary = (id: string, importedAt: string, accountUsername = 'my_account'): ImportSummary => ({
    id,
    accountUsername,
    followersCount: 3,
    followingCount: 2,
    importedAt,
});

const oneStored = [summary('imp-1', '2026-09-01T00:00:00.000Z')];
const twoStored = [summary('imp-2', '2026-09-02T00:00:00.000Z'), summary('imp-1', '2026-09-01T00:00:00.000Z')];

describe('ImportUploadForm', () => {
    beforeEach(() => {
        pushMock.mockReset();
        mockedUploadImport.mockReset();
    });

    it('ファイル入力とアカウント ID 入力が label と関連付けられている', () => {
        renderWithQueryClient(<ImportUploadForm storedImports={[]} />);

        expect(screen.getByLabelText(/エクスポートファイル/)).toBeInTheDocument();
        expect(screen.getByLabelText(ACCOUNT_LABEL)).toBeInTheDocument();
    });

    describe('アカウント ID の既定値（FR-012）', () => {
        it('保存済み記録があればそのアカウント ID が初期値になり required が外れる', () => {
            renderWithQueryClient(<ImportUploadForm storedImports={oneStored} />);

            const input = screen.getByLabelText(ACCOUNT_LABEL);
            expect(input).toHaveValue('my_account');
            expect(input).not.toBeRequired();
        });

        it('保存済み記録が無ければ空で required になる', () => {
            renderWithQueryClient(<ImportUploadForm storedImports={[]} />);

            const input = screen.getByLabelText(ACCOUNT_LABEL);
            expect(input).toHaveValue('');
            expect(input).toBeRequired();
        });

        it('本人名を含むファイルを選ぶと自動入力され、status で通知する', async () => {
            const user = userEvent.setup();
            renderWithQueryClient(<ImportUploadForm storedImports={oneStored} />);

            await user.upload(screen.getByLabelText(/エクスポートファイル/), [
                createExportFile(),
                createPersonalInfoFile('Owner_From_Export'),
            ]);

            await waitFor(() => {
                expect(screen.getByLabelText(ACCOUNT_LABEL)).toHaveValue('owner_from_export');
            });
            expect(
                screen.getByText('エクスポートからアカウント ID を自動入力しました。内容を確認してください。'),
            ).toHaveAttribute('role', 'status');
        });

        it('手で編集した後はファイルを選び直しても上書きしない', async () => {
            const user = userEvent.setup();
            renderWithQueryClient(<ImportUploadForm storedImports={[]} />);

            await user.type(screen.getByLabelText(ACCOUNT_LABEL), 'typed_by_user');
            await user.upload(
                screen.getByLabelText(/エクスポートファイル/),
                createPersonalInfoFile('owner_from_export'),
            );

            await waitFor(() => {
                expect(mockedUploadImport).not.toHaveBeenCalled();
            });
            expect(screen.getByLabelText(ACCOUNT_LABEL)).toHaveValue('typed_by_user');
            expect(screen.queryByText(/自動入力しました/)).not.toBeInTheDocument();
        });

        it('本人名を含まないファイルでは自動入力されない', async () => {
            const user = userEvent.setup();
            renderWithQueryClient(<ImportUploadForm storedImports={[]} />);

            await user.upload(screen.getByLabelText(/エクスポートファイル/), createExportFile());

            expect(screen.getByLabelText(ACCOUNT_LABEL)).toHaveValue('');
            expect(screen.queryByText(/自動入力しました/)).not.toBeInTheDocument();
        });
    });

    describe('取り込み前の案内', () => {
        it('保存済みが上限件数で同じアカウントなら置き換え案内を表示する（FR-006）', () => {
            renderWithQueryClient(<ImportUploadForm storedImports={twoStored} />);

            const notice = screen.getByText(/最も古い記録（.+）が置き換わります/);
            expect(notice).toBeInTheDocument();
            expect(notice.closest('[role="status"]')).not.toBeNull();
        });

        it('保存済みが 1 件なら置き換え案内は表示しない', () => {
            renderWithQueryClient(<ImportUploadForm storedImports={oneStored} />);

            expect(screen.queryByText(/置き換わります/)).not.toBeInTheDocument();
        });

        it('入力値が保存済みアカウントと異なれば別アカウントの案内を出し、置き換え案内は出さない', async () => {
            const user = userEvent.setup();
            renderWithQueryClient(<ImportUploadForm storedImports={twoStored} />);

            await user.clear(screen.getByLabelText(ACCOUNT_LABEL));
            await user.type(screen.getByLabelText(ACCOUNT_LABEL), 'other_account');

            expect(screen.getByText(/保存済みの記録は @my_account のものです/)).toBeInTheDocument();
            expect(screen.queryByText(/置き換わります/)).not.toBeInTheDocument();
        });

        it('大文字・空白違いは同じアカウントとして扱い、別アカウントの案内を出さない', async () => {
            const user = userEvent.setup();
            renderWithQueryClient(<ImportUploadForm storedImports={oneStored} />);

            await user.clear(screen.getByLabelText(ACCOUNT_LABEL));
            await user.type(screen.getByLabelText(ACCOUNT_LABEL), ' My_Account ');

            expect(screen.queryByText(/別のアカウントで取り込むには/)).not.toBeInTheDocument();
        });
    });

    it('初期状態では確認チェックボックスも全削除ボタンも表示されない', () => {
        renderWithQueryClient(<ImportUploadForm storedImports={[]} />);

        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /すべて削除して取り込む/ })).not.toBeInTheDocument();
    });

    it('取り込み成功時にファイル内容とアカウント ID を渡し、取り込み結果画面へ遷移する', async () => {
        const user = userEvent.setup();
        mockedUploadImport.mockResolvedValue({ success: true, importId: 'imp-1' });

        renderWithQueryClient(<ImportUploadForm storedImports={oneStored} />);

        await user.upload(screen.getByLabelText(/エクスポートファイル/), createExportFile());
        await user.click(screen.getByRole('button', { name: '取り込む' }));

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith('/imports/imp-1');
        });
        expect(mockedUploadImport).toHaveBeenCalledWith(
            expect.objectContaining({
                accountUsername: 'my_account',
                confirmMismatch: false,
                replaceExisting: false,
                files: [expect.objectContaining({ name: 'followers_1.html', data: expect.any(Uint8Array) })],
            }),
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('取り込み失敗時にエラーメッセージが role="alert" で表示される', async () => {
        const user = userEvent.setup();
        mockedUploadImport.mockResolvedValue({ success: false, error: '取り込みに失敗しました' });

        renderWithQueryClient(<ImportUploadForm storedImports={oneStored} />);

        await user.upload(screen.getByLabelText(/エクスポートファイル/), createExportFile());
        await user.click(screen.getByRole('button', { name: '取り込む' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('取り込みに失敗しました');
        expect(pushMock).not.toHaveBeenCalled();
    });

    it('account_mismatch 失敗時のみ確認チェックボックスが表示され、チェックして再実行できる（FR-008）', async () => {
        const user = userEvent.setup();
        mockedUploadImport.mockResolvedValueOnce({
            success: false,
            error: 'エクスポートに含まれる本人のアカウント名と入力したアカウント ID が異なります',
            code: 'account_mismatch',
        });
        mockedUploadImport.mockResolvedValueOnce({ success: true, importId: 'imp-2' });

        renderWithQueryClient(<ImportUploadForm storedImports={oneStored} />);

        await user.upload(screen.getByLabelText(/エクスポートファイル/), createExportFile());
        await user.click(screen.getByRole('button', { name: '取り込む' }));

        const checkbox = await screen.findByRole('checkbox', { name: /入力ミスではないことを確認したうえで取り込む/ });
        expect(screen.queryByRole('button', { name: /すべて削除して取り込む/ })).not.toBeInTheDocument();
        await user.click(checkbox);
        await user.click(screen.getByRole('button', { name: '取り込む' }));

        await waitFor(() => {
            expect(mockedUploadImport).toHaveBeenLastCalledWith(
                expect.objectContaining({ confirmMismatch: true, replaceExisting: false }),
            );
        });
        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith('/imports/imp-2');
        });
    });

    describe('別アカウントの記録がある場合（FR-007 / FR-007a）', () => {
        const conflictFailure = {
            success: false as const,
            error: 'このアプリで比較できるアカウントは 1 つです。保存済みの記録は別のアカウント（@my_account）のものです。',
            code: 'account_conflict',
        };

        it('account_conflict 失敗時は alert と「既存の記録をすべて削除して取り込む」を表示する', async () => {
            const user = userEvent.setup();
            mockedUploadImport.mockResolvedValue(conflictFailure);

            renderWithQueryClient(<ImportUploadForm storedImports={twoStored} />);

            await user.clear(screen.getByLabelText(ACCOUNT_LABEL));
            await user.type(screen.getByLabelText(ACCOUNT_LABEL), 'other_account');
            await user.upload(screen.getByLabelText(/エクスポートファイル/), createExportFile());
            await user.click(screen.getByRole('button', { name: '取り込む' }));

            expect(await screen.findByRole('alert')).toHaveTextContent('比較できるアカウントは 1 つ');
            expect(screen.getByRole('button', { name: '既存の記録をすべて削除して取り込む' })).toBeInTheDocument();
            expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        });

        it('確認ダイアログをキャンセルすると再実行しない', async () => {
            const user = userEvent.setup();
            mockedUploadImport.mockResolvedValue(conflictFailure);

            renderWithQueryClient(<ImportUploadForm storedImports={twoStored} />);

            await user.clear(screen.getByLabelText(ACCOUNT_LABEL));
            await user.type(screen.getByLabelText(ACCOUNT_LABEL), 'other_account');
            await user.upload(screen.getByLabelText(/エクスポートファイル/), createExportFile());
            await user.click(screen.getByRole('button', { name: '取り込む' }));

            await user.click(await screen.findByRole('button', { name: '既存の記録をすべて削除して取り込む' }));
            expect(screen.getByRole('dialog')).toHaveTextContent('@my_account の取り込み記録 2 件');
            await user.click(screen.getByRole('button', { name: 'キャンセル' }));

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
            expect(mockedUploadImport).toHaveBeenCalledTimes(1);
        });

        it('承諾すると replaceExisting: true で再実行し、成功時は結果画面へ遷移する', async () => {
            const user = userEvent.setup();
            mockedUploadImport.mockResolvedValueOnce(conflictFailure);
            mockedUploadImport.mockResolvedValueOnce({ success: true, importId: 'imp-new' });

            renderWithQueryClient(<ImportUploadForm storedImports={twoStored} />);

            await user.clear(screen.getByLabelText(ACCOUNT_LABEL));
            await user.type(screen.getByLabelText(ACCOUNT_LABEL), 'other_account');
            await user.upload(screen.getByLabelText(/エクスポートファイル/), createExportFile());
            await user.click(screen.getByRole('button', { name: '取り込む' }));

            await user.click(await screen.findByRole('button', { name: '既存の記録をすべて削除して取り込む' }));
            await user.click(screen.getByRole('button', { name: '削除して取り込む' }));

            await waitFor(() => {
                expect(mockedUploadImport).toHaveBeenLastCalledWith(
                    expect.objectContaining({ accountUsername: 'other_account', replaceExisting: true }),
                );
            });
            await waitFor(() => {
                expect(pushMock).toHaveBeenCalledWith('/imports/imp-new');
            });
        });
    });
});
