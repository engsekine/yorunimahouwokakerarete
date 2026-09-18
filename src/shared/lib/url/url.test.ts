import { describe, expect, it } from 'vitest';

import { normalizeSiteUrl } from './url';

const FALLBACK = 'http://localhost:3000';

describe('normalizeSiteUrl', () => {
    it('未設定（undefined / 空文字 / 空白のみ）は既定値を返す', () => {
        expect(normalizeSiteUrl(undefined, FALLBACK)).toBe(FALLBACK);
        expect(normalizeSiteUrl('', FALLBACK)).toBe(FALLBACK);
        expect(normalizeSiteUrl('   ', FALLBACK)).toBe(FALLBACK);
    });

    it('スキーム付きの正しい URL はオリジンをそのまま返す', () => {
        expect(normalizeSiteUrl('https://example.com', FALLBACK)).toBe('https://example.com');
        expect(normalizeSiteUrl('http://localhost:3000', FALLBACK)).toBe('http://localhost:3000');
    });

    it('スキームが無いドメインだけの値には https:// を補う（Vercel の環境変数にドメインだけ入れた場合）', () => {
        expect(normalizeSiteUrl('example.vercel.app', FALLBACK)).toBe('https://example.vercel.app');
        expect(normalizeSiteUrl('www.example.com', FALLBACK)).toBe('https://www.example.com');
    });

    it('末尾のスラッシュ・パス・前後の空白は取り除いてオリジンだけにする', () => {
        expect(normalizeSiteUrl('https://example.com/', FALLBACK)).toBe('https://example.com');
        expect(normalizeSiteUrl('https://example.com/path/', FALLBACK)).toBe('https://example.com');
        expect(normalizeSiteUrl('  https://example.com  ', FALLBACK)).toBe('https://example.com');
    });

    it('URL として解釈できない値は例外を投げずに既定値を返す', () => {
        expect(normalizeSiteUrl('https://', FALLBACK)).toBe(FALLBACK);
        expect(normalizeSiteUrl('not a url', FALLBACK)).toBe(FALLBACK);
        expect(normalizeSiteUrl('ftp://example.com', FALLBACK)).toBe(FALLBACK);
    });
});
