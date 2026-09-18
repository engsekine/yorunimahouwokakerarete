import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormRadioGroup } from './FormRadioGroup';

const meta = {
    title: 'shared/form/FormRadioGroup',
    component: FormRadioGroup,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof FormRadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const entryTypeOptions = [
    { value: 'boat', label: 'ボート' },
    { value: 'beach', label: 'ビーチ' },
    { value: 'other', label: 'その他' },
];

export const Default: Story = {
    args: {
        legend: 'エントリー',
        name: 'entryType',
        options: entryTypeOptions,
        defaultValue: 'boat',
    },
};

export const WithError: Story = {
    args: {
        legend: 'エントリー',
        name: 'entryType',
        options: entryTypeOptions,
        error: 'エントリー方法を選択してください',
    },
};

export const Required: Story = {
    args: {
        legend: 'エントリー',
        name: 'entryType',
        options: entryTypeOptions,
        required: true,
    },
};
