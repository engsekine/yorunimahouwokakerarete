'use client';

import { useState } from 'react';

import { ConfirmDialog } from '@/shared/components/feedback/ConfirmDialog';
import { Button } from '@/shared/components/ui/Button';

interface ReplaceAllAndImportButtonProps {
    /** 保存済みの記録件数（確認文言に表示） */
    storedCount: number;
    /** 保存済みの別アカウント ID（確認文言に表示） */
    conflictingAccountUsername: string;
    /** 取り込み処理中（ボタンとダイアログの実行ボタンを無効化） */
    isPending: boolean;
    /** 確認ダイアログで承諾されたときに呼ばれる。親が uploadImport({ replaceExisting: true }) を実行する */
    onConfirm: () => void;
}

/**
 * 別アカウントの記録が保存されていて取り込みが拒否されたときの導線（007 FR-007a）。
 * 「既存の記録をすべて削除して取り込む」を破壊的操作として確認ダイアログ付きで提供する。
 * 削除と保存は親側の 1 アクションで原子的に行われ、確認を取り消した場合は何も変更しない
 */
export const ReplaceAllAndImportButton = ({
    storedCount,
    conflictingAccountUsername,
    isPending,
    onConfirm,
}: ReplaceAllAndImportButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleConfirm = () => {
        setIsOpen(false);
        onConfirm();
    };

    return (
        <div>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => setIsOpen(true)}>
                既存の記録をすべて削除して取り込む
            </Button>
            <ConfirmDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                title="保存済みの記録をすべて削除して取り込みますか？"
                description={`@${conflictingAccountUsername} の取り込み記録 ${storedCount} 件とフォロワー一覧をすべて削除してから、新しいエクスポートを取り込みます。この操作は取り消せません。`}
                confirmLabel="削除して取り込む"
                destructive
                isPending={isPending}
                onConfirm={handleConfirm}
            />
        </div>
    );
};
