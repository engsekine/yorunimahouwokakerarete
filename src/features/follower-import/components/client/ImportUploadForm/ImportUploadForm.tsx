'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import type { UploadFile } from '@/features/follower-import/client/actions';
import {
    accountSwitchNotice,
    IMPORT_ERROR_MESSAGES,
    MAX_ACCOUNT_USERNAME_LENGTH,
    MAX_RETAINED_IMPORTS,
    OWNER_AUTOFILL_NOTICE,
    retentionNotice,
} from '@/features/follower-import/constants';
import { useUploadImport } from '@/features/follower-import/hooks';
import { peekOwnerUsername } from '@/features/follower-import/lib/parse-export';
import { normalizeAccountUsername } from '@/features/follower-import/lib/retention';
import type { ImportSummary } from '@/features/follower-import/types';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { formatJstDateTime } from '@/shared/lib/date';

import { ReplaceAllAndImportButton } from '../ReplaceAllAndImportButton';

interface ImportUploadFormProps {
    /** 保存済みの取り込み記録（新しい順）。既定値・取り込み前の案内・別アカウント判定に使う */
    storedImports: ImportSummary[];
}

/**
 * 選択されたファイルをブラウザ内で読み込み、取り込み処理へ渡す形（name + bytes）にする。
 * ZIP の展開・解析は取り込み処理側（parseExportFiles）で行い、内容はどこにも送信しない。
 * ファイルは FormData(form) 経由ではなく input.files から読む（FormData(form) は
 * 環境によりファイル内容を引き継がないため）
 */
const readSelectedFiles = async (files: FileList | null): Promise<UploadFile[]> =>
    Promise.all(
        [...(files ?? [])].map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) })),
    );

/**
 * エクスポートファイルの取り込みフォーム（007 screens/imports-and-dashboard.md）。
 *
 * - アカウント ID はエクスポート内の本人名 → 保存済み記録の ID → 手入力の優先順で既定値を決める（FR-012）
 * - 保存上限に達している / 別アカウントを入力中 の案内を取り込み前に表示する（FR-006 / Edge Case）
 * - account_mismatch（本人名との相違）は確認チェックで続行、account_conflict（別アカウントの記録あり）は
 *   「既存の記録をすべて削除して取り込む」（確認ダイアログ付き）で切り替える（FR-008 / FR-007a）
 */
export const ImportUploadForm = ({ storedImports }: ImportUploadFormProps) => {
    const router = useRouter();
    const { mutateAsync: uploadImport, isPending } = useUploadImport();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const storedAccountUsername = storedImports[0]?.accountUsername ?? null;
    const [accountUsername, setAccountUsername] = useState(storedAccountUsername ?? '');
    const [isAccountDirty, setIsAccountDirty] = useState(false);
    const [autofillNotice, setAutofillNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [needsMismatchConfirm, setNeedsMismatchConfirm] = useState(false);
    const [conflictingAccountUsername, setConflictingAccountUsername] = useState<string | null>(null);

    const normalizedInput = normalizeAccountUsername(accountUsername);
    const normalizedStored = storedAccountUsername === null ? null : normalizeAccountUsername(storedAccountUsername);
    const isSwitchingAccount =
        normalizedStored !== null && normalizedInput !== '' && normalizedInput !== normalizedStored;
    const isAtRetentionLimit = storedImports.length >= MAX_RETAINED_IMPORTS && !isSwitchingAccount;
    const oldestImport = storedImports.at(-1);

    /** ファイル選択時に本人名だけを軽量に取り出し、手編集前なら既定値として自動入力する（FR-012 の (1)） */
    const handleFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setAutofillNotice(null);
        let files: UploadFile[];
        try {
            files = await readSelectedFiles(event.target.files);
        } catch {
            return;
        }
        const owner = peekOwnerUsername(files);
        if (owner === null || isAccountDirty) return;
        setAccountUsername(owner);
        setAutofillNotice(OWNER_AUTOFILL_NOTICE);
    };

    const handleAccountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAccountUsername(event.target.value);
        setIsAccountDirty(true);
        setAutofillNotice(null);
    };

    const submit = async (options: { confirmMismatch: boolean; replaceExisting: boolean }) => {
        setError(null);
        setConflictingAccountUsername(null);

        let uploadFiles: UploadFile[];
        try {
            uploadFiles = await readSelectedFiles(fileInputRef.current?.files ?? null);
        } catch {
            setError(IMPORT_ERROR_MESSAGES.invalid_export);
            return;
        }

        const result = await uploadImport({ files: uploadFiles, accountUsername, ...options });
        if (!result.success) {
            setError(result.error);
            if (result.code === 'account_mismatch') setNeedsMismatchConfirm(true);
            if (result.code === 'account_conflict') {
                /** 保存済みのうち入力と異なるアカウント ID（旧データ混在時は最新のもの）を確認文言に出す */
                const conflicting =
                    storedImports.find((s) => normalizeAccountUsername(s.accountUsername) !== normalizedInput) ??
                    storedImports[0];
                setConflictingAccountUsername(conflicting?.accountUsername ?? '');
            }
            return;
        }
        router.push(`/imports/${result.importId}` as Route);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await submit({ confirmMismatch: formData.get('confirmMismatch') === 'true', replaceExisting: false });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1">
                <label htmlFor="import-files" className="font-medium text-sm">
                    エクスポートファイル（ZIP そのまま、または followers_and_following の HTML / JSON・複数選択可）
                </label>
                <Input
                    id="import-files"
                    name="files"
                    type="file"
                    accept=".zip,.html,.json"
                    multiple
                    required
                    ref={fileInputRef}
                    onChange={handleFilesChange}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="account-username" className="font-medium text-sm">
                    対象の Instagram アカウント ID
                </label>
                <Input
                    id="account-username"
                    name="accountUsername"
                    type="text"
                    autoComplete="off"
                    value={accountUsername}
                    onChange={handleAccountChange}
                    maxLength={MAX_ACCOUNT_USERNAME_LENGTH}
                    required={storedAccountUsername === null}
                />
                <p role="status" className="text-muted-foreground text-xs">
                    {autofillNotice}
                </p>
            </div>

            {/* 取り込み前の案内（確認操作は要求しない） */}
            <div role="status" className="text-muted-foreground text-sm">
                {isSwitchingAccount && storedAccountUsername !== null ? (
                    <p>{accountSwitchNotice(storedAccountUsername)}</p>
                ) : isAtRetentionLimit && oldestImport ? (
                    <p>{retentionNotice(formatJstDateTime(oldestImport.importedAt))}</p>
                ) : null}
            </div>

            {needsMismatchConfirm && (
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="confirmMismatch" value="true" />
                    入力ミスではないことを確認したうえで取り込む
                </label>
            )}

            {error && (
                <div role="alert" className="flex flex-col gap-3 text-red-700 text-sm dark:text-red-400">
                    <p>{error}</p>
                    {conflictingAccountUsername !== null && (
                        <ReplaceAllAndImportButton
                            storedCount={storedImports.length}
                            conflictingAccountUsername={conflictingAccountUsername}
                            isPending={isPending}
                            onConfirm={() => void submit({ confirmMismatch: true, replaceExisting: true })}
                        />
                    )}
                </div>
            )}

            <div aria-live="polite" className="text-muted-foreground text-sm">
                {isPending ? '取り込み中です。しばらくお待ちください…' : null}
            </div>

            <div>
                <Button type="submit" disabled={isPending} aria-busy={isPending}>
                    {isPending ? '取り込み中...' : '取り込む'}
                </Button>
            </div>
        </form>
    );
};
