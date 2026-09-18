import { describe, expect, it, vi } from 'vitest';

import {
    clearAppStorage,
    isQuotaExceededError,
    listNames,
    readJson,
    removeItem,
    STORAGE_PREFIX,
    StorageQuotaError,
    storageKey,
    writeAtomically,
    writeJson,
} from './storage';

const quotaError = () => new DOMException('quota', 'QuotaExceededError');

describe('storageKey', () => {
    it('アプリプレフィックスを付けたキーを返す', () => {
        expect(storageKey('foo')).toBe(`${STORAGE_PREFIX}foo`);
    });
});

describe('readJson / writeJson / removeItem', () => {
    it('JSON を保存して読み出せる', () => {
        writeJson('item', { a: 1, b: ['x'] });

        expect(readJson<{ a: number; b: string[] }>('item')).toEqual({ a: 1, b: ['x'] });
        expect(localStorage.getItem(storageKey('item'))).toBe('{"a":1,"b":["x"]}');
    });

    it('未保存のキーは null を返す', () => {
        expect(readJson('missing')).toBeNull();
    });

    it('破損した JSON は null を返す（例外にしない）', () => {
        localStorage.setItem(storageKey('broken'), '{not json');

        expect(readJson('broken')).toBeNull();
    });

    it('removeItem で削除できる', () => {
        writeJson('item', 1);
        removeItem('item');

        expect(readJson('item')).toBeNull();
    });

    it('容量超過は StorageQuotaError に変換する', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
            throw quotaError();
        });

        expect(() => writeJson('big', 'x')).toThrowError(StorageQuotaError);
    });
});

describe('isQuotaExceededError', () => {
    it('QuotaExceededError / Firefox の NS_ERROR_DOM_QUOTA_REACHED を判定する', () => {
        expect(isQuotaExceededError(quotaError())).toBe(true);
        expect(isQuotaExceededError(new DOMException('quota', 'NS_ERROR_DOM_QUOTA_REACHED'))).toBe(true);
    });

    it('通常の Error は false', () => {
        expect(isQuotaExceededError(new Error('boom'))).toBe(false);
        expect(isQuotaExceededError('string')).toBe(false);
    });
});

describe('listNames', () => {
    it('アプリプレフィックス配下の名前だけを返し、他アプリのキーは含めない', () => {
        writeJson('imports', []);
        writeJson('entries:1', []);
        localStorage.setItem('other-app:key', 'x');

        expect(listNames().sort()).toEqual(['entries:1', 'imports']);
        expect(listNames('entries:')).toEqual(['entries:1']);
    });
});

describe('writeAtomically', () => {
    it('複数キーをまとめて保存し、null は削除として扱う', () => {
        writeJson('to-remove', 1);

        writeAtomically([
            { name: 'a', value: { x: 1 } },
            { name: 'b', value: [1, 2] },
            { name: 'to-remove', value: null },
        ]);

        expect(readJson('a')).toEqual({ x: 1 });
        expect(readJson('b')).toEqual([1, 2]);
        expect(readJson('to-remove')).toBeNull();
    });

    it('途中で容量超過になった場合は書き込み前の状態に戻し StorageQuotaError を投げる（原子性）', () => {
        writeJson('a', 'before');
        const setItem = vi.spyOn(Storage.prototype, 'setItem');
        /** 1 回目（a）は成功、2 回目（b）で容量超過にする */
        setItem.mockImplementationOnce((key, value) => {
            localStorage.constructor.prototype.setItem.call(localStorage, key, value);
        });
        setItem.mockImplementationOnce(() => {
            throw quotaError();
        });

        expect(() =>
            writeAtomically([
                { name: 'a', value: 'after' },
                { name: 'b', value: 'new' },
            ]),
        ).toThrowError(StorageQuotaError);

        setItem.mockRestore();
        expect(readJson('a')).toBe('before');
        expect(readJson('b')).toBeNull();
    });
});

describe('clearAppStorage', () => {
    it('アプリのキーだけを削除する', () => {
        writeJson('a', 1);
        localStorage.setItem('other-app:key', 'x');

        clearAppStorage();

        expect(readJson('a')).toBeNull();
        expect(localStorage.getItem('other-app:key')).toBe('x');
    });
});
