import type { ParsedEntry } from '../parse-export';

/** 保存する相手 1 人分（種別は保存キー側で持つため含めない） */
export interface StoredEntry {
    username: string;
    profileUrl: string;
    /** ISO 8601。無ければ null */
    followedAt: string | null;
}

/**
 * localStorage 上の 1 エントリ。
 * `[username, followedAt(epoch 秒) | null, profileUrl?]` のタプル。
 * 正規 URL（https://www.instagram.com/<username>）は省略し、異なる場合のみ 3 要素目に保存する。
 * キー名・ISO 文字列を持たないことで 1 万件規模でも数百 KB に収め、localStorage の容量上限（5MB 前後）を節約する
 */
export type EncodedEntry = [string, number | null] | [string, number | null, string];

const canonicalProfileUrl = (username: string): string => `https://www.instagram.com/${username}`;

const toEpochSeconds = (iso: string | null): number | null => {
    if (iso === null) return null;
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
};

export const encodeEntry = (entry: Pick<ParsedEntry, 'username' | 'profileUrl' | 'followedAt'>): EncodedEntry => {
    const followedAt = toEpochSeconds(entry.followedAt);
    return entry.profileUrl === canonicalProfileUrl(entry.username)
        ? [entry.username, followedAt]
        : [entry.username, followedAt, entry.profileUrl];
};

export const decodeEntry = (encoded: EncodedEntry): StoredEntry => {
    const [username, followedAt, profileUrl] = encoded;
    return {
        username,
        profileUrl: profileUrl ?? canonicalProfileUrl(username),
        followedAt: followedAt === null ? null : new Date(followedAt * 1000).toISOString(),
    };
};

/** 一覧を username 昇順で符号化する（保存時に並べ替えておき、読み出しは並び順を保証する） */
export const encodeEntries = (entries: ReadonlyArray<Pick<ParsedEntry, 'username' | 'profileUrl' | 'followedAt'>>) =>
    [...entries].sort((a, b) => a.username.localeCompare(b.username)).map(encodeEntry);

/** 符号化済み配列を復号する。配列でない・要素の形が違う（破損）場合は空配列にする */
export const decodeEntries = (encoded: unknown): StoredEntry[] => {
    if (!Array.isArray(encoded)) return [];
    return encoded
        .filter(
            (item): item is EncodedEntry =>
                Array.isArray(item) &&
                typeof item[0] === 'string' &&
                (item[1] === null || typeof item[1] === 'number') &&
                (item.length === 2 || typeof item[2] === 'string'),
        )
        .map(decodeEntry);
};
