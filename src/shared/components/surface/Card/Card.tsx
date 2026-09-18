import type { ReactNode } from 'react';

import { Heading } from '@/shared/components/typography/Heading';

interface CardProps {
    /** 指定時はカード見出し（h2）を表示する */
    title?: string;
    actions?: ReactNode;
    children: ReactNode;
}

/**
 * 情報を囲うカード（WordPress のメタボックス相当）。
 * title 指定時は見出し + 右寄せアクションのヘッダーを持つ。
 * 背景はページの地色（bg-background）ではなくカード用トークン（bg-card）にし、少し暗い地色の上で白く浮かせる
 */
export const Card = ({ title, actions, children }: CardProps) => (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground">
        {(title || actions) && (
            <div className="flex items-center justify-between gap-4">
                {title && <Heading level={2}>{title}</Heading>}
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
        )}
        {children}
    </section>
);
