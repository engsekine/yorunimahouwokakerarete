import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { SearchSelect } from './SearchSelect';

const OPTIONS = [
    { value: '1', label: '伊豆 / 大瀬崎' },
    { value: '2', label: '伊豆 / 富戸' },
    { value: '3', label: 'フォロワー推移' },
];

/** value を保持する制御ラッパー（onChange を観測する） */
const Harness = ({ onChange, initial = '' }: { onChange?: (v: string) => void; initial?: string }) => {
    const [value, setValue] = useState(initial);
    return (
        <SearchSelect
            id="site"
            label="レポート"
            options={OPTIONS}
            value={value}
            onChange={(v) => {
                setValue(v);
                onChange?.(v);
            }}
            placeholder="検索して選択"
        />
    );
};

describe('SearchSelect', () => {
    it('ラベルと combobox が表示される', () => {
        render(<Harness />);
        expect(screen.getByLabelText('レポート')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('フォーカスで候補（listbox）が開き全件表示される', () => {
        render(<Harness />);
        fireEvent.focus(screen.getByRole('combobox'));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('キーワードで候補が絞り込まれる', () => {
        render(<Harness />);
        const input = screen.getByRole('combobox');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '富戸' } });
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveTextContent('伊豆 / 富戸');
    });

    it('候補を選ぶと onChange が value で呼ばれる', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);
        const input = screen.getByRole('combobox');
        fireEvent.focus(input);
        fireEvent.mouseDown(screen.getByText('フォロワー推移'));
        expect(onChange).toHaveBeenCalledWith('3');
    });

    it('一致する候補が無いとき空メッセージを表示する', () => {
        render(<Harness />);
        const input = screen.getByRole('combobox');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'ない場所' } });
        expect(screen.getByText('該当するものがありません')).toBeInTheDocument();
    });

    it('選択済みのとき解除ボタンで未選択に戻る', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} initial="1" />);
        fireEvent.click(screen.getByRole('button', { name: '選択を解除' }));
        expect(onChange).toHaveBeenCalledWith('');
    });
});
