import { listNames, readJson, type StorageWrite, writeAtomically } from '@/shared/lib/storage';

import type { ImportEntryKind } from '../constants';
import { decodeEntries, encodeEntries, type StoredEntry } from '../lib/entry-codec';
import type { ParsedEntry } from '../lib/parse-export';
import { normalizeAccountUsername, sortImportsNewestFirst } from '../lib/retention';
import type { ImportSummary } from '../types';

/**
 * フォロワーインポートのブラウザ保存（localStorage）アクセス層。
 *
 * - `follower-imports`: 取り込みサマリの配列
 * - `follower-import-entries:<importId>:<kind>`: 種別ごとの一覧（圧縮形式）
 *
 * 書き込みは writeAtomically で「全件成功 or 全件取り消し」にし、
 * サマリ配列を最後に書くことで、途中失敗時に中途半端な取り込みが一覧に現れないようにする（FR-009）。
 */

const IMPORTS_KEY = 'follower-imports';
const ENTRIES_KEY_PREFIX = 'follower-import-entries:';

const entriesKey = (importId: string, kind: ImportEntryKind): string => `${ENTRIES_KEY_PREFIX}${importId}:${kind}`;

const isImportSummary = (value: unknown): value is ImportSummary => {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return (
        typeof record['id'] === 'string' &&
        typeof record['accountUsername'] === 'string' &&
        typeof record['followersCount'] === 'number' &&
        typeof record['followingCount'] === 'number' &&
        typeof record['importedAt'] === 'string'
    );
};

/** 全取り込みサマリを取込日時の新しい順（同一日時は id 降順・安定）で返す。破損した要素は除外する */
export const readImports = (): ImportSummary[] => {
    const raw = readJson<unknown>(IMPORTS_KEY);
    if (!Array.isArray(raw)) return [];
    return sortImportsNewestFirst(raw.filter(isImportSummary));
};

export const readImport = (importId: string): ImportSummary | null =>
    readImports().find((summary) => summary.id === importId) ?? null;

/** a が b より前（古い）か。同一日時は id で決め、readImports の並びと矛盾しないようにする */
const isBefore = (a: ImportSummary, b: ImportSummary): boolean =>
    a.importedAt !== b.importedAt ? a.importedAt < b.importedAt : a.id < b.id;

/**
 * 指定取り込みの比較対象: **同じアカウント ID** を持ち、それより前に取り込まれた最新の記録（007 FR-002）。
 * 別アカウントの記録は旧データとして残っていても比較対象にしない。無ければ null
 */
export const readPreviousImport = (current: ImportSummary): ImportSummary | null => {
    const account = normalizeAccountUsername(current.accountUsername);
    return (
        readImports().find(
            (summary) => normalizeAccountUsername(summary.accountUsername) === account && isBefore(summary, current),
        ) ?? null
    );
};

/** 指定取り込み・種別の一覧エントリを username 昇順で返す。未保存なら空配列 */
export const readEntries = (importId: string, kind: ImportEntryKind): StoredEntry[] =>
    decodeEntries(readJson<unknown>(entriesKey(importId, kind)));

export interface NewImportRecord {
    summary: ImportSummary;
    followers: ParsedEntry[];
    following: ParsedEntry[];
    /** 新規保存と同時に取り除く記録 id（保持ルール planRetention の結果）。既定は取り除かない */
    removeImportIds?: string[];
}

/**
 * 取り込みを保存する。「取り除く記録のエントリ削除 → 新規エントリ 2 種 → サマリ配列」の順で
 * 1 回の原子的書き込みにまとめる（007 research Decision 2）。削除を先にして容量を空け、
 * サマリ配列を最後にすることで途中失敗時に新しい取り込みが一覧に現れない。
 * 容量超過等で失敗した場合は StorageQuotaError / Error を throw し、取り除いた記録も含めて保存前の状態に戻る
 */
export const saveImport = ({ summary, followers, following, removeImportIds = [] }: NewImportRecord): void => {
    const removed = new Set([...removeImportIds, summary.id]);
    const imports = readImports().filter((existing) => !removed.has(existing.id));
    const removals: StorageWrite[] = removeImportIds.flatMap((importId) => [
        { name: entriesKey(importId, 'follower'), value: null },
        { name: entriesKey(importId, 'following'), value: null },
    ]);
    writeAtomically([
        ...removals,
        { name: entriesKey(summary.id, 'follower'), value: encodeEntries(followers) },
        { name: entriesKey(summary.id, 'following'), value: encodeEntries(following) },
        { name: IMPORTS_KEY, value: [...imports, summary] },
    ]);
};

/** 取り込みとそのエントリを削除する（follower_imports の on delete cascade 相当） */
export const deleteImportRecord = (importId: string): void => {
    const remaining = readImports().filter((summary) => summary.id !== importId);
    const writes: StorageWrite[] = [
        { name: IMPORTS_KEY, value: remaining },
        { name: entriesKey(importId, 'follower'), value: null },
        { name: entriesKey(importId, 'following'), value: null },
    ];
    writeAtomically(writes);
};

/**
 * すべての取り込み（サマリ配列 + 全エントリキー）を削除する。
 * サマリに紐づかない孤立エントリも含めてプレフィックスで列挙し、1 回の原子的書き込みで消す。
 * 取り込みが無い状態で呼んでも何も起きない（冪等）
 */
export const deleteAllImportRecords = (): void => {
    const entryNames = listNames(ENTRIES_KEY_PREFIX);
    const writes: StorageWrite[] = [
        { name: IMPORTS_KEY, value: null },
        ...entryNames.map((name) => ({ name, value: null })),
    ];
    writeAtomically(writes);
};

/** サマリに対応しない孤立したエントリキーを削除する（途中失敗の掃除用・通常は発生しない） */
export const pruneOrphanEntries = (): void => {
    const knownIds = new Set(readImports().map((summary) => summary.id));
    const orphans = listNames(ENTRIES_KEY_PREFIX).filter((name) => {
        const importId = name.slice(ENTRIES_KEY_PREFIX.length).split(':')[0];
        return importId !== undefined && !knownIds.has(importId);
    });
    if (orphans.length === 0) return;
    writeAtomically(orphans.map((name) => ({ name, value: null })));
};
