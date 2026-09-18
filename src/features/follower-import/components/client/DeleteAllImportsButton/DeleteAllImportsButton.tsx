'use client';

import { useState } from 'react';

import { useDeleteAllImports, useImports } from '@/features/follower-import/hooks';
import { ConfirmDialog } from '@/shared/components/feedback/ConfirmDialog';
import { Button } from '@/shared/components/ui/Button';

/**
 * このブラウザに保存された取り込みデータをすべて削除するボタン（確認ステップ付き / 003 FR-007）。
 * 取り込みが 0 件のときは押せない。一覧の取得に失敗している場合は、破損データの掃除に使えるよう押せるままにする。
 * 削除成功後は取り込み系クエリが無効化され、ホームのウィジェット・履歴一覧が再取得される
 */
export const DeleteAllImportsButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDeleted, setIsDeleted] = useState(false);
    const importsQuery = useImports();
    const { mutateAsync: deleteAllImports, isPending } = useDeleteAllImports();

    const importCount = importsQuery.data?.length ?? 0;
    const hasNothingToDelete = importsQuery.isSuccess && importCount === 0;
    const isDisabled = importsQuery.isPending || hasNothingToDelete;

    const handleConfirm = async () => {
        setError(null);
        setIsDeleted(false);
        const result = await deleteAllImports();
        setIsOpen(false);
        if (result.success) {
            setIsDeleted(true);
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div>
                <Button type="button" variant="destructive" disabled={isDisabled} onClick={() => setIsOpen(true)}>
                    取り込んだデータをすべて削除
                </Button>
            </div>
            <ConfirmDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                title="取り込んだデータをすべて削除しますか？"
                description={`このブラウザに保存されている取り込み履歴 ${importCount} 件とフォロワー一覧をすべて削除します。この操作は取り消せません。`}
                confirmLabel="削除する"
                destructive
                isPending={isPending}
                onConfirm={handleConfirm}
            />
            {isDeleted && (
                <p role="status" className="text-muted-foreground text-sm">
                    取り込んだデータを削除しました。
                </p>
            )}
            {error && (
                <div role="alert" className="text-red-700 text-sm dark:text-red-400">
                    {error}
                </div>
            )}
        </div>
    );
};
