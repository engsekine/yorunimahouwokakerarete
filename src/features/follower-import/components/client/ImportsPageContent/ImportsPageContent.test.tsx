import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listImports } from '@/features/follower-import/client/queries';
import { renderWithQueryClient } from '@/shared/lib/test-utils';

import { ImportsPageContent } from './ImportsPageContent';

vi.mock('@/features/follower-import/client/queries', () => ({
    listImports: vi.fn(),
}));

vi.mock('../ImportUploadForm', () => ({
    ImportUploadForm: ({ storedImports }: { storedImports: Array<{ accountUsername: string }> }) => (
        <p>フォーム（既定: {storedImports[0]?.accountUsername ?? 'なし'}）</p>
    ),
}));

vi.mock('../ImportHistoryList', () => ({
    ImportHistoryList: ({ imports }: { imports: unknown[] }) => <p>履歴 {imports.length} 件</p>,
}));

const listImportsMock = vi.mocked(listImports);

const summary = {
    id: 'imp-1',
    accountUsername: 'yorunimahouwokakerarete_owner',
    followersCount: 3,
    followingCount: 2,
    importedAt: '2026-07-17T00:00:00+00:00',
};

describe('ImportsPageContent', () => {
    beforeEach(() => {
        listImportsMock.mockReset();
    });

    it('読み込み中は status を表示する', () => {
        listImportsMock.mockReturnValue(new Promise(() => undefined));

        renderWithQueryClient(<ImportsPageContent />);

        expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
        expect(screen.getByText(/アカウントセンターからデバイスに/)).toBeInTheDocument();
    });

    it('最新のデータを取得するにはエクスポートを 1 からやり直す旨の注釈を表示する', () => {
        listImportsMock.mockReturnValue(new Promise(() => undefined));

        renderWithQueryClient(<ImportsPageContent />);

        expect(
            screen.getByText(/最新のデータを取得するには、エクスポートを 1 からやり直してください/),
        ).toBeInTheDocument();
    });

    it('取り込み済みなら保存済み記録をフォームに渡し（既定値はそのアカウント ID）、履歴を表示する', async () => {
        listImportsMock.mockResolvedValue([summary]);

        renderWithQueryClient(<ImportsPageContent />);

        expect(await screen.findByText('フォーム（既定: yorunimahouwokakerarete_owner）')).toBeInTheDocument();
        expect(screen.getByText('履歴 1 件')).toBeInTheDocument();
    });

    it('取り込みが無ければフォームの既定値は無し', async () => {
        listImportsMock.mockResolvedValue([]);

        renderWithQueryClient(<ImportsPageContent />);

        expect(await screen.findByText('フォーム（既定: なし）')).toBeInTheDocument();
        expect(screen.getByText('履歴 0 件')).toBeInTheDocument();
    });

    it('取得に失敗したら履歴の代わりにエラー通知を表示する', async () => {
        listImportsMock.mockRejectedValue(new Error('boom'));

        renderWithQueryClient(<ImportsPageContent />);

        expect(await screen.findByRole('alert')).toHaveTextContent('取り込み履歴を読み込めませんでした');
    });
});
