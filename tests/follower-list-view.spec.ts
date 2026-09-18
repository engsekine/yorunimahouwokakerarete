import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * フォロワー・フォロー中の ID 一覧（005 / quickstart.md シナリオ 1〜4）。
 * 取り込みを 1 件作り、/imports/[id] の「メンバー一覧」でタブ切替・検索を検証する。
 */

const FIXTURE_DIR = join(process.cwd(), 'tests/fixtures/instagram-export');
const fixture = (name: string) => join(FIXTURE_DIR, name);
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** 取り込み詳細ページを開く（履歴の先頭行の詳細リンク） */
const openLatestImport = async (page: Page): Promise<void> => {
    await page.goto('/imports');
    await page.getByRole('table').getByRole('link').first().click();
    await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);
};

test.describe.configure({ mode: 'serial' });

test.describe('メンバー一覧 e2e', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await (await browser.newContext()).newPage();
    });

    test.afterAll(async () => {
        await page.context().close();
    });

    test('前提: 取り込み 1 件（gen1: followers alice/bob/carol, following alice/dave）', async () => {
        await page.goto('/imports');
        await page.getByLabel(/エクスポートファイル/).setInputFiles(fixture('export-gen1.zip'));
        await page.getByLabel('対象の Instagram アカウント ID').fill('yorunimahouwokakerarete_owner');
        await page.getByRole('button', { name: '取り込む' }).click();
        await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);
    });

    test('フォロワー ID 一覧が全件表示され、プロフィールリンクを持つ（US1）', async () => {
        await openLatestImport(page);

        await expect(page.getByRole('heading', { name: 'メンバー一覧' })).toBeVisible();
        await expect(page.getByRole('tab', { name: /フォロワー（3）/ })).toHaveAttribute('aria-selected', 'true');
        const table = page.getByRole('table').last();
        for (const name of ['alice', 'bob', 'carol']) {
            await expect(table.getByRole('link', { name: `@${name}` })).toBeVisible();
        }
        await expect(table.getByRole('link', { name: '@alice' })).toHaveAttribute(
            'href',
            'https://www.instagram.com/alice',
        );
    });

    test('フォロー中タブに切り替えると全件表示される（US2）', async () => {
        await openLatestImport(page);

        await page.getByRole('tab', { name: /フォロー中（2）/ }).click();
        const table = page.getByRole('table').last();
        await expect(table.getByRole('link', { name: '@alice' })).toBeVisible();
        await expect(table.getByRole('link', { name: '@dave' })).toBeVisible();
    });

    test('ID の一部で絞り込める（US3）', async () => {
        await openLatestImport(page);

        await page.getByLabel('ID で絞り込む').fill('car');
        await expect(page.getByText('1 件表示中')).toBeVisible();
        const table = page.getByRole('table').last();
        await expect(table.getByRole('link', { name: '@carol' })).toBeVisible();
        await expect(table.getByRole('link', { name: '@alice' })).toHaveCount(0);
    });

    test('メンバー一覧はライト/ダーク両テーマで a11y 違反なし（SC-005）', async () => {
        await openLatestImport(page);
        await expect(page.getByRole('heading', { name: 'メンバー一覧' })).toBeVisible();
        /** 動的ルートは metadata がストリーミングされるため、<title> の到着を待ってから走査する（document-title の誤検知防止） */
        await expect(page).toHaveTitle(/.+/);

        const light = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(light.violations).toEqual([]);
        await page.getByRole('button', { name: 'ダークモードを切り替える' }).click();
        await page.waitForTimeout(500);
        const dark = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(dark.violations).toEqual([]);
    });
});
