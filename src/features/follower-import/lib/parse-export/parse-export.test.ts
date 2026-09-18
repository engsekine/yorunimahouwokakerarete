import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { ParseExportError, parseExportFiles, peekOwnerUsername } from './parse-export';

const FIXTURE_DIR = join(process.cwd(), 'tests/fixtures/instagram-export');

const fixture = (name: string) => ({ name, data: new Uint8Array(readFileSync(join(FIXTURE_DIR, name))) });

describe('parseExportFiles', () => {
    it('ZIP から followers / following / ownerUsername を抽出する', () => {
        const result = parseExportFiles([fixture('export-gen1.zip')]);

        expect(result.followers.map((e) => e.username).sort()).toEqual(['alice', 'bob', 'carol']);
        expect(result.following.map((e) => e.username).sort()).toEqual(['alice', 'dave']);
        expect(result.ownerUsername).toBe('yorunimahouwokakerarete_owner');
        expect(result.followers[0]).toMatchObject({
            kind: 'follower',
            profileUrl: expect.stringContaining('instagram.com/'),
            followedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        });
    });

    it('分割 JSON（followers_1/2 + following）を統合し、username を小文字化・trim して正規化する', () => {
        const result = parseExportFiles([
            fixture('gen2-followers_1.json'),
            fixture('gen2-followers_2.json'),
            fixture('gen2-following.json'),
        ]);

        /** Frank → frank に正規化される */
        expect(result.followers.map((e) => e.username).sort()).toEqual(['alice', 'carol', 'eve', 'frank']);
        expect(result.following).toHaveLength(2);
        expect(result.ownerUsername).toBeNull();
    });

    it('形式ゆれ: 分割された following（素の配列）とキー付きの followers も読み込める', () => {
        const result = parseExportFiles([fixture('variant-following_1.json'), fixture('variant-followers_1.json')]);

        expect(result.following.map((e) => e.username).sort()).toEqual(['alice', 'dave']);
        expect(result.followers.map((e) => e.username).sort()).toEqual(['alice', 'bob']);
        expect(result.following[0]?.kind).toBe('following');
    });

    it('followers_1.json という名前でも relationships_following キーがあればフォロー中として取り込む', () => {
        const json = {
            relationships_following: [
                {
                    string_list_data: [
                        { href: 'https://www.instagram.com/dave', value: 'dave', timestamp: 1700000005 },
                    ],
                },
            ],
        };
        const result = parseExportFiles([
            { name: 'followers_1.json', data: new TextEncoder().encode(JSON.stringify(json)) },
        ]);

        expect(result.following.map((e) => e.username)).toEqual(['dave']);
        expect(result.followers).toEqual([]);
    });

    it('value を持たない形式（title + /_u/ href のみ）でも username を解決して取り込む', () => {
        const json = {
            relationships_following: [
                {
                    title: 'gunkanjima_con_gdm',
                    string_list_data: [
                        { href: 'https://www.instagram.com/_u/gunkanjima_con_gdm', timestamp: 1784002743 },
                    ],
                },
                {
                    /** title も空のケースは href から解決する */
                    title: '',
                    string_list_data: [{ href: 'https://www.instagram.com/_u/dave', timestamp: 1784002744 }],
                },
            ],
        };
        const result = parseExportFiles([
            { name: 'following.json', data: new TextEncoder().encode(JSON.stringify(json)) },
        ]);

        expect(result.following.map((e) => e.username).sort()).toEqual(['dave', 'gunkanjima_con_gdm']);
        expect(result.following[0]).toMatchObject({
            kind: 'following',
            profileUrl: 'https://www.instagram.com/gunkanjima_con_gdm',
            followedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        });
    });

    it('同一 username の重複は排除する', () => {
        const duplicated = fixture('gen2-followers_1.json');
        const result = parseExportFiles([duplicated, { name: 'gen2-followers_copy.json', data: duplicated.data }]);

        expect(result.followers.map((e) => e.username).sort()).toEqual(['alice', 'carol']);
    });

    it('following が無ければ空配列を返す', () => {
        const result = parseExportFiles([fixture('gen2-followers_1.json')]);

        expect(result.followers).toHaveLength(2);
        expect(result.following).toEqual([]);
    });

    it('HTML 形式（followers_1.html / following.html）から抽出し、username を正規化・followedAt は null になる', () => {
        const result = parseExportFiles([fixture('gen1-followers_1.html'), fixture('gen1-following.html')]);

        /** Bob → bob に正規化される */
        expect(result.followers.map((e) => e.username).sort()).toEqual(['alice', 'bob', 'carol']);
        expect(result.following.map((e) => e.username).sort()).toEqual(['alice', 'dave']);
        expect(result.ownerUsername).toBeNull();
        expect(result.followers[0]).toMatchObject({
            kind: 'follower',
            profileUrl: expect.stringContaining('instagram.com/'),
            followedAt: null,
        });
    });

    it('エントリを含まない HTML・無関係 JSON のみの場合は no_target_files を throw する', () => {
        expect(() => parseExportFiles([fixture('followers.html'), fixture('unrelated.json')])).toThrowError(
            expect.objectContaining({ code: 'no_target_files' }),
        );
    });

    it('破損 ZIP は zip_corrupted を throw する', () => {
        expect(() => parseExportFiles([fixture('corrupted.zip')])).toThrowError(
            expect.objectContaining({ code: 'zip_corrupted' }),
        );
    });

    it('ParseExportError は code を持つ', () => {
        try {
            parseExportFiles([fixture('unrelated.json')]);
            expect.unreachable();
        } catch (error) {
            expect(error).toBeInstanceOf(ParseExportError);
        }
    });

    describe('peekOwnerUsername（アカウント ID の自動入力用・007 FR-012）', () => {
        const encode = (value: string): Uint8Array => new TextEncoder().encode(value);
        const personalInfo = (username: string) =>
            encode(JSON.stringify({ profile_user: [{ string_map_data: { Username: { value: username } } }] }));

        it('JSON 群から personal_information の本人名を正規化して返す', () => {
            const result = peekOwnerUsername([
                fixture('gen2-followers_1.json'),
                { name: 'personal_information.json', data: personalInfo(' Insta_Owner ') },
            ]);

            expect(result).toBe('insta_owner');
        });

        it('本人情報が無ければ null（フォロワー / フォロー中ファイルだけの取り込み）', () => {
            expect(peekOwnerUsername([fixture('gen2-followers_1.json'), fixture('gen2-following.json')])).toBeNull();
        });

        it('ZIP からは personal_information エントリだけを展開して本人名を返す', () => {
            expect(peekOwnerUsername([fixture('export-gen1.zip')])).toBe('yorunimahouwokakerarete_owner');
        });

        it('ZIP 内の巨大なフォロワー一覧は展開せず、上限判定にも影響しない', () => {
            const zip = zipSync({
                'connections/followers_and_following/followers_1.json': encode(`[${'0'.repeat(64 * 1024)}]`),
                'personal_information/personal_information.json': personalInfo('owner_in_zip'),
            });

            expect(peekOwnerUsername([{ name: 'export.zip', data: zip }])).toBe('owner_in_zip');
        });

        it('破損 ZIP・構造不一致・HTML 形式は throw せず null を返す', () => {
            expect(peekOwnerUsername([fixture('corrupted.zip')])).toBeNull();
            expect(
                peekOwnerUsername([{ name: 'personal_information.json', data: encode('{"profile_user":[]}') }]),
            ).toBeNull();
            expect(peekOwnerUsername([{ name: 'personal_information.json', data: encode('not json') }])).toBeNull();
            expect(peekOwnerUsername([fixture('gen1-followers_1.html')])).toBeNull();
        });

        it('ファイルが無ければ null', () => {
            expect(peekOwnerUsername([])).toBeNull();
        });
    });

    describe('セキュリティ（DoS 耐性）', () => {
        const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

        it('ZIP 内の展開後サイズが上限を超える場合は zip_too_large を throw する（ZIP 爆弾対策）', () => {
            /** 高圧縮率の巨大 JSON（展開後 64KB）を上限 16KB で展開させる */
            const bomb = zipSync({ 'followers_1.json': encode(`[${'0'.repeat(64 * 1024)}]`) });

            expect(() =>
                parseExportFiles([{ name: 'export.zip', data: bomb }], { maxUncompressedBytes: 16 * 1024 }),
            ).toThrowError(expect.objectContaining({ code: 'zip_too_large' }));
        });

        it('ZIP 内の複数ファイルの展開後サイズ合計でも上限を判定する', () => {
            const zip = zipSync({
                'followers_1.json': encode(`[${'0'.repeat(10 * 1024)}]`),
                'followers_2.json': encode(`[${'0'.repeat(10 * 1024)}]`),
            });

            expect(() =>
                parseExportFiles([{ name: 'export.zip', data: zip }], { maxUncompressedBytes: 16 * 1024 }),
            ).toThrowError(expect.objectContaining({ code: 'zip_too_large' }));
        });

        it('ZIP 内の取り込み対象外ファイル（メディア等）は上限判定に含めず展開もしない', () => {
            const zip = zipSync({
                'media/photo.bin': encode('0'.repeat(64 * 1024)),
                'followers_1.json': encode(
                    JSON.stringify({
                        relationships_followers: [{ string_list_data: [{ value: 'alice' }] }],
                    }),
                ),
            });

            const result = parseExportFiles([{ name: 'export.zip', data: zip }], {
                maxUncompressedBytes: 16 * 1024,
            });

            expect(result.followers.map((e) => e.username)).toEqual(['alice']);
        });

        it('HTML 形式の解析は悪意ある入力でも線形時間で終わる（ReDoS 対策）', () => {
            /** `<a ` の連続 + 閉じ `>` 無し。旧パターンでは入力長の 2 乗で遅くなっていた */
            const malicious = encode('<a '.repeat(200_000));

            const startedAt = performance.now();
            expect(() => parseExportFiles([{ name: 'followers_1.html', data: malicious }])).toThrowError(
                expect.objectContaining({ code: 'no_target_files' }),
            );
            expect(performance.now() - startedAt).toBeLessThan(2_000);
        });
    });
});
