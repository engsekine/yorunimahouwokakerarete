import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { vi } from 'vitest';

import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
    it('label と input が関連付けられ、初期状態は type=password でマスクされる', () => {
        render(<PasswordField id="password" label="パスワード" />);

        const input = screen.getByLabelText('パスワード');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('id', 'password');
        expect(input).toHaveAttribute('type', 'password');
    });

    it('トグルボタンの初期表示は「表示」ラベルで aria-pressed=false', () => {
        render(<PasswordField id="password" label="パスワード" />);

        const toggleButton = screen.getByRole('button', { name: '表示' });
        expect(toggleButton).toHaveAttribute('type', 'button');
        expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('トグルボタンをクリックすると type が text に切り替わり、ラベルと aria-pressed が反転する', async () => {
        const user = userEvent.setup();
        render(<PasswordField id="password" label="パスワード" />);

        const toggleButton = screen.getByRole('button', { name: '表示' });
        await user.click(toggleButton);

        const input = screen.getByLabelText('パスワード');
        expect(input).toHaveAttribute('type', 'text');
        expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: '隠す' })).toBeInTheDocument();
    });

    it('再度クリックすると type=password・aria-pressed=false・ラベル「表示」に戻る', async () => {
        const user = userEvent.setup();
        render(<PasswordField id="password" label="パスワード" />);

        const toggleButton = screen.getByRole('button', { name: '表示' });
        await user.click(toggleButton);
        await user.click(screen.getByRole('button', { name: '隠す' }));

        const input = screen.getByLabelText('パスワード');
        expect(input).toHaveAttribute('type', 'password');
        expect(screen.getByRole('button', { name: '表示' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('hint も error もない場合は aria-describedby が付与されない', () => {
        render(<PasswordField id="password" label="パスワード" />);

        const input = screen.getByLabelText('パスワード');
        expect(input).not.toHaveAttribute('aria-describedby');
        expect(input).toHaveAttribute('aria-invalid', 'false');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('hint がある場合は補足説明が表示され aria-describedby で関連付く', () => {
        render(<PasswordField id="password" label="パスワード" hint="8文字以上の英数字で入力してください" />);

        const input = screen.getByLabelText('パスワード');
        expect(input).toHaveAttribute('aria-describedby', 'password-hint');
        expect(screen.getByText('8文字以上の英数字で入力してください')).toHaveAttribute('id', 'password-hint');
    });

    it('error がある場合は role="alert" で表示され aria-invalid・aria-describedby が付与される', () => {
        render(<PasswordField id="password" label="パスワード" error="パスワードを入力してください" />);

        const input = screen.getByLabelText('パスワード');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby', 'password-error');

        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('id', 'password-error');
        expect(alert).toHaveTextContent('パスワードを入力してください');
    });

    it('hint と error が両方ある場合、aria-describedby に両方の id が含まれる', () => {
        render(
            <PasswordField
                id="password"
                label="パスワード"
                hint="8文字以上の英数字で入力してください"
                error="パスワードを入力してください"
            />,
        );

        const input = screen.getByLabelText('パスワード');
        expect(input).toHaveAttribute('aria-describedby', 'password-hint password-error');
    });

    it('ref・onChange・name などの input props が透過される（react-hook-form register 互換）', async () => {
        const handleChange = vi.fn();
        const inputRef = createRef<HTMLInputElement>();
        const user = userEvent.setup();

        render(
            <PasswordField
                id="password"
                label="パスワード"
                name="password"
                placeholder="パスワードを入力"
                ref={inputRef}
                onChange={handleChange}
            />,
        );

        const input = screen.getByLabelText('パスワード');
        expect(input).toHaveAttribute('name', 'password');
        expect(input).toHaveAttribute('placeholder', 'パスワードを入力');
        expect(inputRef.current).toBe(input);

        await user.type(input, 'a');
        expect(handleChange).toHaveBeenCalled();
        expect(input).toHaveValue('a');
    });
});
