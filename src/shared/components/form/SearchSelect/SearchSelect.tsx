'use client';

import { useId, useRef, useState } from 'react';

import type { FormSelectOption } from '../FormSelect';

interface SearchSelectProps {
    id: string;
    label: string;
    options: ReadonlyArray<FormSelectOption>;
    /** 選択中の値（option.value）。未選択は空文字 */
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** 候補が 0 件のときの文言 */
    emptyMessage?: string;
    error?: string | undefined;
    required?: boolean;
}

/**
 * 検索付き単一選択コンボボックス（WAI-ARIA combobox パターン）。
 * キーワードで候補を絞り込み、キーボード操作（↑↓ / Enter / Esc）に対応する。
 * 値は controlled（value / onChange）。react-hook-form からは Controller 相当で接続する。
 */
export const SearchSelect = ({
    id,
    label,
    options,
    value,
    onChange,
    placeholder,
    emptyMessage = '該当するものがありません',
    error,
    required,
}: SearchSelectProps) => {
    const listboxId = useId();
    const errorId = `${id}-error`;
    const inputRef = useRef<HTMLInputElement | null>(null);

    const selectedLabel = options.find((option) => option.value === value)?.label ?? '';

    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    // 入力中はクエリで絞り込み、閉じているときは選択ラベルを表示する
    const keyword = query.trim().toLowerCase();
    const filtered = keyword ? options.filter((option) => option.label.toLowerCase().includes(keyword)) : options;

    const open = () => {
        setIsOpen(true);
        setActiveIndex(-1);
    };

    const close = () => {
        setIsOpen(false);
        setActiveIndex(-1);
        setQuery('');
    };

    const select = (option: FormSelectOption) => {
        onChange(option.value);
        close();
    };

    const clear = () => {
        onChange('');
        setQuery('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                open();
                return;
            }
            setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return;
        }
        if (e.key === 'Enter') {
            const option = filtered[activeIndex];
            if (isOpen && option) {
                e.preventDefault();
                select(option);
            }
            return;
        }
        if (e.key === 'Escape') {
            close();
        }
    };

    const displayValue = isOpen ? query : selectedLabel;

    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="font-medium text-sm">
                {label}
                {required && (
                    <>
                        <span aria-hidden="true" className="ml-1 text-red-700 dark:text-red-400">
                            *
                        </span>
                        <span className="sr-only">必須</span>
                    </>
                )}
            </label>

            <div className="relative">
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder={placeholder}
                    value={displayValue}
                    aria-expanded={isOpen}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-required={required ? 'true' : undefined}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    onFocus={open}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen) setIsOpen(true);
                        setActiveIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        // 候補クリックの選択を妨げないよう遅延して閉じる
                        window.setTimeout(close, 120);
                    }}
                />
                {value && !isOpen && (
                    <button
                        type="button"
                        onClick={clear}
                        aria-label="選択を解除"
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground text-sm hover:text-foreground"
                    >
                        ×
                    </button>
                )}

                {isOpen && (
                    <ul
                        id={listboxId}
                        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA combobox の listbox。ul=listbox は正しいパターン
                        role="listbox"
                        aria-label={label}
                        className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-lg"
                    >
                        {filtered.length === 0 ? (
                            // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA listbox の option。li=option は正しいパターン
                            // biome-ignore lint/a11y/useFocusableInteractive: フォーカスは入力欄に保持し option は aria-activedescendant 相当で選択する
                            <li role="option" aria-selected="false" className="px-3 py-2 text-muted-foreground text-sm">
                                {emptyMessage}
                            </li>
                        ) : (
                            filtered.map((option, index) => (
                                // biome-ignore lint/a11y/useFocusableInteractive: フォーカスは入力欄に保持し option は activeIndex で選択する
                                <li
                                    key={option.value}
                                    // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA listbox の option。li=option は正しいパターン
                                    role="option"
                                    aria-selected={option.value === value}
                                    className={`cursor-pointer px-3 py-2 text-sm ${
                                        index === activeIndex ? 'bg-muted' : ''
                                    }`}
                                    onMouseDown={(e) => {
                                        // blur より先に選択を確定させる
                                        e.preventDefault();
                                        select(option);
                                    }}
                                    onMouseEnter={() => setActiveIndex(index)}
                                >
                                    {option.label}
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            {error && (
                <span id={errorId} role="alert" className="text-red-700 text-sm dark:text-red-400">
                    {error}
                </span>
            )}
        </div>
    );
};
