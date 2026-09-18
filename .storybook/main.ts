import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/nextjs-vite';
import tailwindcss from '@tailwindcss/vite';

const storybookDir = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
    stories: ['./*.mdx', '../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [
        getAbsolutePath('@chromatic-com/storybook'),
        getAbsolutePath('@storybook/addon-vitest'),
        getAbsolutePath('@storybook/addon-a11y'),
        getAbsolutePath('@storybook/addon-docs'),
    ],
    framework: getAbsolutePath('@storybook/nextjs-vite'),
    staticDirs: ['../public'],

    viteFinal: (config) => {
        config.plugins = config.plugins ?? [];
        config.plugins.unshift(tailwindcss());
        // `@/` alias を明示する。tsconfig.json は `**/*.stories.tsx` を exclude しているため、
        // Vite / vite-tsconfig-paths の tsconfig ベースの解決は story ファイル自身の
        // `@/...` import に適用されない（@storybook/nextjs-vite 10.6 以降で顕在化）
        const srcDir = resolve(storybookDir, '../src');
        const extraAliases = [{ find: /^@\/(.*)$/, replacement: `${srcDir}/$1` }];
        const existingAlias = config.resolve?.alias;
        const existingAliasEntries = Array.isArray(existingAlias)
            ? existingAlias
            : Object.entries(existingAlias ?? {}).map(([find, replacement]) => ({ find, replacement }));
        config.resolve = {
            ...config.resolve,
            alias: [...existingAliasEntries, ...extraAliases],
        };
        return config;
    },
};

export default config;

function getAbsolutePath(value: string): string {
    return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
