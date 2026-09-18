import { type UnzipFileInfo, unzipSync } from 'fflate';

import { type ImportEntryKind, MAX_UNCOMPRESSED_BYTES } from '../../constants';

export interface ParsedEntry {
    kind: ImportEntryKind;
    /** 小文字化・trim 済み（同定キー / research Decision 4） */
    username: string;
    profileUrl: string;
    /** ISO 8601。エクスポートに timestamp が無ければ null */
    followedAt: string | null;
}

export interface ParsedExport {
    followers: ParsedEntry[];
    following: ParsedEntry[];
    /** personal_information.json があれば本人 username（ベストエフォート照合用） */
    ownerUsername: string | null;
}

export type ParseExportErrorCode = 'no_target_files' | 'invalid_format' | 'zip_corrupted' | 'zip_too_large';

export interface ParseExportOptions {
    /** ZIP 展開後サイズの上限（bytes・対象ファイル合計）。既定は MAX_UNCOMPRESSED_BYTES */
    maxUncompressedBytes?: number;
}

export class ParseExportError extends Error {
    readonly code: ParseExportErrorCode;

    constructor(code: ParseExportErrorCode, message?: string) {
        super(message ?? code);
        this.name = 'ParseExportError';
        this.code = code;
    }
}

/** Instagram エクスポートの関係リスト 1 件分（string_list_data 形式） */
interface RelationshipItem {
    title?: string;
    string_list_data?: Array<{ href?: string; value?: string; timestamp?: number }>;
}

const normalizeUsername = (value: string): string => value.trim().toLowerCase();

/** プロフィール URL からユーザーネームを取り出す（`/_u/<username>` の深リンク形式にも対応） */
const usernameFromHref = (href: string | undefined): string | null => {
    const match = href?.match(/instagram\.com\/(?:_u\/)?([^/?#]+)/);
    return match?.[1] ?? null;
};

const toEntry = (kind: ImportEntryKind, item: RelationshipItem): ParsedEntry | null => {
    const data = item.string_list_data?.[0];
    /** value を持たない形式ゆれがあるため、value → href → title の順で解決する */
    const username = normalizeUsername(data?.value ?? usernameFromHref(data?.href) ?? item.title ?? '');
    if (username === '') return null;

    return {
        kind,
        username,
        /** href は /_u/ 深リンクのことがあるため、Web で開ける正規 URL を username から組み立てる */
        profileUrl: `https://www.instagram.com/${username}`,
        followedAt: typeof data?.timestamp === 'number' ? new Date(data.timestamp * 1000).toISOString() : null,
    };
};

const parseRelationshipItems = (kind: ImportEntryKind, items: unknown): ParsedEntry[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => toEntry(kind, item as RelationshipItem)).filter((entry) => entry !== null);
};

interface ResolvedRelationship {
    kind: ImportEntryKind;
    items: unknown;
}

/**
 * 関係リスト JSON から一覧と種別を解決する。エクスポートの形式ゆれに対応するため、
 * キー付きオブジェクトは **中身のキーを最優先** で種別を確定する
 * （relationships_following がファイル名 followers_1.json に入っていてもフォロー中として扱う）。
 * 素の配列（分割ファイル）はキーを持たないため、ファイル名（followers / following）で種別を決める。
 */
const resolveRelationship = (name: string, json: unknown): ResolvedRelationship | null => {
    if (!Array.isArray(json)) {
        const record = json as Record<string, unknown> | null;
        if (record?.['relationships_following'] !== undefined) {
            return { kind: 'following', items: record['relationships_following'] };
        }
        if (record?.['relationships_followers'] !== undefined) {
            return { kind: 'follower', items: record['relationships_followers'] };
        }
        return null;
    }
    /** following を先に判定する（'followers' と 'following' は互いに部分文字列でない） */
    if (name.includes('following')) return { kind: 'following', items: json };
    if (name.includes('followers')) return { kind: 'follower', items: json };
    return null;
};

const tryParseJson = (data: Uint8Array): unknown => {
    try {
        return JSON.parse(new TextDecoder().decode(data));
    } catch {
        return null;
    }
};

/** personal_information.json から本人 username を抽出する（構造が合わなければ null） */
const extractOwnerUsername = (json: unknown): string | null => {
    const profileUser = (json as { profile_user?: Array<{ string_map_data?: Record<string, { value?: string }> }> })
        ?.profile_user?.[0];
    const value = profileUser?.string_map_data?.['Username']?.value;
    return value ? normalizeUsername(value) : null;
};

const baseName = (path: string): string => path.split('/').pop() ?? path;

/** ZIP 内で展開対象にするファイルか（フォロワー / フォロー中一覧と本人情報のみ。メディア等は展開しない） */
const isTargetName = (path: string): boolean => {
    const name = baseName(path).toLowerCase();
    if (!name.endsWith('.json') && !name.endsWith('.html')) return false;
    return name.includes('followers') || name.includes('following') || name.includes('personal_information');
};

/**
 * ZIP を展開する。ZIP 爆弾（高圧縮率で展開後に数 GB になるファイル）によるメモリ枯渇を防ぐため、
 * ヘッダの展開後サイズを合計して上限を超えた時点で拒否し、対象外ファイルは展開自体をスキップする。
 * ヘッダを偽装された場合に備え、実際に展開されたサイズでも再検証する。
 */
const unzipWithLimit = (
    file: { name: string; data: Uint8Array },
    maxUncompressedBytes: number,
): Record<string, Uint8Array> => {
    let claimedTotal = 0;
    let exceeded = false;
    const filter = (entry: UnzipFileInfo): boolean => {
        if (!isTargetName(entry.name)) return false;
        claimedTotal += entry.originalSize;
        if (claimedTotal > maxUncompressedBytes) {
            exceeded = true;
            return false;
        }
        return true;
    };

    let unzipped: Record<string, Uint8Array>;
    try {
        unzipped = unzipSync(file.data, { filter });
    } catch {
        throw new ParseExportError('zip_corrupted', `ZIP を展開できません: ${file.name}`);
    }
    if (exceeded) {
        throw new ParseExportError('zip_too_large', `ZIP の展開後サイズが上限を超えています: ${file.name}`);
    }

    const actualTotal = Object.values(unzipped).reduce((sum, data) => sum + data.length, 0);
    if (actualTotal > maxUncompressedBytes) {
        throw new ParseExportError('zip_too_large', `ZIP の展開後サイズが上限を超えています: ${file.name}`);
    }
    return unzipped;
};

/**
 * Instagram プロフィールへのアンカー（HTML 形式のエクスポートの 1 エントリ）。
 * 各量指定子に上限を付けて、悪意ある HTML（`<a ` の連打・閉じタグ無し）でも
 * バックトラックが入力長の 2 乗にならないようにする（ReDoS 対策）。
 * 先頭を `href="` 固定にすることで、マッチ開始位置ごとの走査も定数長に収まる
 */
const PROFILE_ANCHOR_PATTERN =
    /href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]{1,300})"[^>]{0,500}>([^<]{1,200})<\/a>/g;

/**
 * HTML 形式のエクスポート（followers_1.html / following.html）からエントリを抽出する。
 * HTML にはタイムゾーン・ロケール依存の日時文字列しか無いため followedAt は null とする。
 */
const parseRelationshipHtml = (kind: ImportEntryKind, data: Uint8Array): ParsedEntry[] => {
    const html = new TextDecoder().decode(data);
    const entries: ParsedEntry[] = [];
    for (const match of html.matchAll(PROFILE_ANCHOR_PATTERN)) {
        const [, profileUrl, text] = match;
        const username = normalizeUsername(text ?? '');
        if (username === '' || !profileUrl) continue;
        entries.push({ kind, username, profileUrl, followedAt: null });
    }
    return entries;
};

const isPersonalInformationJson = (path: string): boolean => {
    const name = baseName(path).toLowerCase();
    return name.endsWith('.json') && name.includes('personal_information');
};

/**
 * ファイル群から本人アカウント名だけを軽量に取り出す（アカウント ID の自動入力用 / 007 FR-012・research Decision 5）。
 * JSON は名前に personal_information を含むものだけ読み、ZIP は同名エントリのみ展開する
 * （フォロワー一覧は展開・解析しないため 1 万件規模でも即応する）。
 * 見つからない・構造不一致・破損 ZIP・HTML 形式はすべて null を返し、throw しない
 */
export const peekOwnerUsername = (files: Array<{ name: string; data: Uint8Array }>): string | null => {
    const candidates: Uint8Array[] = [];
    for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
            try {
                const unzipped = unzipSync(file.data, { filter: (entry) => isPersonalInformationJson(entry.name) });
                candidates.push(...Object.values(unzipped));
            } catch {
                /** 破損 ZIP は取り込み実行時に zip_corrupted として案内するため、ここでは無視する */
            }
        } else if (isPersonalInformationJson(file.name)) {
            candidates.push(file.data);
        }
    }

    for (const data of candidates) {
        const owner = extractOwnerUsername(tryParseJson(data));
        if (owner) return owner;
    }
    return null;
};

/**
 * エクスポートファイル群（ZIP / JSON / HTML 混在可）からフォロワー・フォロー中一覧を抽出する（純関数）。
 * ファイル名パターンで探索するため、フォルダ構成の差異に依存しない（research Decision 1）。
 */
export const parseExportFiles = (
    files: Array<{ name: string; data: Uint8Array }>,
    options: ParseExportOptions = {},
): ParsedExport => {
    const maxUncompressedBytes = options.maxUncompressedBytes ?? MAX_UNCOMPRESSED_BYTES;

    /** ZIP は展開して中身のファイル群として扱う（展開後サイズは上限付き） */
    const flatFiles: Array<{ name: string; data: Uint8Array }> = [];
    for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
            const unzipped = unzipWithLimit(file, maxUncompressedBytes);
            for (const [path, data] of Object.entries(unzipped)) {
                flatFiles.push({ name: path, data });
            }
        } else {
            flatFiles.push(file);
        }
    }

    const followersMap = new Map<string, ParsedEntry>();
    const followingMap = new Map<string, ParsedEntry>();
    let ownerUsername: string | null = null;
    let foundTarget = false;

    for (const file of flatFiles) {
        const name = baseName(file.name).toLowerCase();

        if (name.endsWith('.html')) {
            /** following を先に判定する（'followers' と 'following' は互いに部分文字列でない） */
            const kind: ImportEntryKind | null = name.includes('following')
                ? 'following'
                : name.includes('followers')
                  ? 'follower'
                  : null;
            if (kind === null) continue;

            const entries = parseRelationshipHtml(kind, file.data);
            if (entries.length === 0) continue;

            foundTarget = true;
            const targetMap = kind === 'following' ? followingMap : followersMap;
            for (const entry of entries) targetMap.set(entry.username, entry);
            continue;
        }

        if (!name.endsWith('.json')) continue;

        const json = tryParseJson(file.data);
        if (json === null) continue;

        const resolved = resolveRelationship(name, json);
        if (resolved) {
            const entries = parseRelationshipItems(resolved.kind, resolved.items);
            if (entries.length > 0 || Array.isArray(resolved.items)) {
                foundTarget = true;
                const targetMap = resolved.kind === 'following' ? followingMap : followersMap;
                for (const entry of entries) targetMap.set(entry.username, entry);
            }
        } else if (name.includes('personal_information')) {
            ownerUsername = extractOwnerUsername(json) ?? ownerUsername;
        }
    }

    if (!foundTarget) {
        throw new ParseExportError('no_target_files', 'followers/following のファイルが見つかりません');
    }

    return {
        followers: [...followersMap.values()],
        following: [...followingMap.values()],
        ownerUsername,
    };
};
