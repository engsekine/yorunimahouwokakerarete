import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { clearAppStorage, STORAGE_NAMES, writeStorage } from './helpers/browser-storage';

/**
 * フォロワーリストのインポートと差分表示の e2e（003 quickstart シナリオ 1〜4 + 007 quickstart シナリオ 1〜4・6）。
 * フィクスチャ（tests/fixtures/instagram-export/）で取り込み → 差分 → 上限置き換え → 履歴/削除 →
 * 別アカウント拒否と「すべて削除して取り込む」→ 自動入力 → 旧データ整理 を通す。
 * 取り込みデータはブラウザ保存（localStorage）に置かれるため、同一の page をテスト間で共有する。
 */

const FIXTURE_DIR = join(process.cwd(), 'tests/fixtures/instagram-export');
const fixture = (name: string) => join(FIXTURE_DIR, name);

const OWNER = 'yorunimahouwokakerarete_owner';
const OTHER = 'other_account';
const ACCOUNT_LABEL = '対象の Instagram アカウント ID';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const expectNoAxe = async (page: Page) => {
    /** 動的ルートは metadata がストリーミングされるため、<title> の到着を待ってから走査する（document-title の誤検知防止） */
    await expect(page).toHaveTitle(/.+/);
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
};

const selectFiles = async (page: Page, files: string[], accountName?: string): Promise<void> => {
    await page.goto('/imports');
    await page.getByLabel(/エクスポートファイル/).setInputFiles(files);
    if (accountName !== undefined) await page.getByLabel(ACCOUNT_LABEL).fill(accountName);
};

const uploadFiles = async (page: Page, files: string[], accountName?: string): Promise<void> => {
    await selectFiles(page, files, accountName);
    await page.getByRole('button', { name: '取り込む' }).click();
};

const deleteButtons = (page: Page) => page.getByRole('button', { name: '削除', exact: true });

const countEntryKeys = (page: Page): Promise<number> =>
    page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes(':follower-import-entries:')).length);

test.describe.configure({ mode: 'serial' });

test.describe('フォロワーインポート e2e', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await (await browser.newContext()).newPage();
    });

    test.afterAll(async () => {
        await page.context().close();
    });

    test('初回取り込み: followers_and_following の HTML を取り込んで件数と比較対象なしの案内が出る（US1）', async () => {
        await page.goto('/imports');
        await expect(page.getByText('まだ取り込みがありません。')).toBeVisible();
        await expectNoAxe(page);

        await uploadFiles(page, [fixture('gen1-followers_1.html'), fixture('gen1-following.html')], OWNER);
        await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);
        await expect(page.getByText(/フォロワー 3 人/)).toBeVisible();
        await expect(page.getByText(/比較対象がまだありません。次回、同じアカウント ID で/)).toBeVisible();
        await expectNoAxe(page);
    });

    test('フォロワー一覧を含まないファイルは取り込まれず対象ファイルの案内が出る（US1）', async () => {
        await uploadFiles(page, [fixture('followers.html'), fixture('unrelated.json')], OWNER);
        await expect(page.getByRole('alert').filter({ hasText: 'followers_and_following' })).toBeVisible();
        await expect(page).toHaveURL(/\/imports$/);
    });

    test('2 回目取り込み: 分割 JSON で差分（新規 2・解除 1）が表示される（US2）', async () => {
        /** アカウント ID は入力せず、保存済み記録の値が既定値として使われる（007 FR-012） */
        await uploadFiles(page, [
            fixture('gen2-followers_1.json'),
            fixture('gen2-followers_2.json'),
            fixture('gen2-following.json'),
        ]);
        await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);

        // gen1 followers: alice/bob/carol → gen2: alice/carol/eve/frank（新規 eve,frank / 解除 bob）
        await expect(page.getByRole('heading', { name: '新規フォロワー（2 人）' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'フォロー解除した相手（1 人）' })).toBeVisible();
        const eve = page.getByRole('link', { name: '@eve' }).first();
        await expect(eve).toHaveAttribute('href', 'https://www.instagram.com/eve');
        await expect(eve).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(page.getByText(/ユーザーネームを変更した場合/)).toBeVisible();
    });

    test('フォロー関係の分析が表示される（US4）', async () => {
        await page.goto('/imports');
        // 最新（gen2）: followers alice/carol/eve/frank, following alice/dave → 非フォローバック dave
        // 履歴テーブルの最新行（先頭）の詳細リンクを開く
        await page.getByRole('table').getByRole('link').first().click();
        await expect(page.getByRole('heading', { name: /フォローバックされていない相手/ })).toBeVisible();
        await expect(page.getByRole('link', { name: '@dave' })).toBeVisible();
    });

    test('3 回目取り込み: 置き換え案内が出て、1 万件の取り込み後も履歴は 2 件に収まる（007 US2 / SC-003）', async () => {
        await page.goto('/imports');
        await expect(deleteButtons(page)).toHaveCount(2);
        await expect(page.getByText(/最も古い記録（.+）が置き換わります/)).toBeVisible();
        await expectNoAxe(page);

        const start = Date.now();
        await uploadFiles(page, [fixture('export-large.zip')], OWNER);
        await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/, { timeout: 15_000 });
        await expect(page.getByText(/フォロワー 10,000 人/)).toBeVisible();
        expect(Date.now() - start).toBeLessThan(10_000);

        await page.goto('/imports');
        await expect(deleteButtons(page)).toHaveCount(2);
        await expect(page.getByRole('cell', { name: `@${OWNER}` }).first()).toBeVisible();
        expect(await countEntryKeys(page)).toBe(4);
    });

    test('履歴からの削除で残った記録同士の比較対象が再決定される（US3）', async () => {
        await page.goto('/imports');

        // 最新（1 万件）を削除 → 残る gen2 の比較対象（gen1）は既に置き換えで消えているため「比較対象なし」
        await deleteButtons(page).first().click();
        await page.getByRole('button', { name: '削除する' }).click();
        await expect(deleteButtons(page)).toHaveCount(1);

        await page.getByRole('table').getByRole('link').first().click();
        await expect(page.getByText(/比較対象がまだありません/)).toBeVisible();
    });

    test('別アカウントの取り込みは拒否され、「すべて削除して取り込む」で切り替えられる（007 US1 / FR-007a）', async () => {
        await selectFiles(page, [fixture('gen2-followers_1.json'), fixture('gen2-following.json')], OTHER);
        await expect(page.getByText(`保存済みの記録は @${OWNER} のものです`)).toBeVisible();
        await page.getByRole('button', { name: '取り込む' }).click();

        /** Next.js のルートアナウンサー（role="alert"）と区別するため文言で絞る */
        const alert = page.getByRole('alert').filter({ hasText: '比較できるアカウント' });
        await expect(alert).toContainText('比較できるアカウントは 1 つ');
        await expect(alert).toContainText(`@${OWNER}`);
        const replaceButton = page.getByRole('button', { name: '既存の記録をすべて削除して取り込む' });
        await expect(replaceButton).toBeVisible();
        await expect(page).toHaveURL(/\/imports$/);
        await expectNoAxe(page);

        // キャンセルでは何も変わらない
        await replaceButton.click();
        await expect(page.getByRole('dialog')).toContainText(`@${OWNER} の取り込み記録 1 件`);
        await page.getByRole('button', { name: 'キャンセル' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page).toHaveURL(/\/imports$/);

        // 承諾すると既存記録が消え、別アカウントの記録 1 件だけになる
        await replaceButton.click();
        await page.getByRole('button', { name: '削除して取り込む' }).click();
        await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);
        await expect(page.getByText(`@${OTHER}`)).toBeVisible();
        await expect(page.getByText(/比較対象がまだありません/)).toBeVisible();

        await page.goto('/imports');
        await expect(deleteButtons(page)).toHaveCount(1);
        await expect(page.getByRole('cell', { name: `@${OTHER}` })).toBeVisible();
        expect(await countEntryKeys(page)).toBe(2);
    });

    test('本人情報入り ZIP を選ぶとアカウント ID が自動入力される（007 FR-012）', async () => {
        await selectFiles(page, [fixture('export-gen1.zip')]);

        await expect(page.getByLabel(ACCOUNT_LABEL)).toHaveValue(OWNER);
        await expect(page.getByRole('status').filter({ hasText: '自動入力しました' })).toBeVisible();
        // 保存済みは other_account なので、別アカウントの事前案内も出る
        await expect(page.getByText(`保存済みの記録は @${OTHER} のものです`)).toBeVisible();
    });

    test('記録をすべて削除すると別アカウントで通常の取り込みができる（US3）', async () => {
        await page.goto('/imports');
        await deleteButtons(page).first().click();
        await page.getByRole('button', { name: '削除する' }).click();
        await expect(page.getByText('まだ取り込みがありません。')).toBeVisible();

        await uploadFiles(page, [fixture('gen1-followers_1.html'), fixture('gen1-following.html')], OWNER);
        await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);
        await expect(page.getByText(`@${OWNER}`)).toBeVisible();
    });

    test('別のブラウザ（別コンテキスト）には取り込みが見えない（FR-011）', async ({ browser }) => {
        const otherContext = await browser.newContext();
        const otherPage = await otherContext.newPage();

        await otherPage.goto('/imports');
        await expect(otherPage.getByText('まだ取り込みがありません。')).toBeVisible();

        await otherContext.close();
    });

    test('旧データ（同一アカウント 4 件）は表示だけでは消えず、次の取り込みで 2 件に収まる（007 FR-011）', async () => {
        await page.goto('/imports');
        /** 直前のテストの記録（エントリ含む）を消し、旧データだけの状態を作る */
        await clearAppStorage(page);
        const legacy = [1, 2, 3, 4].map((n) => ({
            id: `legacy-${n}`,
            accountUsername: OWNER,
            followersCount: 1,
            followingCount: 0,
            importedAt: `2026-01-0${n}T00:00:00.000Z`,
        }));
        await writeStorage(page, STORAGE_NAMES.followerImports, legacy);
        for (const summary of legacy) {
            await writeStorage(page, `follower-import-entries:${summary.id}:follower`, [['alice', null]]);
            await writeStorage(page, `follower-import-entries:${summary.id}:following`, []);
        }

        await page.goto('/imports');
        await expect(deleteButtons(page)).toHaveCount(4);

        await uploadFiles(page, [fixture('gen2-followers_1.json'), fixture('gen2-following.json')]);
        await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);

        await page.goto('/imports');
        await expect(deleteButtons(page)).toHaveCount(2);
        expect(await countEntryKeys(page)).toBe(4);
    });
});
