import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormSelect } from './FormSelect';

const meta = {
    title: 'shared/form/FormSelect',
    component: FormSelect,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof FormSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const accountTypeOptions = [
    { value: 'personal', label: '個人' },
    { value: 'business', label: 'ビジネス' },
    { value: 'other', label: 'その他' },
];

export const Default: Story = {
    args: {
        id: 'accountType',
        label: 'アカウント種別',
        options: accountTypeOptions,
        placeholder: '選択してください',
    },
};

export const WithError: Story = {
    args: {
        id: 'accountType',
        label: 'アカウント種別',
        options: accountTypeOptions,
        placeholder: '選択してください',
        error: 'アカウント種別を選択してください',
    },
};

export const Required: Story = {
    args: {
        id: 'accountType',
        label: 'アカウント種別',
        options: accountTypeOptions,
        placeholder: '選択してください',
        required: true,
    },
};
