import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * ダッシュボードの比較要約の e2e（007 US4 / quickstart シナリオ 5）。
 * 取り込み → ホームで前回比・新規・解除の件数が差分画面と一致し、詳細導線で遷移できることを通す。
 * データはブラウザ保存にあるため同一の page をテスト間で共有する
 */

const FIXTURE_DIR = join(process.cwd(), 'tests/fixtures/instagram-export');
const fixture = (name: string) => join(FIXTURE_DIR, name);

const OWNER = 'yorunimahouwokakerarete_owner';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const expectNoAxe = async (page: Page) => {
    /** 動的ルートは metadata がストリーミングされるため、<title> の到着を待ってから走査する（document-title の誤検知防止） */
    await expect(page).toHaveTitle(/.+/);
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
};

const uploadFiles = async (page: Page, files: string[], accountName?: string): Promise<void> => {
    await page.goto('/imports');
    await page.getByLabel(/エクスポートファイル/).setInputFiles(files);
    if (accountName !== undefined) await page.getByLabel('対象の Instagram アカウント ID').fill(accountName);
    await page.getByRole('button', { name: '取り込む' }).click();
    await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);
};

test.describe.configure({ mode: 'serial' });

test.describe('ダッシュボードの比較要約 e2e', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await (await browser.newContext()).newPage();
    });

    test.afterAll(async () => {
        await page.context().close();
    });

    test('記録 0 件: 取り込みへの導線だけが表示される', async () => {
        await page.goto('/');
        await expect(page.getByText('まだ取り込みがありません。')).toBeVisible();
        await expect(page.getByRole('link', { name: 'エクスポートを取り込む' })).toHaveAttribute('href', '/imports');
        await expectNoAxe(page);
    });

    test('記録 1 件: フォロワー件数と比較対象なしの案内が表示される', async () => {
        await uploadFiles(page, [fixture('gen1-followers_1.html'), fixture('gen1-following.html')], OWNER);

        await page.goto('/');
        await expect(page.getByText(`@${OWNER}`)).toBeVisible();
        await expect(page.getByText('3', { exact: true })).toBeVisible();
        await expect(page.getByText(/比較対象がまだありません。次回、同じアカウント ID で/)).toBeVisible();
        await expect(page.getByRole('link', { name: '差分の詳細を見る' })).toHaveCount(0);
    });

    test('記録 2 件: 前回比・新規・解除の件数が差分画面と一致し、詳細導線で遷移できる', async () => {
        // gen1 followers: alice/bob/carol → gen2: alice/carol/eve/frank（新規 2 / 解除 1 / 前回比 +1）
        await uploadFiles(page, [
            fixture('gen2-followers_1.json'),
            fixture('gen2-followers_2.json'),
            fixture('gen2-following.json'),
        ]);
        const detailUrl = page.url();

        await page.goto('/');
        await expect(page.getByText('+1', { exact: true })).toBeVisible();
        await expect(page.getByText('2 人', { exact: true })).toBeVisible();
        await expect(page.getByText('1 人', { exact: true })).toBeVisible();
        await expectNoAxe(page);

        await page.getByRole('link', { name: '差分の詳細を見る' }).click();
        await expect(page).toHaveURL(detailUrl);
        await expect(page.getByRole('heading', { name: '新規フォロワー（2 人）' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'フォロー解除した相手（1 人）' })).toBeVisible();
    });

    test('同一内容を再取り込み: 変化なしが明示される', async () => {
        await uploadFiles(page, [
            fixture('gen2-followers_1.json'),
            fixture('gen2-followers_2.json'),
            fixture('gen2-following.json'),
        ]);

        await page.goto('/');
        await expect(page.getByRole('status').filter({ hasText: '前回から変化はありません' })).toBeVisible();
        await expect(page.getByText('±0', { exact: true })).toBeVisible();
    });
});
