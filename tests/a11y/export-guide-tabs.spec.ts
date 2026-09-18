import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * インポート画面（/imports）のエクスポート手順タブ（ExportGuide）の a11y e2e。
 * PC / スマートフォンの手順切り替え（role=tablist・矢印キー移動・aria-selected・tabpanel の表示切替）を検証する。
 * ページ全体（初期表示）の axe スキャンは tests/admin-shell.spec.ts（SC-004）で
 * ライト/ダーク両テーマとも実施済みのため、ここではタブ切り替えという「状態が変わった後」の
 * a11y に絞って検証する。認証不要のため beforeEach でのログイン処理は不要
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const tablist = (page: Page) => page.getByRole('tablist', { name: 'エクスポート手順の端末' });

test.describe('ExportGuide タブ切り替え a11y', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/imports');
        await page.waitForLoadState('networkidle');
    });

    test('既定タブは PC（ブラウザ）で、選択中タブに aria-selected が付く', async ({ page }) => {
        const pcTab = tablist(page).getByRole('tab', { name: 'PC（ブラウザ）' });
        const spTab = tablist(page).getByRole('tab', { name: 'スマートフォン（アプリ）' });

        await expect(pcTab).toHaveAttribute('aria-selected', 'true');
        await expect(spTab).toHaveAttribute('aria-selected', 'false');
        await expect(page.getByRole('tabpanel')).toContainText('アカウントセンター] をクリックしてから');
    });

    test('クリックでタブを切り替えると tabpanel の内容も切り替わる', async ({ page }) => {
        const spTab = tablist(page).getByRole('tab', { name: 'スマートフォン（アプリ）' });

        await spTab.click();

        await expect(spTab).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('tabpanel')).toContainText('右上の [≡]（メニュー）をタップして');
    });

    test('矢印キー（ArrowRight/ArrowLeft）でタブが移動し、フォーカスが追従する', async ({ page }) => {
        const pcTab = tablist(page).getByRole('tab', { name: 'PC（ブラウザ）' });
        const spTab = tablist(page).getByRole('tab', { name: 'スマートフォン（アプリ）' });

        await pcTab.focus();
        await expect(pcTab).toBeFocused();

        await page.keyboard.press('ArrowRight');
        await expect(spTab).toBeFocused();
        await expect(spTab).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('tabpanel')).toContainText('右上の [≡]（メニュー）をタップして');

        await page.keyboard.press('ArrowLeft');
        await expect(pcTab).toBeFocused();
        await expect(pcTab).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('tabpanel')).toContainText('アカウントセンター] をクリックしてから');
    });

    test('スマートフォン手順タブに切り替えた状態でも WCAG 2.1 AA 違反なし', async ({ page }) => {
        const spTab = tablist(page).getByRole('tab', { name: 'スマートフォン（アプリ）' });
        await spTab.click();
        await expect(page.getByRole('tabpanel')).toContainText('右上の [≡]（メニュー）をタップして');

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(results.violations).toEqual([]);
    });
});
