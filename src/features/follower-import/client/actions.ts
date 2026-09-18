import { StorageQuotaError, StorageUnavailableError } from '@/shared/lib/storage';
import { type ActionResult, actionFailure, actionSuccess } from '@/shared/types/action-result';

import {
    accountConflictMessage,
    IMPORT_ERROR_MESSAGES,
    MAX_ACCOUNT_USERNAME_LENGTH,
    MAX_RETAINED_IMPORTS,
    MAX_UPLOAD_BYTES,
} from '../constants';
import { ParseExportError, parseExportFiles } from '../lib/parse-export';
import { normalizeAccountUsername, planRetention } from '../lib/retention';
import type { ImportSummary } from '../types';
import { deleteAllImportRecords, deleteImportRecord, readImport, readImports, saveImport } from './repository';

/**
 * フォロワーインポートの更新 API。
 * 解析から保存までブラウザ内で完結し、ファイル内容はどこにも送信しない。
 * 戻り値は ActionResult で統一し、呼び出し側（フォーム）は success で分岐する
 */

export interface UploadFile {
    name: string;
    data: Uint8Array;
}

export interface UploadImportInput {
    files: UploadFile[];
    /** 対象アカウント ID。空なら保存済み記録のアカウント ID を引き継ぐ */
    accountUsername: string;
    /** エクスポート内の本人アカウント名との相違（入力ミスの可能性）を承知のうえで続行する（007 FR-008） */
    confirmMismatch: boolean;
    /** 既存の記録をすべて削除して取り込む（別アカウントへの切り替え・確認ダイアログ承諾後のみ true / 007 FR-007a） */
    replaceExisting: boolean;
}

const isZip = (name: string): boolean => name.toLowerCase().endsWith('.zip');

/**
 * 新しい記録の取込日時。保存済みの最新記録と同一時刻（同一ミリ秒の連続取り込み・端末時刻の巻き戻り）でも
 * 新しい方が必ず最新になるよう、最新記録より後の時刻を保証する（007 Edge Case「同一日時の取り込み」）
 */
const nextImportedAt = (imports: ReadonlyArray<ImportSummary>): string => {
    const now = Date.now();
    const latest = imports[0] ? Date.parse(imports[0].importedAt) : Number.NaN;
    const floor = Number.isNaN(latest) ? now : latest + 1;
    return new Date(Math.max(now, floor)).toISOString();
};

/** 保存系の例外をユーザー向け ActionResult に変換する（生のエラーは表示しない） */
const toStorageFailure = (error: unknown): ActionResult<never> | null => {
    if (error instanceof StorageQuotaError) return actionFailure(IMPORT_ERROR_MESSAGES.storage_full, 'storage_full');
    if (error instanceof StorageUnavailableError) {
        return actionFailure(IMPORT_ERROR_MESSAGES.storage_unavailable, 'storage_unavailable');
    }
    return null;
};

export const uploadImport = async (input: UploadImportInput): Promise<ActionResult<{ importId: string }>> => {
    /**
     * サイズ検証（FR-008）。ZIP は必要ファイルだけを展開するため ZIP 自体は上限の対象外とし、
     * 展開後サイズはパーサ側の MAX_UNCOMPRESSED_BYTES で制限する
     */
    let totalBytes = 0;
    for (const file of input.files) {
        if (isZip(file.name)) continue;
        totalBytes += file.data.byteLength;
        if (file.data.byteLength > MAX_UPLOAD_BYTES || totalBytes > MAX_UPLOAD_BYTES) {
            return actionFailure(IMPORT_ERROR_MESSAGES.too_large, 'too_large');
        }
    }
    if (input.files.length === 0) return actionFailure(IMPORT_ERROR_MESSAGES.invalid_export, 'invalid_export');

    let parsed: ReturnType<typeof parseExportFiles>;
    try {
        parsed = parseExportFiles(input.files);
    } catch (error) {
        if (error instanceof ParseExportError) {
            if (error.code === 'zip_too_large') return actionFailure(IMPORT_ERROR_MESSAGES.zip_too_large, 'too_large');
            return actionFailure(IMPORT_ERROR_MESSAGES.invalid_export, 'invalid_export');
        }
        throw error;
    }

    let imports: ImportSummary[];
    try {
        imports = readImports();
    } catch (error) {
        return toStorageFailure(error) ?? actionFailure(IMPORT_ERROR_MESSAGES.upload_failed);
    }

    /** アカウント ID の解決。空なら保存済み記録の値を引き継ぐ（007 FR-012 の (2)） */
    const storedUsername = imports[0]?.accountUsername ?? null;
    const accountUsername = normalizeAccountUsername(
        input.accountUsername !== '' ? input.accountUsername : (storedUsername ?? ''),
    );
    if (accountUsername === '') return actionFailure('アカウント ID を入力してください');
    if (accountUsername.length > MAX_ACCOUNT_USERNAME_LENGTH) {
        return actionFailure(IMPORT_ERROR_MESSAGES.account_username_too_long);
    }

    /**
     * 入力ミス検出（007 FR-008）: エクスポート内の本人名と異なれば確認を求める。
     * 別アカウント拒否（FR-007）より先に判定し、誤入力のまま全削除へ進む事故を防ぐ
     */
    const mismatchesOwner = parsed.ownerUsername !== null && parsed.ownerUsername !== accountUsername;
    if (mismatchesOwner && !input.confirmMismatch) {
        return actionFailure(IMPORT_ERROR_MESSAGES.account_mismatch, 'account_mismatch');
    }

    /** 保持ルール（007 FR-004 / FR-007 / FR-011）: 何を取り除くか、または拒否するか */
    const plan = planRetention(imports, accountUsername, {
        maxRetained: MAX_RETAINED_IMPORTS,
        replaceAll: input.replaceExisting,
    });
    if (plan.kind === 'account_conflict') {
        return actionFailure(accountConflictMessage(plan.conflictingAccountUsername ?? ''), 'account_conflict');
    }

    const summary: ImportSummary = {
        id: crypto.randomUUID(),
        accountUsername,
        followersCount: parsed.followers.length,
        followingCount: parsed.following.length,
        importedAt: nextImportedAt(imports),
    };

    /** 取り除き → エントリ → サマリの順で原子的に保存する（途中失敗時は保存前の状態に戻る / FR-005 / FR-007a） */
    try {
        saveImport({
            summary,
            followers: parsed.followers,
            following: parsed.following,
            removeImportIds: plan.removeImportIds,
        });
    } catch (error) {
        const failure = toStorageFailure(error);
        if (failure) return failure;
        console.error('[uploadImport] save error:', error);
        return actionFailure(IMPORT_ERROR_MESSAGES.upload_failed);
    }

    return actionSuccess({ importId: summary.id });
};

export const deleteImport = async (importId: string): Promise<ActionResult> => {
    try {
        /** 存在しない取り込みは同一メッセージで拒否する */
        if (!readImport(importId)) return actionFailure('対象の取り込みが見つかりません');
        deleteImportRecord(importId);
    } catch (error) {
        const failure = toStorageFailure(error);
        if (failure) return failure;
        console.error('[deleteImport] error:', error);
        return actionFailure('削除に失敗しました。時間をおいて再度お試しください');
    }

    return actionSuccess();
};

/**
 * このブラウザに保存された取り込みデータ（履歴・フォロワー一覧）をすべて削除する。
 * ホームの「取り込んだデータをすべて削除」から呼ぶ。取り込みが無くても success を返す（冪等）
 */
export const deleteAllImports = async (): Promise<ActionResult> => {
    try {
        deleteAllImportRecords();
    } catch (error) {
        const failure = toStorageFailure(error);
        if (failure) return failure;
        console.error('[deleteAllImports] error:', error);
        return actionFailure('データの削除に失敗しました。時間をおいて再度お試しください');
    }

    return actionSuccess();
};
