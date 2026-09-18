import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, type RenderResult, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/**
 * テスト用の QueryClient。リトライ・gc を無効化して失敗を即時に観測できるようにする。
 * テストごとに新規生成し、キャッシュがテスト間で共有されないようにする。
 */
export const createTestQueryClient = (): QueryClient =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0, staleTime: 0 },
            mutations: { retry: false },
        },
    });

/**
 * TanStack Query の hooks を使うコンポーネントを描画するヘルパー。
 * ブラウザ保存を読む Client Component のテストで共通に使う。
 */
export const renderWithQueryClient = (
    ui: ReactElement,
    options: RenderOptions & { queryClient?: QueryClient } = {},
): RenderResult & { queryClient: QueryClient } => {
    const { queryClient = createTestQueryClient(), ...renderOptions } = options;
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
};
