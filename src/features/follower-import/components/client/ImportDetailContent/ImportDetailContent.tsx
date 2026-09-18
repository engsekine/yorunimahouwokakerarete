'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { useImportDetail } from '@/features/follower-import/hooks';
import { LoadingStatus } from '@/shared/components/feedback/LoadingStatus';
import { Card } from '@/shared/components/surface/Card';
import { Notice } from '@/shared/components/surface/Notice';

import { FollowerListView } from '../FollowerListView';
import { ImportDiffView } from '../ImportDiffView';

interface ImportDetailContentProps {
    importId: string;
}

/**
 * 差分 + 分析 + メンバー一覧画面の本体。
 * ブラウザ保存に存在しない id は notFound()（404）に委ねる（FR-011）
 */
export const ImportDetailContent = ({ importId }: ImportDetailContentProps) => {
    const { data: detail, isPending, isError } = useImportDetail(importId);

    if (isPending) return <LoadingStatus />;
    if (isError) {
        return <Notice variant="error">取り込み結果を読み込めませんでした。ページを再読み込みしてください。</Notice>;
    }
    if (detail === null) notFound();

    return (
        <>
            <ImportDiffView diff={detail.diff} analysis={detail.analysis} />
            <Card title="メンバー一覧">
                <FollowerListView followers={detail.followers} following={detail.following} />
            </Card>
            <Link href={'/imports' as Route} className="text-muted-foreground text-sm underline hover:text-foreground">
                インポート一覧に戻る
            </Link>
        </>
    );
};
