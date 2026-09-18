'use client';

import { useImports, useLatestComparison } from '@/features/follower-import';

import { ImportSummaryWidget } from '../ImportSummaryWidget';

/**
 * ダッシュボードのウィジェット群（004 / FR-005）。
 * dashboard は他 feature の要約を集約する合成 feature のため、各 feature の公開 API（index.ts）から
 * hooks を取り込む（arch/feature-based.md の「dashboard の例外」参照）。
 * 取得が失敗しても画面は壊れず、該当ウィジェット（または比較要約部分）だけが「取得できません」になる（FR-006 / 007 Edge Case）
 */
export const DashboardWidgets = () => {
    const importsQuery = useImports();
    const comparisonQuery = useLatestComparison();

    const latestImport = importsQuery.isError ? undefined : (importsQuery.data?.[0] ?? null);
    const comparison = comparisonQuery.isError ? undefined : (comparisonQuery.data ?? null);

    return (
        <div className="grid grid-cols-1 gap-4">
            <ImportSummaryWidget
                latest={latestImport}
                comparison={comparison}
                isLoading={importsQuery.isPending || comparisonQuery.isPending}
            />
        </div>
    );
};
