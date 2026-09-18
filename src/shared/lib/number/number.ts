/**
 * 外部データ由来の数値が string として渡されることがあるため、アプリ内の数値型へ正規化する。
 * 数値に変換できない値は null にする。
 */
export const toNumber = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};
