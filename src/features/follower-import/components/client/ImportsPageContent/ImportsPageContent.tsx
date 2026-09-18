'use client';

import { useImports } from '@/features/follower-import/hooks';
import { LoadingStatus } from '@/shared/components/feedback/LoadingStatus';
import { Card } from '@/shared/components/surface/Card';
import { Notice } from '@/shared/components/surface/Notice';

import { ExportGuide } from '../ExportGuide';
import { ImportHistoryList } from '../ImportHistoryList';
import { ImportUploadForm } from '../ImportUploadForm';

/**
 * インポート画面の本体（アップロード + 履歴 / screens/admin-shell.md）。
 * 取り込み履歴はブラウザ保存から読むため Client Component で取得し、
 * 読み込み中・取得失敗・一覧の 3 状態を出し分ける
 */
export const ImportsPageContent = () => {
    const { data: imports, isPending, isError } = useImports();

    return (
        <>
            <Card title="エクスポートを取り込む">
                <ExportGuide />
                {isPending ? <LoadingStatus /> : <ImportUploadForm storedImports={imports ?? []} />}
            </Card>
            <Card title="取り込み履歴">
                {isPending ? (
                    <LoadingStatus />
                ) : isError ? (
                    <Notice variant="error">
                        取り込み履歴を読み込めませんでした。ページを再読み込みしてください。
                    </Notice>
                ) : (
                    <ImportHistoryList imports={imports} />
                )}
            </Card>
        </>
    );
};
