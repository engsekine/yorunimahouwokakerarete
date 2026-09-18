import { describe, expect, it } from 'vitest';

import type { ParsedEntry } from '../lib/parse-export';
import type { ImportSummary } from '../types';
import {
    getImportDetail,
    getImportDiff,
    getImportEntries,
    getLatestComparisonSummary,
    getMutualAnalysis,
    listImports,
} from './queries';
import { saveImport } from './repository';

const summary = (id: string, importedAt: string, followers = 3, following = 2): ImportSummary => ({
    id,
    accountUsername: 'insta_owner',
    followersCount: followers,
    followingCount: following,
    importedAt,
});

const entries = (kind: ParsedEntry['kind'], usernames: string[]): ParsedEntry[] =>
    usernames.map((username) => ({
        kind,
        username,
        profileUrl: `https://www.instagram.com/${username}`,
        followedAt: null,
    }));

/** gen1: followers alice/bob/carol, following alice/dave → gen2: followers alice/carol/eve, following alice/dave */
const seedTwoImports = () => {
    saveImport({
        summary: summary('imp-1', '2026-07-16T00:00:00.000Z'),
        followers: entries('follower', ['alice', 'bob', 'carol']),
        following: entries('following', ['alice', 'dave']),
    });
    saveImport({
        summary: summary('imp-2', '2026-07-17T00:00:00.000Z'),
        followers: entries('follower', ['alice', 'carol', 'eve']),
        following: entries('following', ['alice', 'dave']),
    });
};

describe('listImports', () => {
    it('取り込みサマリを新しい順で返す', async () => {
        seedTwoImports();

        const result = await listImports();

        expect(result.map((i) => i.id)).toEqual(['imp-2', 'imp-1']);
        expect(result[0]).toMatchObject({ accountUsername: 'insta_owner', followersCount: 3 });
    });

    it('未保存なら空配列', async () => {
        await expect(listImports()).resolves.toEqual([]);
    });
});

describe('getImportDiff', () => {
    it('隣接取り込みとの差分（新規/解除）を返す', async () => {
        seedTwoImports();

        const diff = await getImportDiff('imp-2');

        expect(diff?.previous?.id).toBe('imp-1');
        expect(diff?.gained.map((e) => e.username)).toEqual(['eve']);
        expect(diff?.lost.map((e) => e.username)).toEqual(['bob']);
    });

    it('同一内容なら差分 0 件', async () => {
        saveImport({
            summary: summary('imp-1', '2026-07-16T00:00:00.000Z'),
            followers: entries('follower', ['alice']),
            following: [],
        });
        saveImport({
            summary: summary('imp-2', '2026-07-17T00:00:00.000Z'),
            followers: entries('follower', ['alice']),
            following: [],
        });

        const diff = await getImportDiff('imp-2');

        expect(diff?.gained).toEqual([]);
        expect(diff?.lost).toEqual([]);
    });

    it('previous は同じアカウント ID の直前記録に限られ、間の別アカウントの記録は飛ばされる（007 FR-002）', async () => {
        saveImport({
            summary: summary('imp-1', '2026-07-16T00:00:00.000Z'),
            followers: entries('follower', ['alice', 'bob']),
            following: [],
        });
        saveImport({
            summary: { ...summary('other-1', '2026-07-16T12:00:00.000Z'), accountUsername: 'someone_else' },
            followers: entries('follower', ['zed']),
            following: [],
        });
        saveImport({
            summary: summary('imp-2', '2026-07-17T00:00:00.000Z'),
            followers: entries('follower', ['alice', 'carol']),
            following: [],
        });

        const diff = await getImportDiff('imp-2');

        expect(diff?.previous?.id).toBe('imp-1');
        expect(diff?.gained.map((e) => e.username)).toEqual(['carol']);
        expect(diff?.lost.map((e) => e.username)).toEqual(['bob']);
    });

    it('初回取り込みは previous = null で差分なし', async () => {
        seedTwoImports();

        const diff = await getImportDiff('imp-1');

        expect(diff?.previous).toBeNull();
        expect(diff?.gained).toEqual([]);
        expect(diff?.lost).toEqual([]);
    });

    it('存在しない id は null を返す', async () => {
        await expect(getImportDiff('imp-x')).resolves.toBeNull();
    });
});

describe('getMutualAnalysis', () => {
    it('非相互フォローの 2 一覧を返す', async () => {
        seedTwoImports();

        const analysis = await getMutualAnalysis('imp-1');

        expect(analysis?.notFollowingBack.map((e) => e.username)).toEqual(['dave']);
        expect(analysis?.notFollowedBack.map((e) => e.username)).toEqual(['bob', 'carol']);
    });

    it('following 未同梱（followingCount = 0）は null を返す', async () => {
        saveImport({
            summary: summary('imp-1', '2026-07-16T00:00:00.000Z', 3, 0),
            followers: entries('follower', ['alice']),
            following: [],
        });

        await expect(getMutualAnalysis('imp-1')).resolves.toBeNull();
    });
});

describe('getImportEntries', () => {
    it('指定 import + kind の全件を username 昇順で返す', async () => {
        saveImport({
            summary: summary('imp-1', '2026-07-16T00:00:00.000Z'),
            followers: entries('follower', ['carol', 'alice', 'bob']),
            following: entries('following', ['dave']),
        });

        expect(await getImportEntries('imp-1', 'follower')).toEqual([
            { username: 'alice', profileUrl: 'https://www.instagram.com/alice' },
            { username: 'bob', profileUrl: 'https://www.instagram.com/bob' },
            { username: 'carol', profileUrl: 'https://www.instagram.com/carol' },
        ]);
        expect((await getImportEntries('imp-1', 'following')).map((e) => e.username)).toEqual(['dave']);
    });

    it('未存在の取り込みは空配列を返す', async () => {
        await expect(getImportEntries('imp-x', 'follower')).resolves.toEqual([]);
    });
});

describe('getLatestComparisonSummary（ダッシュボードの比較要約・007 FR-015〜017）', () => {
    it('取り込みが無ければ null', async () => {
        await expect(getLatestComparisonSummary()).resolves.toBeNull();
    });

    it('記録が 1 件なら比較対象なし（previous null・delta null・件数 0）', async () => {
        saveImport({
            summary: summary('imp-1', '2026-07-16T00:00:00.000Z'),
            followers: entries('follower', ['alice']),
            following: [],
        });

        const result = await getLatestComparisonSummary();

        expect(result?.current.id).toBe('imp-1');
        expect(result?.previous).toBeNull();
        expect(result?.followerDelta).toBeNull();
        expect(result?.gainedCount).toBe(0);
        expect(result?.lostCount).toBe(0);
    });

    it('記録が 2 件なら直近と前回の差分件数と前回比を返し、差分画面の件数と一致する', async () => {
        seedTwoImports();

        const result = await getLatestComparisonSummary();
        const diff = await getImportDiff('imp-2');

        expect(result?.current.id).toBe('imp-2');
        expect(result?.previous?.id).toBe('imp-1');
        expect(result?.followerDelta).toBe(0);
        expect(result?.gainedCount).toBe(diff?.gained.length);
        expect(result?.lostCount).toBe(diff?.lost.length);
        expect(result).toMatchObject({ gainedCount: 1, lostCount: 1 });
    });

    it('前回比はサマリの件数差（フォロワー件数が増えた場合は正）', async () => {
        saveImport({
            summary: summary('imp-1', '2026-07-16T00:00:00.000Z', 1),
            followers: entries('follower', ['alice']),
            following: [],
        });
        saveImport({
            summary: summary('imp-2', '2026-07-17T00:00:00.000Z', 3),
            followers: entries('follower', ['alice', 'bob', 'carol']),
            following: [],
        });

        const result = await getLatestComparisonSummary();

        expect(result?.followerDelta).toBe(2);
        expect(result?.gainedCount).toBe(2);
        expect(result?.lostCount).toBe(0);
    });

    it('旧データで別アカウントの記録が直前にあっても、同じアカウントの記録と比較する', async () => {
        saveImport({
            summary: summary('imp-1', '2026-07-16T00:00:00.000Z'),
            followers: entries('follower', ['alice', 'bob']),
            following: [],
        });
        saveImport({
            summary: { ...summary('other-1', '2026-07-16T12:00:00.000Z'), accountUsername: 'someone_else' },
            followers: entries('follower', ['zed']),
            following: [],
        });
        saveImport({
            summary: summary('imp-2', '2026-07-17T00:00:00.000Z'),
            followers: entries('follower', ['alice', 'carol']),
            following: [],
        });

        const result = await getLatestComparisonSummary();

        expect(result?.previous?.id).toBe('imp-1');
        expect(result).toMatchObject({ gainedCount: 1, lostCount: 1 });
    });
});

describe('getImportDetail', () => {
    it('差分・分析・メンバー一覧をまとめて返す', async () => {
        seedTwoImports();

        const detail = await getImportDetail('imp-2');

        expect(detail?.diff.gained.map((e) => e.username)).toEqual(['eve']);
        expect(detail?.analysis?.notFollowingBack.map((e) => e.username)).toEqual(['dave']);
        expect(detail?.followers.map((e) => e.username)).toEqual(['alice', 'carol', 'eve']);
        expect(detail?.following?.map((e) => e.username)).toEqual(['alice', 'dave']);
    });

    it('following 未同梱なら following は null', async () => {
        saveImport({
            summary: summary('imp-1', '2026-07-16T00:00:00.000Z', 1, 0),
            followers: entries('follower', ['alice']),
            following: [],
        });

        const detail = await getImportDetail('imp-1');

        expect(detail?.following).toBeNull();
        expect(detail?.analysis).toBeNull();
    });

    it('存在しない id は null', async () => {
        await expect(getImportDetail('imp-x')).resolves.toBeNull();
    });
});
