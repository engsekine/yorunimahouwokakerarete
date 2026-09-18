import type { ComponentPropsWithRef } from 'react';

export interface FormSelectOption {
    value: string;
    label: string;
}

interface FormSelectProps extends ComponentPropsWithRef<'select'> {
    id: string;
    label: string;
    options: ReadonlyArray<FormSelectOption>;
    placeholder?: string;
    error?: string | undefined;
    required?: boolean;
}

export const FormSelect = ({ id, label, options, placeholder, error, required, ...selectProps }: FormSelectProps) => {
    const errorId = `${id}-error`;

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
            <select
                id={id}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                aria-required={required ? 'true' : undefined}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                {...selectProps}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && (
                <span id={errorId} role="alert" className="text-red-700 text-sm dark:text-red-400">
                    {error}
                </span>
            )}
        </div>
    );
};
