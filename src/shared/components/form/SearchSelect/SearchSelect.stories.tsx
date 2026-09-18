import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { SearchSelect } from './SearchSelect';

const OPTIONS = [
    { value: '1', label: '伊豆 / 大瀬崎' },
    { value: '2', label: '伊豆 / 富戸' },
    { value: '3', label: 'フォロワー推移' },
    { value: '4', label: '和歌山 / 串本' },
];

const meta = {
    title: 'shared/form/SearchSelect',
    component: SearchSelect,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
} satisfies Meta<typeof SearchSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 制御コンポーネントのため state を持つラッパーで表示する */
const Interactive = (args: { error?: string; required?: boolean }) => {
    const [value, setValue] = useState('');
    return (
        <SearchSelect
            id="site"
            label="レポート"
            options={OPTIONS}
            value={value}
            onChange={setValue}
            placeholder="ポイント名・エリアで検索"
            {...args}
        />
    );
};

export const Default: Story = {
    render: () => <Interactive />,
};

export const Required: Story = {
    render: () => <Interactive required />,
};

export const WithError: Story = {
    render: () => <Interactive error="ポイントを選択するか、ポイント名を入力してください" />,
};
