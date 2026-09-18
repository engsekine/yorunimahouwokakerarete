import { cn } from './utils';

describe('cn', () => {
    it('複数のクラス名を結合する', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('falsy な値を除外する', () => {
        expect(cn('foo', false, null, undefined, '', 'bar')).toBe('foo bar');
    });

    it('オブジェクト記法で条件付きクラスを扱える', () => {
        expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('配列をフラットに展開する', () => {
        expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('Tailwind の競合クラスは後勝ちでマージされる', () => {
        expect(cn('px-2', 'px-4')).toBe('px-4');
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('引数なしで空文字列を返す', () => {
        expect(cn()).toBe('');
    });
});
