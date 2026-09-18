import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type NoticeVariant = 'success' | 'error' | 'info';

interface NoticeProps {
    variant: NoticeVariant;
    children: ReactNode;
}

/** variant 別のスタイル（既存テーマトークンでライト/ダーク両対応） */
const VARIANT_STYLES: Record<NoticeVariant, string> = {
    success: 'border-green-600/40 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200',
    error: 'border-red-600/40 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200',
    /** bg-muted 上では text-muted-foreground のコントラストが足りなくなりうるため、前景は text-foreground にする */
    info: 'border-border bg-muted text-foreground',
};

/**
 * 操作結果・状態を伝える通知バナー。
 * error は role="alert"（即時通知）、success/info は role="status"（丁寧な通知）。
 */
export const Notice = ({ variant, children }: NoticeProps) => (
    <div
        role={variant === 'error' ? 'alert' : 'status'}
        className={cn('rounded-md border px-4 py-3 text-sm', VARIANT_STYLES[variant])}
    >
        {children}
    </div>
);
