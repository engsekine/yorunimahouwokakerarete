import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { clearAppStorage, readStorage, STORAGE_NAMES } from './helpers/browser-storage';

/**
 * 管理画面シェルの e2e（004 / quickstart.md シナリオ 1〜4）。
 * ログイン不要。シェル表示・メニュー遷移とハイライト・ホーム（トップ `/` のダッシュボード）・
 * ライト/ダーク両テーマの axe スキャンを検証する。
 * データはブラウザ保存（localStorage）に置かれるため、同一の page（= 同一コンテキスト）を
 * テスト間で共有してシリアルに進める。
 */

const FIXTURE = join(process.cwd(), 'tests/fixtures/instagram-export/export-gen1.zip');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** ライト・ダーク両テーマで axe スキャン（SC-004）。transition-colors の収束を待ってから測る */
const expectNoAxeBothThemes = async (page: Page) => {
    const light = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(light.violations).toEqual([]);
    await page.getByRole('button', { name: 'ダークモードを切り替える' }).click();
    await page.waitForTimeout(500); // 色トランジションの収束を待つ（中間色の誤検知防止）
    const dark = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(dark.violations).toEqual([]);
    await page.getByRole('button', { name: 'ダークモードを切り替える' }).click(); // 元に戻す
    await page.waitForTimeout(500);
};

const nav = (page: Page) => page.getByRole('navigation', { name: '管理メニュー' });

test.describe.configure({ mode: 'serial' });

test.describe('管理画面シェル e2e', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await (await browser.newContext()).newPage();
    });

    test.afterAll(async () => {
        await page.context().close();
    });

    test('シェル（サイドバー・上部バー・メイン）が表示される（US1）', async () => {
        await page.goto('/');
        await expect(nav(page)).toBeVisible();
        await expect(page.getByRole('banner')).toBeVisible();
        await expect(page.getByRole('main')).toBeVisible();
        // ホーム（トップ）が現在地
        await expect(nav(page).getByRole('link', { name: 'ホーム' })).toHaveAttribute('aria-current', 'page');
    });

    test('メニュー遷移でコンテンツが切り替わり、現在地がハイライトされる（US1）', async () => {
        await page.goto('/');

        await nav(page).getByRole('link', { name: 'インポート' }).click();
        await expect(page).toHaveURL(/\/imports$/);
        await expect(nav(page).getByRole('link', { name: 'インポート' })).toHaveAttribute('aria-current', 'page');

        await nav(page).getByRole('link', { name: 'ホーム' }).click();
        await expect(page).toHaveURL('/');
        await expect(nav(page).getByRole('link', { name: 'ホーム' })).toHaveAttribute('aria-current', 'page');
    });

    test('インポート詳細ページでも親メニュー（インポート）がハイライトされる（US1）', async () => {
        // 詳細ページを 1 件用意するため取り込みを 1 回行う
        await page.goto('/imports');
        await page.getByLabel(/エクスポートファイル/).setInputFiles(FIXTURE);
        await page.getByLabel('対象の Instagram アカウント ID').fill('yorunimahouwokakerarete_owner');
        await page.getByRole('button', { name: '取り込む' }).click();
        await expect(page).toHaveURL(/\/imports\/[0-9a-f-]+$/);
        await expect(nav(page).getByRole('link', { name: 'インポート' })).toHaveAttribute('aria-current', 'page');
    });

    test('ダッシュボードにウィジェットが並び、専用ページへ移動できる（US2）', async () => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'フォロワーインポート' })).toBeVisible();
        // インポートは前テストで 1 件あるため取り込み済みサマリが出る
        await page.getByRole('main').getByRole('link', { name: '取り込み・差分を見る' }).click();
        await expect(page).toHaveURL(/\/imports$/);
    });

    test('ダッシュボード・各ページがライト/ダーク両テーマで a11y 違反なし（SC-004）', async () => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: '取り込み・差分を見る' })).toBeVisible();
        await expectNoAxeBothThemes(page);
        await page.goto('/imports');
        await expect(page.getByRole('table')).toBeVisible();
        await expectNoAxeBothThemes(page);
    });

    test('ホームの削除ボタンで取り込んだデータをすべて消せる（確認ステップ付き）', async () => {
        await page.goto('/');
        // 前テストで 1 件取り込み済みのため、ボタンは有効
        const deleteButton = page.getByRole('button', { name: '取り込んだデータをすべて削除' });
        await expect(deleteButton).toBeEnabled();
        await deleteButton.click();

        const dialog = page.getByRole('dialog', { name: '取り込んだデータをすべて削除しますか？' });
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText('取り込み履歴 1 件');
        await dialog.getByRole('button', { name: '削除する' }).click();

        await expect(page.getByRole('status').filter({ hasText: '取り込んだデータを削除しました' })).toBeVisible();
        // ウィジェットが「取り込みなし」に戻り、保存キーも消えている
        await expect(page.getByRole('link', { name: 'エクスポートを取り込む' })).toBeVisible();
        expect(await readStorage(page, STORAGE_NAMES.followerImports)).toBeNull();
        await expect(deleteButton).toBeDisabled();
    });

    test('モバイル幅でサイドバーが Sheet として開閉できる（US4）', async () => {
        await page.setViewportSize({ width: 390, height: 800 });
        await page.goto('/');

        // 常設サイドバーは隠れ、トグルで Sheet が開く
        await page.getByRole('button', { name: 'サイドバーを切り替える' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('link', { name: 'インポート' }).click();
        await expect(page).toHaveURL(/\/imports$/);
        // 選択で Sheet が閉じる
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await page.setViewportSize({ width: 1280, height: 800 });
    });

    test('後片付け: ブラウザ保存を消去する', async () => {
        await page.goto('/');
        await clearAppStorage(page);
        await page.reload();
        await expect(page.getByRole('link', { name: 'エクスポートを取り込む' })).toBeVisible();
    });
});
