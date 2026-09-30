import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
    id: string;
    name: string;
    count: number;
}

const rows: Row[] = [
    { id: '1', name: 'alice', count: 10 },
    { id: '2', name: 'bob', count: 20 },
];

const columns: DataTableColumn<Row>[] = [
    { header: '名前', cell: (r) => r.name },
    { header: '件数', cell: (r) => r.count },
    { header: '操作', srOnlyHeader: true, cell: (r) => <button type="button">{`削除 ${r.name}`}</button> },
];

describe('DataTable', () => {
    it('列見出しと行データを table として表示する', () => {
        render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyText="なし" />);

        expect(screen.getByRole('columnheader', { name: '名前' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'alice' })).toBeInTheDocument();
        expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 rows
    });

    it('srOnlyHeader 列でも見出しはアクセシブルネームとして存在する', () => {
        render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyText="なし" />);
        expect(screen.getByRole('columnheader', { name: '操作' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '削除 alice' })).toBeInTheDocument();
    });

    it('スクロール枠は relative + overflow-x-auto で、sr-only 見出しのはみ出しを枠内に閉じ込める', () => {
        render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} emptyText="なし" />);

        // 枠が非配置だと sr-only（position:absolute）見出しの座標がページ全体の横幅に加算され、
        // 狭い画面でページごと横にはみ出す（回帰テスト）
        expect(screen.getByRole('table').parentElement).toHaveClass('relative', 'overflow-x-auto');
    });

    it('0 件のときは emptyText を表示しテーブルを描画しない', () => {
        render(<DataTable columns={columns} rows={[]} getRowKey={(r) => r.id} emptyText="まだありません" />);
        expect(screen.getByText('まだありません')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
