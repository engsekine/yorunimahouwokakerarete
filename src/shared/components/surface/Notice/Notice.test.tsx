import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Notice } from './Notice';

describe('Notice', () => {
    it('success は role="status" で表示する', () => {
        render(<Notice variant="success">保存しました</Notice>);
        expect(screen.getByRole('status')).toHaveTextContent('保存しました');
    });

    it('info は role="status" で表示する', () => {
        render(<Notice variant="info">お知らせ</Notice>);
        expect(screen.getByRole('status')).toHaveTextContent('お知らせ');
    });

    it('error は role="alert" で表示する', () => {
        render(<Notice variant="error">失敗しました</Notice>);
        expect(screen.getByRole('alert')).toHaveTextContent('失敗しました');
    });
});
