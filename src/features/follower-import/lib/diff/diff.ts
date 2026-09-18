import type { DiffEntry, MutualAnalysis } from '../../types';

/** 集合差（a - b）。username 昇順で返す純関数 */
export const difference = (a: DiffEntry[], b: DiffEntry[]): DiffEntry[] => {
    const bSet = new Set(b.map((entry) => entry.username));
    return a.filter((entry) => !bSet.has(entry.username)).sort((x, y) => x.username.localeCompare(y.username));
};

/**
 * 隣接する 2 つの取り込みのフォロワー集合から「新規」「解除」を導出する（research Decision 5）。
 * 新規 = 今回のみに存在・解除 = 前回のみに存在
 */
export const computeFollowerDiff = (
    currentFollowers: DiffEntry[],
    previousFollowers: DiffEntry[],
): { gained: DiffEntry[]; lost: DiffEntry[] } => ({
    gained: difference(currentFollowers, previousFollowers),
    lost: difference(previousFollowers, currentFollowers),
});

/** 同一取り込み内のフォロワー / フォロー中から非相互の 2 一覧を導出する（US4） */
export const computeMutualAnalysis = (followers: DiffEntry[], following: DiffEntry[]): MutualAnalysis => ({
    notFollowingBack: difference(following, followers),
    notFollowedBack: difference(followers, following),
});
