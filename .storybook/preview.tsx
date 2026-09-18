import type { Preview } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './globals.css';
import './prose.css';
import '../src/app/globals.css';

/** story 間でキャッシュを共有しないよう、リトライ無しの QueryClient を story ごとに生成する */
const withQueryClient: NonNullable<Preview['decorators']>[number] = (Story) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Story />
    </QueryClientProvider>
);

const preview: Preview = {
    decorators: [withQueryClient],
    parameters: {
        // App Router 前提のプロジェクトのため、next/navigation（useRouter 等）のモックを全 story で有効化
        nextjs: {
            appDirectory: true,
        },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        a11y: {
            // 'todo' - show a11y violations in the test UI only
            // 'error' - fail CI on a11y violations
            // 'off' - skip a11y checks entirely
            test: 'error',
        },
    },
};

export default preview;
