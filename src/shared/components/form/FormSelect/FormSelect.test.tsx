import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { FormSelect } from './FormSelect';

const accountTypeOptions = [
    { value: 'personal', label: '個人' },
    { value: 'business', label: 'ビジネス' },
] as const;

describe('FormSelect', () => {
    it('label と select が関連付けられ、options が表示される', () => {
        render(<FormSelect id="accountType" label="アカウント種別" options={accountTypeOptions} />);

        const select = screen.getByLabelText('アカウント種別');
        expect(select).toHaveAttribute('id', 'accountType');
        expect(screen.getByRole('option', { name: '個人' })).toHaveValue('personal');
        expect(screen.getByRole('option', { name: 'ビジネス' })).toHaveValue('business');
    });

    it('placeholder を渡すと先頭に空の option が表示される', () => {
        render(
            <FormSelect
                id="accountType"
                label="アカウント種別"
                options={accountTypeOptions}
                placeholder="選択してください"
            />,
        );

        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveTextContent('選択してください');
        expect(options[0]).toHaveValue('');
        expect(options).toHaveLength(3);
    });

    it('エラーがあると alert ロールで表示され aria 属性が紐付く', () => {
        render(
            <FormSelect
                id="accountType"
                label="アカウント種別"
                options={accountTypeOptions}
                error="アカウント種別を選択してください"
            />,
        );

        const select = screen.getByLabelText('アカウント種別');
        expect(select).toHaveAttribute('aria-invalid', 'true');
        expect(select).toHaveAttribute('aria-describedby', 'accountType-error');

        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('id', 'accountType-error');
        expect(alert).toHaveTextContent('アカウント種別を選択してください');
    });

    it('required の場合は aria-required と必須マークが付く', () => {
        render(<FormSelect id="accountType" label="アカウント種別" options={accountTypeOptions} required />);

        expect(screen.getByLabelText(/アカウント種別/)).toHaveAttribute('aria-required', 'true');
        expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByText('必須')).toHaveClass('sr-only');
    });

    it('選択を変更すると onChange が呼ばれる', async () => {
        const handleChange = vi.fn();
        const user = userEvent.setup();
        render(
            <FormSelect
                id="accountType"
                label="アカウント種別"
                name="accountType"
                options={accountTypeOptions}
                onChange={handleChange}
            />,
        );

        const select = screen.getByLabelText('アカウント種別');
        expect(select).toHaveAttribute('name', 'accountType');

        await user.selectOptions(select, 'business');
        expect(handleChange).toHaveBeenCalled();
        expect(select).toHaveValue('business');
    });
});
