'use client';

import { useState } from 'react';

import { useDeleteImport } from '@/features/follower-import/hooks';
import { ConfirmDialog } from '@/shared/components/feedback/ConfirmDialog';
import { Button } from '@/shared/components/ui/Button';

interface DeleteImportButtonProps {
    importId: string;
}

/**
 * 取り込みの削除ボタン（確認ステップ付き / FR-007）。
 * 削除成功後は取り込み系クエリが無効化され、履歴一覧・ダッシュボードが再取得される
 */
export const DeleteImportButton = ({ importId }: DeleteImportButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { mutateAsync: deleteImport, isPending } = useDeleteImport();

    const handleConfirm = async () => {
        setError(null);
        const result = await deleteImport(importId);
        setIsOpen(false);
        if (!result.success) setError(result.error);
    };

    return (
        <div className="flex flex-col gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
                削除
            </Button>
            <ConfirmDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                title="この取り込みを削除しますか？"
                description="削除すると、この取り込みのフォロワー一覧は失われ、残った記録同士で差分が計算し直されます。"
                confirmLabel="削除する"
                destructive
                isPending={isPending}
                onConfirm={handleConfirm}
            />
            {error && (
                <div role="alert" className="text-red-700 text-sm dark:text-red-400">
                    {error}
                </div>
            )}
        </div>
    );
};
