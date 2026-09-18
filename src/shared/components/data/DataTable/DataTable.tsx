import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
    header: string;
    cell: (row: T) => ReactNode;
    /** 行内アクション列など、ヘッダーを視覚的に隠す場合（アクセシブルネームは保持） */
    srOnlyHeader?: boolean;
}

interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    rows: T[];
    getRowKey: (row: T) => string;
    /** 0 件時の案内文 */
    emptyText: string;
}

/**
 * 一覧テーブル（WordPress のリストテーブル相当）。
 * table セマンティクス（thead/tbody/th scope="col"）を持ち、0 件時は emptyText を表示する。
 */
export const DataTable = <T,>({ columns, rows, getRowKey, emptyText }: DataTableProps<T>) => {
    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm">{emptyText}</p>;
    }

    return (
        <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
                <thead className="border-border border-b bg-muted/50">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.header}
                                scope="col"
                                className={
                                    column.srOnlyHeader
                                        ? 'sr-only'
                                        : 'px-4 py-2 text-left font-medium text-muted-foreground'
                                }
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                        <tr key={getRowKey(row)}>
                            {columns.map((column) => (
                                <td key={column.header} className="px-4 py-3">
                                    {column.cell(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
