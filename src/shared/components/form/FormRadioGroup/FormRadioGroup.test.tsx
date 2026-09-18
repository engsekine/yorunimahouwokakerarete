import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { FormRadioGroup } from './FormRadioGroup';

const entryTypeOptions = [
    { value: 'boat', label: 'ボート' },
    { value: 'beach', label: 'ビーチ' },
] as const;

describe('FormRadioGroup', () => {
    it('legend と radio が fieldset 内に表示される', () => {
        render(<FormRadioGroup legend="エントリー" name="entryType" options={entryTypeOptions} />);

        expect(screen.getByRole('group', { name: 'エントリー' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'ボート' })).toHaveAttribute('value', 'boat');
        expect(screen.getByRole('radio', { name: 'ビーチ' })).toHaveAttribute('value', 'beach');
    });

    it('全ての radio が同じ name を持つ', () => {
        render(<FormRadioGroup legend="エントリー" name="entryType" options={entryTypeOptions} />);

        for (const radio of screen.getAllByRole('radio')) {
            expect(radio).toHaveAttribute('name', 'entryType');
        }
    });

    it('defaultValue に一致する radio が初期選択される', () => {
        render(<FormRadioGroup legend="エントリー" name="entryType" options={entryTypeOptions} defaultValue="beach" />);

        expect(screen.getByRole('radio', { name: 'ビーチ' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'ボート' })).not.toBeChecked();
    });

    it('エラーがあると alert ロールで表示され fieldset と radio に aria 属性が紐付く', () => {
        render(
            <FormRadioGroup
                legend="エントリー"
                name="entryType"
                options={entryTypeOptions}
                error="エントリー方法を選択してください"
            />,
        );

        expect(screen.getByRole('group')).toHaveAttribute('aria-describedby', 'entryType-error');
        // ARIA 1.2 で radio ロールへの aria-invalid は非推奨のため付与しない（エラーは fieldset の aria-describedby で紐付け）
        for (const radio of screen.getAllByRole('radio')) {
            expect(radio).not.toHaveAttribute('aria-invalid');
        }

        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('id', 'entryType-error');
        expect(alert).toHaveTextContent('エントリー方法を選択してください');
    });

    it('required の場合は radio が必須になり必須マークが付く', () => {
        render(<FormRadioGroup legend="エントリー" name="entryType" options={entryTypeOptions} required />);

        for (const radio of screen.getAllByRole('radio')) {
            expect(radio).toBeRequired();
        }
        expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByText('必須')).toHaveClass('sr-only');
    });

    it('radio を選択すると onChange が呼ばれる', async () => {
        const handleChange = vi.fn();
        const user = userEvent.setup();
        render(
            <FormRadioGroup legend="エントリー" name="entryType" options={entryTypeOptions} onChange={handleChange} />,
        );

        await user.click(screen.getByRole('radio', { name: 'ボート' }));

        expect(handleChange).toHaveBeenCalled();
        expect(screen.getByRole('radio', { name: 'ボート' })).toBeChecked();
    });
});
