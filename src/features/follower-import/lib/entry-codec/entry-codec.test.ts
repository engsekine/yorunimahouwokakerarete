import { describe, expect, it } from 'vitest';

import { decodeEntries, decodeEntry, encodeEntries, encodeEntry } from './entry-codec';

describe('encodeEntry / decodeEntry', () => {
    it('正規 URL のエントリは [username, epoch 秒] の 2 要素に圧縮し、復号で元に戻る', () => {
        const encoded = encodeEntry({
            username: 'alice',
            profileUrl: 'https://www.instagram.com/alice',
            followedAt: '2023-11-14T22:13:21.000Z',
        });

        expect(encoded).toEqual(['alice', 1700000001]);
        expect(decodeEntry(encoded)).toEqual({
            username: 'alice',
            profileUrl: 'https://www.instagram.com/alice',
            followedAt: '2023-11-14T22:13:21.000Z',
        });
    });

    it('正規でない URL は 3 要素目に保持する', () => {
        const encoded = encodeEntry({
            username: 'bob',
            profileUrl: 'https://instagram.com/bob',
            followedAt: null,
        });

        expect(encoded).toEqual(['bob', null, 'https://instagram.com/bob']);
        expect(decodeEntry(encoded).profileUrl).toBe('https://instagram.com/bob');
    });

    it('followedAt が null / 解析不能なら null で保存する', () => {
        expect(
            encodeEntry({ username: 'a', profileUrl: 'https://www.instagram.com/a', followedAt: null })[1],
        ).toBeNull();
        expect(
            encodeEntry({ username: 'a', profileUrl: 'https://www.instagram.com/a', followedAt: 'not a date' })[1],
        ).toBeNull();
    });
});

describe('encodeEntries / decodeEntries', () => {
    it('username 昇順に並べ替えて符号化する', () => {
        const encoded = encodeEntries([
            { username: 'carol', profileUrl: 'https://www.instagram.com/carol', followedAt: null },
            { username: 'alice', profileUrl: 'https://www.instagram.com/alice', followedAt: null },
        ]);

        expect(encoded.map((e) => e[0])).toEqual(['alice', 'carol']);
    });

    it('破損データ（配列でない・要素の形が違う）は無視して復号する', () => {
        expect(decodeEntries('broken')).toEqual([]);
        expect(decodeEntries([['alice', null], 'junk', [1, 2], ['bob', 'x']]).map((e) => e.username)).toEqual([
            'alice',
        ]);
    });
});
