import type { ImportEntryKind } from '../constants';
import { computeFollowerDiff, computeMutualAnalysis } from '../lib/diff';
import type { ComparisonSummary, DiffEntry, ImportDetail, ImportDiff, ImportSummary, MutualAnalysis } from '../types';
import { readEntries, readImport, readImports, readPreviousImport } from './repository';

/**
 * フォロワーインポートの読み取り API。
 * データはこのブラウザの localStorage にのみ存在するため、他のユーザー・他の端末からは到達できない（FR-011）。
 * 非同期にしているのは TanStack Query の queryFn として扱いやすくするためで、実体は同期読み出し
 */

const toDiffEntries = (importId: string, kind: ImportEntryKind): DiffEntry[] =>
    readEntries(importId, kind).map(({ username, profileUrl }) => ({ username, profileUrl }));

/** 取り込みサマリを新しい順で返す */
export const listImports = async (): Promise<ImportSummary[]> => readImports();

/** 指定取り込みの一覧エントリ（種別ごと）を全件・username 昇順で返す（005 一覧表示） */
export const getImportEntries = async (importId: string, kind: ImportEntryKind): Promise<DiffEntry[]> =>
    toDiffEntries(importId, kind);

/**
 * ダッシュボード用の比較要約（件数のみ・007 FR-015〜017）。取り込みが無ければ null。
 * 差分画面（getImportDiff）と同じ readPreviousImport / computeFollowerDiff を通すため件数は常に一致する。
 * 一覧は返さない（一覧は差分画面の役割）
 */
export const getLatestComparisonSummary = async (): Promise<ComparisonSummary | null> => {
    const current = readImports()[0];
    if (!current) return null;

    const previous = readPreviousImport(current);
    if (!previous) return { current, previous: null, followerDelta: null, gainedCount: 0, lostCount: 0 };

    const { gained, lost } = computeFollowerDiff(
        toDiffEntries(current.id, 'follower'),
        toDiffEntries(previous.id, 'follower'),
    );
    return {
        current,
        previous,
        followerDelta: current.followersCount - previous.followersCount,
        gainedCount: gained.length,
        lostCount: lost.length,
    };
};

/** 同じアカウント ID の直前の取り込みとの差分（007 FR-002）。存在しない id は null */
export const getImportDiff = async (importId: string): Promise<ImportDiff | null> => {
    const current = readImport(importId);
    if (!current) return null;

    const previous = readPreviousImport(current);
    if (!previous) return { current, previous: null, gained: [], lost: [] };

    const { gained, lost } = computeFollowerDiff(
        toDiffEntries(current.id, 'follower'),
        toDiffEntries(previous.id, 'follower'),
    );
    return { current, previous, gained, lost };
};

/** フォロー関係の分析。following 未同梱の取り込みでは提供しない（US4 シナリオ 2） */
export const getMutualAnalysis = async (importId: string): Promise<MutualAnalysis | null> => {
    const current = readImport(importId);
    if (!current || current.followingCount === 0) return null;

    return computeMutualAnalysis(toDiffEntries(current.id, 'follower'), toDiffEntries(current.id, 'following'));
};

/** 取り込み詳細画面に必要なデータをまとめて返す。存在しない id は null */
export const getImportDetail = async (importId: string): Promise<ImportDetail | null> => {
    const diff = await getImportDiff(importId);
    if (!diff) return null;

    const [analysis, followers, followingEntries] = await Promise.all([
        getMutualAnalysis(importId),
        getImportEntries(importId, 'follower'),
        getImportEntries(importId, 'following'),
    ]);
    /** フォロー中が取り込みに未同梱なら null で区別する（005） */
    const following = diff.current.followingCount === 0 ? null : followingEntries;

    return { diff, analysis, followers, following };
};
