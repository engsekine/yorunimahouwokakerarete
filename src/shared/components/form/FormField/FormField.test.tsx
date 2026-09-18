import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { FormField } from './FormField';

describe('FormField', () => {
    it('label と input が関連付けられている', () => {
        render(<FormField id="email" label="メールアドレス" type="email" />);

        const input = screen.getByLabelText('メールアドレス');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('id', 'email');
        expect(input).toHaveAttribute('type', 'email');
    });

    it('エラーなしの場合は aria-invalid=false でエラー表示なし', () => {
        render(<FormField id="email" label="メールアドレス" />);

        const input = screen.getByLabelText('メールアドレス');
        expect(input).toHaveAttribute('aria-invalid', 'false');
        expect(input).not.toHaveAttribute('aria-describedby');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('エラーがあると alert ロールで表示され aria 属性が紐付く', () => {
        render(<FormField id="email" label="メールアドレス" error="メールアドレスを入力してください" />);

        const input = screen.getByLabelText('メールアドレス');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby', 'email-error');

        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('id', 'email-error');
        expect(alert).toHaveTextContent('メールアドレスを入力してください');
    });

    it('required の場合は aria-required と必須マークが付く', () => {
        render(<FormField id="email" label="メールアドレス" required />);

        const input = screen.getByLabelText(/メールアドレス/);
        expect(input).toHaveAttribute('aria-required', 'true');
        expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByText('必須')).toHaveClass('sr-only');
    });

    it('input への props（onChange / name / placeholder）が spread される', async () => {
        const handleChange = vi.fn();
        const user = userEvent.setup();
        render(
            <FormField
                id="email"
                label="メールアドレス"
                name="email"
                placeholder="example@domain.com"
                onChange={handleChange}
            />,
        );

        const input = screen.getByPlaceholderText('example@domain.com');
        expect(input).toHaveAttribute('name', 'email');

        await user.type(input, 'a');
        expect(handleChange).toHaveBeenCalled();
        expect(input).toHaveValue('a');
    });
});
