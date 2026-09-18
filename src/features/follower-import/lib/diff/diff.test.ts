import { describe, expect, it } from 'vitest';

import { computeFollowerDiff, computeMutualAnalysis, difference } from './diff';

const entries = (usernames: string[]) =>
    usernames.map((username) => ({ username, profileUrl: `https://www.instagram.com/${username}` }));

describe('difference', () => {
    it('a に含まれ b に含まれない要素を username 昇順で返す', () => {
        expect(difference(entries(['carol', 'alice', 'bob']), entries(['bob'])).map((e) => e.username)).toEqual([
            'alice',
            'carol',
        ]);
    });

    it('同一集合なら空配列', () => {
        expect(difference(entries(['alice']), entries(['alice']))).toEqual([]);
    });
});

describe('computeFollowerDiff', () => {
    it('新規（今回のみ）と解除（前回のみ）を返す', () => {
        const result = computeFollowerDiff(entries(['alice', 'carol', 'eve']), entries(['alice', 'bob', 'carol']));

        expect(result.gained.map((e) => e.username)).toEqual(['eve']);
        expect(result.lost.map((e) => e.username)).toEqual(['bob']);
    });

    it('前回 0 件なら全員が新規、今回 0 件なら全員が解除', () => {
        expect(computeFollowerDiff(entries(['alice']), []).gained).toHaveLength(1);
        expect(computeFollowerDiff([], entries(['alice'])).lost).toHaveLength(1);
    });
});

describe('computeMutualAnalysis', () => {
    it('フォローバックされていない相手・していない相手を返す', () => {
        const analysis = computeMutualAnalysis(entries(['alice', 'bob', 'carol']), entries(['alice', 'dave']));

        expect(analysis.notFollowingBack.map((e) => e.username)).toEqual(['dave']);
        expect(analysis.notFollowedBack.map((e) => e.username)).toEqual(['bob', 'carol']);
    });
});
