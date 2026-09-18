import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/shared/components/ui/Button';
import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
    id: string;
    name: string;
    count: number;
}

const rows: Row[] = [
    { id: '1', name: 'alice', count: 1200 },
    { id: '2', name: 'bob', count: 340 },
];

const columns: DataTableColumn<Row>[] = [
    { header: '名前', cell: (r) => `@${r.name}` },
    { header: 'フォロワー', cell: (r) => `${r.count.toLocaleString('ja-JP')} 人` },
    {
        header: '操作',
        srOnlyHeader: true,
        cell: () => (
            <Button variant="ghost" size="sm">
                削除
            </Button>
        ),
    },
];

const meta = {
    title: 'shared/data/DataTable',
    component: DataTable<Row>,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof DataTable<Row>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        columns,
        rows,
        getRowKey: (row) => row.id,
        emptyText: 'データがありません。',
    },
};

export const Empty: Story = {
    args: {
        columns,
        rows: [],
        getRowKey: (row) => row.id,
        emptyText: 'まだ取り込みがありません。',
    },
};
