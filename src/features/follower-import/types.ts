/** 取り込み 1 件の要約（履歴・ダッシュボード・差分ヘッダーで使う） */
export interface ImportSummary {
    id: string;
    accountUsername: string;
    followersCount: number;
    followingCount: number;
    /** ISO 8601 */
    importedAt: string;
}

/** 一覧・差分に表示する相手 1 人分 */
export interface DiffEntry {
    username: string;
    profileUrl: string;
}

export interface ImportDiff {
    current: ImportSummary;
    /** null = 初回取り込み（比較対象なし） */
    previous: ImportSummary | null;
    gained: DiffEntry[];
    lost: DiffEntry[];
}

/**
 * ダッシュボード向けの比較要約（件数のみ・一覧は含めない / 007 FR-015〜017）。
 * 差分画面と同じ computeFollowerDiff から導出するため件数は常に一致する
 */
export interface ComparisonSummary {
    current: ImportSummary;
    /** 同じアカウント ID の直前の記録。null = 比較対象なし */
    previous: ImportSummary | null;
    /** current.followersCount - previous.followersCount。previous 無しは null */
    followerDelta: number | null;
    gainedCount: number;
    lostCount: number;
}

export interface MutualAnalysis {
    /** 自分がフォローしているのにフォローバックされていない相手 */
    notFollowingBack: DiffEntry[];
    /** フォローされているのに自分がフォローバックしていない相手 */
    notFollowedBack: DiffEntry[];
}

/** 取り込み詳細画面が必要とするデータ一式（差分 + 分析 + メンバー一覧） */
export interface ImportDetail {
    diff: ImportDiff;
    /** following 未同梱なら null */
    analysis: MutualAnalysis | null;
    followers: DiffEntry[];
    /** following 未同梱なら null（フォロワーのみの取り込み） */
    following: DiffEntry[] | null;
}
