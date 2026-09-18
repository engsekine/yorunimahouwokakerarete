import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
    BROWSER_STORAGE_GUIDE,
    EXPORT_GUIDE_DEVICES,
    EXPORT_GUIDE_STEPS,
    EXPORT_GUIDE_TITLE,
    EXPORT_REFRESH_NOTE,
    SHARED_DEVICE_WARNING,
} from '@/features/follower-import/constants';

import { ExportGuide } from './ExportGuide';

const pcDevice = EXPORT_GUIDE_DEVICES[0];
const spDevice = EXPORT_GUIDE_DEVICES[1];
const pcFirstStep = EXPORT_GUIDE_STEPS.pc[0];
const spFirstStep = EXPORT_GUIDE_STEPS.sp[0];

if (!pcDevice || !spDevice || !pcFirstStep || !spFirstStep) {
    throw new Error('EXPORT_GUIDE_DEVICES / EXPORT_GUIDE_STEPS の定義が不足しています');
}

describe('ExportGuide', () => {
    it('タイトルを表示する', () => {
        render(<ExportGuide />);

        expect(screen.getByText(EXPORT_GUIDE_TITLE)).toBeInTheDocument();
    });

    it('端末切り替えタブ（role=tablist・2 つの role=tab）を表示する', () => {
        render(<ExportGuide />);

        expect(screen.getByRole('tablist', { name: 'エクスポート手順の端末' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: pcDevice.label })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: spDevice.label })).toBeInTheDocument();
    });

    it('既定では PC の手順を表示し、SP の手順は表示しない', () => {
        render(<ExportGuide />);

        expect(screen.getByText(pcFirstStep)).toBeInTheDocument();
        expect(screen.queryByText(spFirstStep)).not.toBeInTheDocument();
        expect(screen.getByRole('tab', { name: pcDevice.label })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: spDevice.label })).toHaveAttribute('aria-selected', 'false');
    });

    it('「スマートフォン（アプリ）」タブをクリックすると SP の手順に切り替わる', async () => {
        const user = userEvent.setup();
        render(<ExportGuide />);

        await user.click(screen.getByRole('tab', { name: spDevice.label }));

        expect(await screen.findByText(spFirstStep)).toBeInTheDocument();
        expect(screen.queryByText(pcFirstStep)).not.toBeInTheDocument();
        expect(screen.getByRole('tab', { name: spDevice.label })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: pcDevice.label })).toHaveAttribute('aria-selected', 'false');
    });

    it('補足文（再作成の注意・ブラウザ保存の説明）を表示する', () => {
        render(<ExportGuide />);

        expect(screen.getByText(EXPORT_REFRESH_NOTE)).toBeInTheDocument();
        expect(screen.getByText(BROWSER_STORAGE_GUIDE)).toBeInTheDocument();
    });

    it('共用パソコンで取り込みを行わない注意（手動で削除するまでデータが残る旨）を表示する', () => {
        render(<ExportGuide />);

        expect(screen.getByText(SHARED_DEVICE_WARNING)).toBeInTheDocument();
        expect(SHARED_DEVICE_WARNING).toContain('共用パソコン');
        expect(SHARED_DEVICE_WARNING).toContain('手動で削除');
    });
});
