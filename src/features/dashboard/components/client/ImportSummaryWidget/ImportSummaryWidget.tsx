'use client';

import type { Route } from 'next';
import Link from 'next/link';

import type { ComparisonSummary, ImportSummary } from '@/features/follower-import';
import { NO_PREVIOUS_NOTICE } from '@/features/follower-import/constants';
import { LoadingStatus } from '@/shared/components/feedback/LoadingStatus';
import { Card } from '@/shared/components/surface/Card';
import { Notice } from '@/shared/components/surface/Notice';
import { buttonVariants } from '@/shared/components/ui/Button';
import { formatJstDateTime } from '@/shared/lib/date';

interface ImportSummaryWidgetProps {
    /** 最新の取り込み。null = 取り込みなし。undefined = 取得失敗 */
    latest: ImportSummary | null | undefined;
    /** 直近の取り込みと前回との比較要約。null = 取り込みなし。undefined = 取得失敗（要約部分だけ案内に置き換える） */
    comparison: ComparisonSummary | null | undefined;
    /** ブラウザ保存からの読み込み中 */
    isLoading?: boolean;
}

/** 前回比の表示（+N / -N / ±0） */
const formatDelta = (delta: number): string => {
    if (delta > 0) return `+${delta.toLocaleString('ja-JP')}`;
    if (delta < 0) return `-${Math.abs(delta).toLocaleString('ja-JP')}`;
    return '±0';
};

/** 比較要約（007 US4 / screens/imports-and-dashboard.md「/」） */
const ComparisonBlock = ({ comparison }: { comparison: ComparisonSummary | undefined }) => {
    if (comparison === undefined) {
        return <Notice variant="info">比較の情報を取得できませんでした。時間をおいて再度お試しください。</Notice>;
    }
    if (comparison.previous === null || comparison.followerDelta === null) {
        return <p className="text-muted-foreground text-sm">{NO_PREVIOUS_NOTICE}</p>;
    }

    const isUnchanged = comparison.gainedCount === 0 && comparison.lostCount === 0;

    return (
        <div className="flex flex-col gap-2">
            {isUnchanged && (
                <p role="status" className="text-sm">
                    前回から変化はありません（差分 0 件）。
                </p>
            )}
            <dl className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-xs">前回比</dt>
                    <dd className="font-medium">{formatDelta(comparison.followerDelta)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-xs">新規フォロワー</dt>
                    <dd className="font-medium">{comparison.gainedCount.toLocaleString('ja-JP')} 人</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-xs">フォロー解除</dt>
                    <dd className="font-medium">{comparison.lostCount.toLocaleString('ja-JP')} 人</dd>
                </div>
            </dl>
            <Link
                href={`/imports/${comparison.current.id}` as Route}
                className="text-sm underline hover:text-foreground"
            >
                差分の詳細を見る
            </Link>
        </div>
    );
};

/**
 * ダッシュボードのインポートサマリ。最新取り込みの要約（対象アカウント ID・フォロワー数・日時）+
 * 前回との比較要約（前回比・新規・解除の件数 / 007 US4）+ 専用ページ（/imports）への導線。
 * 比較要約の取得だけが失敗した場合は件数を表示したまま要約部分だけ案内に置き換える
 */
export const ImportSummaryWidget = ({ latest, comparison, isLoading = false }: ImportSummaryWidgetProps) => (
    <Card title="フォロワーインポート">
        {isLoading ? (
            <LoadingStatus />
        ) : latest === undefined ? (
            <Notice variant="info">情報を取得できませんでした。時間をおいて再度お試しください。</Notice>
        ) : latest === null ? (
            <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">まだ取り込みがありません。</p>
                <Link href={'/imports' as Route} className={buttonVariants()}>
                    エクスポートを取り込む
                </Link>
            </div>
        ) : (
            <div className="flex flex-col gap-3">
                <dl className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-xs">対象アカウント</dt>
                    <dd className="break-all font-medium text-sm">@{latest.accountUsername}</dd>
                </dl>
                <p className="font-bold text-2xl">{latest.followersCount.toLocaleString('ja-JP')}</p>
                <p className="text-muted-foreground text-xs">
                    フォロワー（{formatJstDateTime(latest.importedAt)} 取り込み）
                </p>
                <ComparisonBlock comparison={comparison ?? undefined} />
                <Link href={'/imports' as Route} className="text-sm underline hover:text-foreground">
                    取り込み・差分を見る
                </Link>
            </div>
        )}
    </Card>
);
