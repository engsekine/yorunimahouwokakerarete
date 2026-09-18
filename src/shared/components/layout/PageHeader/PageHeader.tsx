import type { ReactNode } from 'react';

import { Heading } from '@/shared/components/typography/Heading';

interface PageHeaderProps {
    title: string;
    description?: string;
    /** 右寄せの主要アクション（任意） */
    actions?: ReactNode;
}

/**
 * 管理画面ページ共通の見出し。タイトル（h1）+ 説明 + 右寄せアクション。
 * WordPress 管理画面のページヘッダー相当（screens/admin-shell.md）。
 */
export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
    <div className="flex flex-wrap items-start justify-between gap-4 border-border border-b pb-4">
        <div className="flex flex-col gap-1">
            <Heading level={1}>{title}</Heading>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
);
