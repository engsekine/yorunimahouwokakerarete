import type { ComponentPropsWithRef } from 'react';

export interface FormRadioOption {
    value: string;
    label: string;
}

interface FormRadioGroupProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'id' | 'defaultValue'> {
    legend: string;
    name: string;
    options: ReadonlyArray<FormRadioOption>;
    /** 初期選択する option の value（非制御フォーム用） */
    defaultValue?: string;
    error?: string | undefined;
    required?: boolean;
}

export const FormRadioGroup = ({
    legend,
    name,
    options,
    defaultValue,
    error,
    required,
    ...radioProps
}: FormRadioGroupProps) => {
    const errorId = `${name}-error`;

    return (
        <fieldset className="flex flex-col gap-1" aria-describedby={error ? errorId : undefined}>
            <legend className="font-medium text-sm">
                {legend}
                {required && (
                    <>
                        <span aria-hidden="true">*</span>
                        <span className="sr-only">必須</span>
                    </>
                )}
            </legend>
            <div className="flex flex-wrap gap-4">
                {options.map((option) => (
                    <label key={option.value} className="flex items-center gap-1.5 text-sm">
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            defaultChecked={defaultValue !== undefined ? option.value === defaultValue : undefined}
                            required={required}
                            {...radioProps}
                        />
                        {option.label}
                    </label>
                ))}
            </div>
            {error && (
                <span id={errorId} role="alert" className="text-red-700 text-sm dark:text-red-400">
                    {error}
                </span>
            )}
        </fieldset>
    );
};
