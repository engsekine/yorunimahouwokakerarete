import type { ImportSummary } from '../../types';

/**
 * 取り込み記録の保持ルールと比較対象の決定（純関数・I/O なし / 007 research Decision 1）。
 *
 * - 本アプリで比較できるアカウントは 1 つ。別アカウントの記録が残っていれば取り込みを拒否する（FR-007）
 * - 保存する記録はブラウザ全体で最大 maxRetained 件（最新 + 前回）。超える分は古い順に取り除く（FR-004）
 * - 旧データ（上限超過・別アカウント混在）も同じルールで次回取り込み時に整理する（FR-011）
 */

/** アカウント ID の同一性キー（前後の空白を除き小文字化）。actions / repository / フォームで共用する */
export const normalizeAccountUsername = (value: string): string => value.trim().toLowerCase();

/** 取込日時の新しい順。同一日時は id の降順で安定させ、順序が入れ替わらないようにする */
export const sortImportsNewestFirst = (imports: ReadonlyArray<ImportSummary>): ImportSummary[] =>
    [...imports].sort((a, b) => {
        if (a.importedAt !== b.importedAt) return b.importedAt.localeCompare(a.importedAt);
        return b.id.localeCompare(a.id);
    });

export interface RetentionOptions {
    /** 保持する記録の上限（新規保存分を含む） */
    maxRetained: number;
    /** 既存の記録をすべて取り除いて保存する（別アカウントへの切り替え / FR-007a） */
    replaceAll: boolean;
}

export interface RetentionPlan {
    kind: 'ok' | 'account_conflict';
    /** ok のとき、新規保存と同時に取り除く記録 id（古い順） */
    removeImportIds: string[];
    /** account_conflict のとき、保存済みの別アカウント ID（最新の記録のもの） */
    conflictingAccountUsername: string | null;
}

/**
 * 新しい記録を保存するときに何を取り除くか（または拒否するか）を決める。
 * `incomingAccountUsername` は正規化済みであること
 */
export const planRetention = (
    existing: ReadonlyArray<ImportSummary>,
    incomingAccountUsername: string,
    { maxRetained, replaceAll }: RetentionOptions,
): RetentionPlan => {
    const sorted = sortImportsNewestFirst(existing);

    if (replaceAll) {
        return { kind: 'ok', removeImportIds: sorted.map((summary) => summary.id), conflictingAccountUsername: null };
    }

    const conflicting = sorted.find(
        (summary) => normalizeAccountUsername(summary.accountUsername) !== incomingAccountUsername,
    );
    if (conflicting) {
        return {
            kind: 'account_conflict',
            removeImportIds: [],
            conflictingAccountUsername: normalizeAccountUsername(conflicting.accountUsername),
        };
    }

    /** 新規 1 件 + 直近 (maxRetained - 1) 件を残し、それより古い記録はすべて取り除く */
    const keepCount = Math.max(maxRetained - 1, 0);
    const removeImportIds = sorted.slice(keepCount).map((summary) => summary.id);
    return { kind: 'ok', removeImportIds, conflictingAccountUsername: null };
};
