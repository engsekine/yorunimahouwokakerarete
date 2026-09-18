'use client';

import type { Route } from 'next';
import Link from 'next/link';

import type { ImportSummary } from '@/features/follower-import/types';
import { DataTable, type DataTableColumn } from '@/shared/components/data/DataTable';
import { formatJstDateTime } from '@/shared/lib/date';

import { DeleteImportButton } from '../DeleteImportButton';

interface ImportHistoryListProps {
    imports: ImportSummary[];
}

const columns: DataTableColumn<ImportSummary>[] = [
    {
        header: '取込日時',
        cell: (row) => (
            <Link href={`/imports/${row.id}` as Route} className="font-medium underline hover:text-foreground">
                {formatJstDateTime(row.importedAt)}
            </Link>
        ),
    },
    { header: 'アカウント ID', cell: (row) => `@${row.accountUsername}` },
    { header: 'フォロワー', cell: (row) => `${row.followersCount.toLocaleString('ja-JP')} 人` },
    { header: 'フォロー中', cell: (row) => `${row.followingCount.toLocaleString('ja-JP')} 人` },
    { header: '操作', srOnlyHeader: true, cell: (row) => <DeleteImportButton importId={row.id} /> },
];

/**
 * 取り込み履歴の一覧（新しい順・共通 DataTable で表示 / screens/imports.md）。
 * アカウント ID 列で、どのアカウントの記録が残っているかを判別できる（007 FR-009）
 */
export const ImportHistoryList = ({ imports }: ImportHistoryListProps) => (
    <DataTable columns={columns} rows={imports} getRowKey={(row) => row.id} emptyText="まだ取り込みがありません。" />
);
