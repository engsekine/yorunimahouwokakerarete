import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingStatus } from './LoadingStatus';

describe('LoadingStatus', () => {
    it('既定の文言を role="status" で表示する', () => {
        render(<LoadingStatus />);

        expect(screen.getByRole('status')).toHaveTextContent('読み込み中…');
    });

    it('label で文言を差し替えられる', () => {
        render(<LoadingStatus label="接続を確認しています…" />);

        expect(screen.getByRole('status')).toHaveTextContent('接続を確認しています…');
    });
});
