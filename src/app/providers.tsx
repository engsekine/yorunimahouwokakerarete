'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode, useEffect } from 'react';

import { getQueryClient } from '@/shared/lib/react-query';
import { STORAGE_PREFIX } from '@/shared/lib/storage';

/**
 * アプリケーション全体の Provider コンポーネント。
 * TanStack Query を提供し、他タブでのブラウザ保存の変更（storage イベント）を検知して
 * 全クエリを無効化する（複数タブで開いていても表示が古くならないようにする）
 */
export function Providers({ children }: { children: ReactNode }) {
    // useState で保持しない: Suspense でレンダーが破棄されても
    // getQueryClient がブラウザではシングルトンを返すためキャッシュは失われない
    const queryClient = getQueryClient();

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            /** key === null は clear()。アプリのキー以外（他サイト・他ツール）の変更は無視する */
            if (event.key !== null && !event.key.startsWith(STORAGE_PREFIX)) return;
            void queryClient.invalidateQueries();
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [queryClient]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* 開発環境でのみ React Query DevTools を表示 */}
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}
