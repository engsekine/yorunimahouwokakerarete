import { describe, expect, it, vi } from 'vitest';

import { StorageQuotaError, storageKey } from '@/shared/lib/storage';

import type { ParsedEntry } from '../lib/parse-export';
import type { ImportSummary } from '../types';
import { readEntries, readImports, readPreviousImport, saveImport } from './repository';

const summary = (id: string, importedAt: string, accountUsername = 'owner'): ImportSummary => ({
    id,
    accountUsername,
    followersCount: 1,
    followingCount: 0,
    importedAt,
});

const followers = (...usernames: string[]): ParsedEntry[] =>
    usernames.map((username) => ({
        kind: 'follower',
        username,
        profileUrl: `https://www.instagram.com/${username}`,
        followedAt: null,
    }));

const save = (s: ImportSummary, names: string[] = ['alice'], removeImportIds: string[] = []) =>
    saveImport({ summary: s, followers: followers(...names), following: [], removeImportIds });

const entriesKeyExists = (importId: string): boolean =>
    localStorage.getItem(storageKey(`follower-import-entries:${importId}:follower`)) !== null;

describe('readImports', () => {
    it('importedAt 降順、同一日時は id 降順で返す（安定ソート）', () => {
        save(summary('a1', '2026-09-01T00:00:00.000Z'));
        save(summary('same-b', '2026-09-03T00:00:00.000Z'));
        save(summary('same-a', '2026-09-03T00:00:00.000Z'));
        save(summary('a2', '2026-09-02T00:00:00.000Z'));

        expect(readImports().map((s) => s.id)).toEqual(['same-b', 'same-a', 'a2', 'a1']);
    });
});

describe('readPreviousImport', () => {
    it('同じアカウント ID の直前の記録を返す', () => {
        save(summary('a1', '2026-09-01T00:00:00.000Z'));
        save(summary('a2', '2026-09-02T00:00:00.000Z'));

        expect(readPreviousImport(summary('a2', '2026-09-02T00:00:00.000Z'))?.id).toBe('a1');
    });

    it('間に別アカウントの記録があっても飛ばして同じアカウントの記録を返す', () => {
        save(summary('a1', '2026-09-01T00:00:00.000Z'));
        save(summary('b1', '2026-09-02T00:00:00.000Z', 'other'));
        save(summary('a2', '2026-09-03T00:00:00.000Z'));

        expect(readPreviousImport(summary('a2', '2026-09-03T00:00:00.000Z'))?.id).toBe('a1');
    });

    it('別アカウントの記録しか無ければ null', () => {
        save(summary('b1', '2026-09-01T00:00:00.000Z', 'other'));

        expect(readPreviousImport(summary('a1', '2026-09-02T00:00:00.000Z'))).toBeNull();
    });

    it('大文字・空白違いのアカウント ID は同一として扱う', () => {
        save(summary('a1', '2026-09-01T00:00:00.000Z', 'Owner '));

        expect(readPreviousImport(summary('a2', '2026-09-02T00:00:00.000Z', 'owner'))?.id).toBe('a1');
    });

    it('同一日時の記録は id 順で前後を決め、順序が入れ替わらない', () => {
        save(summary('id-a', '2026-09-01T00:00:00.000Z'));
        save(summary('id-b', '2026-09-01T00:00:00.000Z'));

        expect(readPreviousImport(summary('id-b', '2026-09-01T00:00:00.000Z'))?.id).toBe('id-a');
        expect(readPreviousImport(summary('id-a', '2026-09-01T00:00:00.000Z'))).toBeNull();
    });
});

describe('saveImport with removeImportIds', () => {
    it('取り除く記録のサマリとエントリを消し、新規記録を保存する', () => {
        save(summary('a1', '2026-09-01T00:00:00.000Z'), ['alice']);
        save(summary('a2', '2026-09-02T00:00:00.000Z'), ['bob']);

        save(summary('a3', '2026-09-03T00:00:00.000Z'), ['carol'], ['a1']);

        expect(readImports().map((s) => s.id)).toEqual(['a3', 'a2']);
        expect(entriesKeyExists('a1')).toBe(false);
        expect(readEntries('a3', 'follower').map((e) => e.username)).toEqual(['carol']);
    });

    it('複数件をまとめて取り除ける（全削除して取り込む）', () => {
        save(summary('a1', '2026-09-01T00:00:00.000Z'));
        save(summary('a2', '2026-09-02T00:00:00.000Z'));

        save(summary('b1', '2026-09-03T00:00:00.000Z', 'other'), ['dave'], ['a1', 'a2']);

        expect(readImports().map((s) => s.id)).toEqual(['b1']);
        expect(entriesKeyExists('a1')).toBe(false);
        expect(entriesKeyExists('a2')).toBe(false);
    });

    it('保存が容量超過で失敗したら、取り除いた記録も含めて保存前の状態に戻る（FR-005）', () => {
        save(summary('a1', '2026-09-01T00:00:00.000Z'), ['alice']);
        save(summary('a2', '2026-09-02T00:00:00.000Z'), ['bob']);
        const before = { ...localStorage };

        /** 新規記録（a3）のエントリ書き込みだけを容量超過にし、ロールバック時の既存記録の復元は通す */
        const original = Storage.prototype.setItem;
        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
            if (key.includes(':a3:')) throw new DOMException('quota', 'QuotaExceededError');
            original.call(this, key, value);
        });
        const attempt = () => save(summary('a3', '2026-09-03T00:00:00.000Z'), ['carol'], ['a1']);
        expect(attempt).toThrowError(StorageQuotaError);
        setItem.mockRestore();

        expect({ ...localStorage }).toEqual(before);
        expect(readImports().map((s) => s.id)).toEqual(['a2', 'a1']);
        expect(readEntries('a1', 'follower').map((e) => e.username)).toEqual(['alice']);
        expect(entriesKeyExists('a3')).toBe(false);
    });
});
