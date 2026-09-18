import { defineConfig, devices } from '@playwright/test';

const PORT = 9323;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env['CI'],
    retries: process.env['CI'] ? 2 : 0,
    ...(process.env['CI'] ? { workers: 1 } : {}),
    reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'html',
    // CI では next dev のオンデマンドコンパイルで初回ナビゲーションが遅いため余裕を持たせる
    ...(process.env['CI'] ? { timeout: 120_000 } : {}),

    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        locale: 'ja-JP',
        ...(process.env['CI'] ? { navigationTimeout: 60_000 } : {}),
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: {
        // Docker 側 dev サーバーと .next を共有しないよう専用 dist dir を使う（キャッシュ破損防止）
        // NEXT_PUBLIC_SITE_URL をこのサーバー自身に向け、確認メールのリンクがテストサーバーへ戻るようにする
        command: `NEXT_DIST_DIR=.next-playwright NEXT_PUBLIC_SITE_URL=${BASE_URL} next dev -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env['CI'],
        // CI（2 コアランナー）では初回コンパイルが遅く起動状況の確認も必要なため stdout を出す
        stdout: process.env['CI'] ? 'pipe' : 'ignore',
        stderr: 'pipe',
        // CI のコールドスタート（React Compiler 込みの初回コンパイル）は 120 秒を超えるため余裕を持たせる
        timeout: process.env['CI'] ? 300_000 : 120_000,
    },
});
