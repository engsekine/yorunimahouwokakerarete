import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { FormTextarea } from './FormTextarea';

describe('FormTextarea', () => {
    it('label と textarea が関連付けられている', () => {
        render(<FormTextarea id="notes" label="メモ・印象" />);

        const textarea = screen.getByLabelText('メモ・印象');
        expect(textarea.tagName).toBe('TEXTAREA');
        expect(textarea).toHaveAttribute('id', 'notes');
    });

    it('rows などの props が spread される', () => {
        render(<FormTextarea id="notes" label="メモ・印象" name="notes" rows={4} />);

        const textarea = screen.getByLabelText('メモ・印象');
        expect(textarea).toHaveAttribute('rows', '4');
        expect(textarea).toHaveAttribute('name', 'notes');
    });

    it('エラーがあると alert ロールで表示され aria 属性が紐付く', () => {
        render(<FormTextarea id="notes" label="メモ・印象" error="メモは1000文字以内で入力してください" />);

        const textarea = screen.getByLabelText('メモ・印象');
        expect(textarea).toHaveAttribute('aria-invalid', 'true');
        expect(textarea).toHaveAttribute('aria-describedby', 'notes-error');

        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('id', 'notes-error');
        expect(alert).toHaveTextContent('メモは1000文字以内で入力してください');
    });

    it('required の場合は aria-required と必須マークが付く', () => {
        render(<FormTextarea id="notes" label="メモ・印象" required />);

        expect(screen.getByLabelText(/メモ・印象/)).toHaveAttribute('aria-required', 'true');
        expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByText('必須')).toHaveClass('sr-only');
    });

    it('入力すると onChange が呼ばれる', async () => {
        const handleChange = vi.fn();
        const user = userEvent.setup();
        render(<FormTextarea id="notes" label="メモ・印象" onChange={handleChange} />);

        const textarea = screen.getByLabelText('メモ・印象');
        await user.type(textarea, '透明度が高かった');

        expect(handleChange).toHaveBeenCalled();
        expect(textarea).toHaveValue('透明度が高かった');
    });
});
