'use client';

import { type ComponentPropsWithRef, useState } from 'react';

import { Input } from '@/shared/components/ui/Input';

interface PasswordFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
    id: string;
    label: string;
    error?: string | undefined;
    /** パスワード要件などの補足説明。aria-describedby で入力欄に関連付ける */
    hint?: string | undefined;
}

/**
 * マスク表示 + 表示/非表示トグル付きのパスワード入力。
 * トグルはフォーム送信を発火させないよう type="button" とし、
 * 状態はボタンの aria-pressed とラベル文言で支援技術に伝える。
 */
export const PasswordField = ({ id, label, error, hint, ...inputProps }: PasswordFieldProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="font-medium text-sm">
                {label}
            </label>
            <div className="flex items-center gap-2">
                <Input
                    id={id}
                    type={isVisible ? 'text' : 'password'}
                    aria-invalid={!!error}
                    aria-describedby={describedBy}
                    className="flex-1"
                    {...inputProps}
                />
                <button
                    type="button"
                    aria-pressed={isVisible}
                    onClick={() => setIsVisible((prev) => !prev)}
                    className="min-h-11 min-w-11 rounded-md border border-border px-2 text-muted-foreground text-xs hover:text-foreground"
                >
                    {isVisible ? '隠す' : '表示'}
                </button>
            </div>
            {hint && (
                <p id={hintId} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}
            {error && (
                <span id={errorId} role="alert" className="text-red-700 text-sm dark:text-red-400">
                    {error}
                </span>
            )}
        </div>
    );
};
