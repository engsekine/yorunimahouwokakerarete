import { describe, expect, it } from 'vitest';

import type { ImportSummary } from '../../types';
import { normalizeAccountUsername, planRetention, sortImportsNewestFirst } from './retention';

const summary = (id: string, importedAt: string, accountUsername = 'owner'): ImportSummary => ({
    id,
    accountUsername,
    followersCount: 1,
    followingCount: 0,
    importedAt,
});

/** A1（最古）→ A4（最新）の順に用意する */
const a1 = summary('a1', '2026-09-01T00:00:00.000Z');
const a2 = summary('a2', '2026-09-02T00:00:00.000Z');
const a3 = summary('a3', '2026-09-03T00:00:00.000Z');
const a4 = summary('a4', '2026-09-04T00:00:00.000Z');
const b1 = summary('b1', '2026-09-02T12:00:00.000Z', 'other');

const options = { maxRetained: 2, replaceAll: false };

describe('normalizeAccountUsername', () => {
    it('前後の空白を除き小文字化する', () => {
        expect(normalizeAccountUsername('  Insta_Owner ')).toBe('insta_owner');
    });

    it('空文字はそのまま空文字', () => {
        expect(normalizeAccountUsername('   ')).toBe('');
    });
});

describe('sortImportsNewestFirst', () => {
    it('importedAt 降順に並べ、同一日時は id 降順で安定させる', () => {
        const same1 = summary('id-a', '2026-09-05T00:00:00.000Z');
        const same2 = summary('id-b', '2026-09-05T00:00:00.000Z');

        const sorted = sortImportsNewestFirst([a1, same1, a3, same2]);

        expect(sorted.map((s) => s.id)).toEqual(['id-b', 'id-a', 'a3', 'a1']);
    });

    it('入力配列を変更しない', () => {
        const input = [a1, a3, a2];
        sortImportsNewestFirst(input);
        expect(input.map((s) => s.id)).toEqual(['a1', 'a3', 'a2']);
    });
});

describe('planRetention', () => {
    it('保存済みが無ければ何も取り除かない', () => {
        expect(planRetention([], 'owner', options)).toEqual({
            kind: 'ok',
            removeImportIds: [],
            conflictingAccountUsername: null,
        });
    });

    it('同じアカウントが 1 件なら取り除かず 2 件目として保存できる', () => {
        expect(planRetention([a1], 'owner', options)).toEqual({
            kind: 'ok',
            removeImportIds: [],
            conflictingAccountUsername: null,
        });
    });

    it('同じアカウントが上限件数あれば最も古い 1 件を取り除く（A1, A2 → A2 + 新規）', () => {
        const plan = planRetention([a2, a1], 'owner', options);

        expect(plan.kind).toBe('ok');
        expect(plan.removeImportIds).toEqual(['a1']);
    });

    it('旧データで上限を超えていれば、直前 1 件を残して古い順にすべて取り除く（FR-011）', () => {
        const plan = planRetention([a4, a3, a2, a1], 'owner', options);

        expect(plan.kind).toBe('ok');
        expect(plan.removeImportIds).toEqual(['a3', 'a2', 'a1']);
    });

    it('入力の並び順に依存しない', () => {
        const plan = planRetention([a1, a3, a4, a2], 'owner', options);

        expect(plan.removeImportIds).toEqual(['a3', 'a2', 'a1']);
    });

    it('別アカウントの記録が 1 件でもあれば account_conflict で保存済みアカウント ID を返す', () => {
        const plan = planRetention([a1], 'other', options);

        expect(plan).toEqual({
            kind: 'account_conflict',
            removeImportIds: [],
            conflictingAccountUsername: 'owner',
        });
    });

    it('旧データで別アカウントが混在していれば、最新の別アカウント名を返して拒否する', () => {
        const plan = planRetention([a3, b1, a1], 'owner', options);

        expect(plan.kind).toBe('account_conflict');
        expect(plan.conflictingAccountUsername).toBe('other');
        expect(plan.removeImportIds).toEqual([]);
    });

    it('大文字・空白違いは同じアカウントとして扱う', () => {
        const stored = summary('x1', '2026-09-01T00:00:00.000Z', 'Insta_Owner');

        expect(planRetention([stored], 'insta_owner', options).kind).toBe('ok');
    });

    it('replaceAll なら別アカウントでも拒否せず、既存全件を取り除く', () => {
        const plan = planRetention([a2, a1], 'other', { maxRetained: 2, replaceAll: true });

        expect(plan.kind).toBe('ok');
        expect(plan.removeImportIds.sort()).toEqual(['a1', 'a2']);
        expect(plan.conflictingAccountUsername).toBeNull();
    });

    it('maxRetained が 1 なら同じアカウントの既存全件を取り除く', () => {
        const plan = planRetention([a2, a1], 'owner', { maxRetained: 1, replaceAll: false });

        expect(plan.removeImportIds).toEqual(['a2', 'a1']);
    });
});
