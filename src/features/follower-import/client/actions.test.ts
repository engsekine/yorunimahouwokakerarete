import { describe, expect, it, vi } from 'vitest';

import { StorageQuotaError } from '@/shared/lib/storage';

import { deleteAllImports, deleteImport, uploadImport } from './actions';
import { listImports } from './queries';
import { readEntries } from './repository';

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

/** followers JSON（2 名: alice / bob） */
const followersJson = JSON.stringify([
    { string_list_data: [{ href: 'https://www.instagram.com/alice', value: 'alice', timestamp: 1700000001 }] },
    { string_list_data: [{ href: 'https://www.instagram.com/bob', value: 'bob', timestamp: 1700000002 }] },
]);

const personalInfoJson = JSON.stringify({
    profile_user: [{ string_map_data: { Username: { value: 'insta_owner' } } }],
});

const buildInput = (
    options: {
        accountUsername?: string;
        confirmMismatch?: boolean;
        replaceExisting?: boolean;
        fileName?: string;
        withOwner?: boolean;
    } = {},
) => ({
    files: [
        { name: options.fileName ?? 'followers_1.json', data: encode(followersJson) },
        ...(options.withOwner ? [{ name: 'personal_information.json', data: encode(personalInfoJson) }] : []),
    ],
    accountUsername: options.accountUsername ?? '',
    confirmMismatch: options.confirmMismatch ?? false,
    replaceExisting: options.replaceExisting ?? false,
});

const importIds = async (): Promise<string[]> => (await listImports()).map((i) => i.id);

/**
 * 容量超過の再現。新しい記録のエントリ書き込みだけを QuotaExceededError にし、
 * 既存記録の復元（ロールバック時の setItem）は通す（実ブラウザでも同サイズの復元は失敗しない）
 */
const mockQuotaForNewEntries = (existingIds: string[]) => {
    const original = Storage.prototype.setItem;
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
        const isNewEntries = key.includes('follower-import-entries:') && !existingIds.some((id) => key.includes(id));
        if (isNewEntries) throw new DOMException('quota', 'QuotaExceededError');
        original.call(this, key, value);
    });
};

const entriesKeyCount = (): number =>
    Object.keys(localStorage).filter((key) => key.includes('follower-import-entries:')).length;

describe('uploadImport', () => {
    it('成功: サマリ + エントリを保存し importId を返す', async () => {
        const result = await uploadImport(buildInput({ accountUsername: 'Insta_Owner ' }));

        expect(result.success).toBe(true);
        if (!result.success) return;

        const imports = await listImports();
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({
            id: result.importId,
            accountUsername: 'insta_owner',
            followersCount: 2,
            followingCount: 0,
        });
        expect(readEntries(result.importId, 'follower').map((e) => e.username)).toEqual(['alice', 'bob']);
    });

    it('対象ファイルが無い場合は invalid_export コードで失敗し、何も保存しない', async () => {
        const result = await uploadImport({
            files: [{ name: 'followers.html', data: encode('<html></html>') }],
            accountUsername: 'insta_owner',
            confirmMismatch: false,
            replaceExisting: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.code).toBe('invalid_export');
            expect(result.error).toContain('followers_and_following');
        }
        expect(await listImports()).toEqual([]);
    });

    it('ファイルが 1 つも無い場合は invalid_export で失敗する', async () => {
        const result = await uploadImport({
            files: [],
            accountUsername: 'insta_owner',
            confirmMismatch: false,
            replaceExisting: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.code).toBe('invalid_export');
    });

    it('上限（10MB）を超える JSON / HTML は拒否する（ZIP 自体は対象外）', async () => {
        const result = await uploadImport({
            files: [{ name: 'followers_1.json', data: new Uint8Array(11 * 1024 * 1024) }],
            accountUsername: 'insta_owner',
            confirmMismatch: false,
            replaceExisting: false,
        });

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toContain('10MB');
    });

    it('アカウント名が上限（30 文字）を超える場合は拒否し、何も保存しない', async () => {
        const result = await uploadImport(buildInput({ accountUsername: 'a'.repeat(31) }));

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toContain('30');
        expect(await listImports()).toEqual([]);
    });

    it('初回でアカウント名が空なら入力を求める', async () => {
        const result = await uploadImport(buildInput({ accountUsername: '' }));

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toContain('アカウント ID');
    });

    it('同一ミリ秒に連続で取り込んでも、後の取り込みが最新として並ぶ（007 Edge Case）', async () => {
        const first = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
        const second = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
        if (!first.success || !second.success) throw new Error('setup failed');

        const imports = await listImports();

        expect(imports.map((i) => i.id)).toEqual([second.importId, first.importId]);
        const [latest, previous] = imports;
        expect(latest && previous && latest.importedAt > previous.importedAt).toBe(true);
    });

    it('2 回目以降はアカウント名を省略すると前回の値を引き継ぐ', async () => {
        await uploadImport(buildInput({ accountUsername: 'insta_owner' }));

        const result = await uploadImport(buildInput({ accountUsername: '' }));

        expect(result.success).toBe(true);
        expect((await listImports()).every((i) => i.accountUsername === 'insta_owner')).toBe(true);
    });

    it('personal_information の本人名と入力値が異なる場合は account_mismatch で警告し、confirmMismatch で通過する（FR-008）', async () => {
        const rejected = await uploadImport(buildInput({ accountUsername: 'another_person', withOwner: true }));
        expect(rejected.success).toBe(false);
        if (!rejected.success) expect(rejected.code).toBe('account_mismatch');
        expect(await listImports()).toEqual([]);

        const confirmed = await uploadImport(
            buildInput({ accountUsername: 'another_person', withOwner: true, confirmMismatch: true }),
        );
        expect(confirmed.success).toBe(true);
    });

    describe('アカウント ID による比較対象と保持ルール（007）', () => {
        it('別アカウントの記録があると account_conflict で失敗し、保存領域は変化しない（FR-007）', async () => {
            await uploadImport(buildInput({ accountUsername: 'someone_else' }));
            const before = { ...localStorage };

            const result = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.code).toBe('account_conflict');
                expect(result.error).toContain('@someone_else');
                expect(result.error).toContain('1 つ');
            }
            expect({ ...localStorage }).toEqual(before);
        });

        it('confirmMismatch だけでは別アカウントの拒否は解除されない', async () => {
            await uploadImport(buildInput({ accountUsername: 'someone_else' }));

            const result = await uploadImport(buildInput({ accountUsername: 'insta_owner', confirmMismatch: true }));

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe('account_conflict');
        });

        it('replaceExisting で既存全件が消え、新しいアカウントの記録 1 件だけになる（FR-007a）', async () => {
            await uploadImport(buildInput({ accountUsername: 'someone_else' }));
            await uploadImport(buildInput({ accountUsername: 'someone_else' }));
            expect(await listImports()).toHaveLength(2);

            const result = await uploadImport(buildInput({ accountUsername: 'insta_owner', replaceExisting: true }));

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(await importIds()).toEqual([result.importId]);
            expect((await listImports())[0]?.accountUsername).toBe('insta_owner');
            expect(entriesKeyCount()).toBe(2);
        });

        it('replaceExisting の保存が容量超過で失敗すると既存記録はそのまま残る（FR-007a）', async () => {
            const existing = await uploadImport(buildInput({ accountUsername: 'someone_else' }));
            if (!existing.success) throw new Error('setup failed');
            const before = { ...localStorage };
            const setItem = mockQuotaForNewEntries([existing.importId]);

            const result = await uploadImport(buildInput({ accountUsername: 'insta_owner', replaceExisting: true }));
            setItem.mockRestore();

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe('storage_full');
            expect({ ...localStorage }).toEqual(before);
        });

        it('同じアカウントで 3 回目を取り込むと最古が消えて 2 件になる（FR-004）', async () => {
            const first = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
            const second = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
            if (!first.success || !second.success) throw new Error('setup failed');

            const third = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));

            expect(third.success).toBe(true);
            if (!third.success) return;
            expect(await importIds()).toEqual([third.importId, second.importId]);
            expect(readEntries(first.importId, 'follower')).toEqual([]);
            expect(entriesKeyCount()).toBe(4);
        });

        it('旧データで同じアカウントが 4 件あっても、取り込むと新規 + 直前の 2 件に収まる（FR-011）', async () => {
            await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
            await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
            /** 保持ルールは保存時にしか働かないため、旧データ（上限超過）の状態はサマリ配列へ直接足して作る */
            const stored = await listImports();
            localStorage.setItem(
                'yorunimahouwokakerarete:follower-imports',
                JSON.stringify([
                    ...stored,
                    { ...stored[0], id: 'legacy-1', importedAt: '2026-01-01T00:00:00.000Z' },
                    { ...stored[0], id: 'legacy-2', importedAt: '2026-01-02T00:00:00.000Z' },
                ]),
            );
            expect(await listImports()).toHaveLength(4);

            const result = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(await importIds()).toEqual([result.importId, stored[0]?.id]);
        });

        it('大文字・空白違いのアカウント ID は同一アカウントとして扱い、拒否しない', async () => {
            await uploadImport(buildInput({ accountUsername: 'insta_owner' }));

            const result = await uploadImport(buildInput({ accountUsername: ' Insta_Owner ' }));

            expect(result.success).toBe(true);
            expect(await listImports()).toHaveLength(2);
        });

        it('本人名の相違（account_mismatch）は別アカウントの拒否（account_conflict）より先に判定される', async () => {
            await uploadImport(buildInput({ accountUsername: 'someone_else' }));

            const result = await uploadImport(buildInput({ accountUsername: 'typo_owner', withOwner: true }));

            expect(result.success).toBe(false);
            if (!result.success) expect(result.code).toBe('account_mismatch');
        });
    });

    it('保存が容量超過で失敗した場合は storage_full で失敗し、中途半端な取り込みを残さない（FR-009）', async () => {
        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });

        const result = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
        setItem.mockRestore();

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.code).toBe('storage_full');
            expect(result.error).toContain('保存容量');
        }
        expect(await listImports()).toEqual([]);
        expect(result).not.toBeInstanceOf(StorageQuotaError);
    });
});

describe('deleteImport', () => {
    it('取り込みとそのエントリを削除して success を返す', async () => {
        const uploaded = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
        if (!uploaded.success) throw new Error('setup failed');

        const result = await deleteImport(uploaded.importId);

        expect(result.success).toBe(true);
        expect(await listImports()).toEqual([]);
        expect(readEntries(uploaded.importId, 'follower')).toEqual([]);
    });

    it('存在しない取り込みは失敗を返す', async () => {
        const result = await deleteImport('missing');

        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toContain('見つかりません');
    });
});

describe('deleteAllImports', () => {
    it('すべての取り込みとエントリを削除して success を返す', async () => {
        const first = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
        const second = await uploadImport(buildInput({ accountUsername: 'insta_owner' }));
        if (!first.success || !second.success) throw new Error('setup failed');
        expect(await listImports()).toHaveLength(2);

        const result = await deleteAllImports();

        expect(result.success).toBe(true);
        expect(await listImports()).toEqual([]);
        expect(readEntries(first.importId, 'follower')).toEqual([]);
        expect(readEntries(second.importId, 'follower')).toEqual([]);
        expect(Object.keys(localStorage).filter((key) => key.includes('follower-import'))).toEqual([]);
    });

    it('取り込みが無い状態でも success を返す（冪等）', async () => {
        const result = await deleteAllImports();

        expect(result.success).toBe(true);
        expect(await listImports()).toEqual([]);
    });
});
