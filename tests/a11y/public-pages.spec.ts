import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * 管理画面シェルの外側にあるページの自動 a11y スキャン（SC-005）。
 * WCAG 2.1 AA 相当のタグで axe-core を実行し、違反 0 件を保証する。
 * トップ `/` はホーム（管理画面シェル配下）になったため、/imports とあわせて
 * admin-shell.spec.ts でライト/ダーク両テーマを検査する。
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const PUBLIC_PAGES = [{ path: '/this-page-does-not-exist', name: 'Not Found' }] as const;

for (const { path, name } of PUBLIC_PAGES) {
    test(`${name}（${path}）- WCAG 2.1 AA 違反なし`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(results.violations).toEqual([]);
    });
}
