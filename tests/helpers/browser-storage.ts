import type { Page } from '@playwright/test';

/**
 * e2e から利用者のブラウザ保存（localStorage）を読み書きするヘルパー。
 * キー名はアプリ側（src/shared/lib/storage / 各 feature の repository）と揃える
 */

const STORAGE_PREFIX = 'yorunimahouwokakerarete:';

export const STORAGE_NAMES = {
    followerImports: 'follower-imports',
} as const;

export const readStorage = async <T>(page: Page, name: string): Promise<T | null> =>
    page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? 'null') as unknown,
        `${STORAGE_PREFIX}${name}`,
    ) as Promise<T | null>;

export const writeStorage = async (page: Page, name: string, value: unknown): Promise<void> => {
    await page.evaluate(
        ([key, json]) => {
            localStorage.setItem(key, json);
        },
        [`${STORAGE_PREFIX}${name}`, JSON.stringify(value)] as const,
    );
};

/** 保存済みの JSON オブジェクトに部分更新をかける */
export const patchStorage = async (page: Page, name: string, patch: Record<string, unknown>): Promise<void> => {
    const current = (await readStorage<Record<string, unknown>>(page, name)) ?? {};
    await writeStorage(page, name, { ...current, ...patch });
};

/** アプリの保存データをすべて消す（後片付け） */
export const clearAppStorage = async (page: Page): Promise<void> => {
    await page.evaluate((prefix) => {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix)) localStorage.removeItem(key);
        }
        sessionStorage.clear();
    }, STORAGE_PREFIX);
};
