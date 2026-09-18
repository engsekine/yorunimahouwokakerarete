import type { ComponentPropsWithRef } from 'react';

interface FormTextareaProps extends ComponentPropsWithRef<'textarea'> {
    id: string;
    label: string;
    error?: string | undefined;
    required?: boolean;
}

export const FormTextarea = ({ id, label, error, required, ...textareaProps }: FormTextareaProps) => {
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
            <textarea
                id={id}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                aria-required={required ? 'true' : undefined}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                {...textareaProps}
            />
            {error && (
                <span id={errorId} role="alert" className="text-red-700 text-sm dark:text-red-400">
                    {error}
                </span>
            )}
        </div>
    );
};
