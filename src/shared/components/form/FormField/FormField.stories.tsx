import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormField } from './FormField';

const meta = {
    title: 'shared/form/FormField',
    component: FormField,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        id: 'email',
        label: 'メールアドレス',
        type: 'email',
        placeholder: 'example@domain.com',
    },
};

export const WithError: Story = {
    args: {
        id: 'email',
        label: 'メールアドレス',
        type: 'email',
        error: 'メールアドレスを入力してください',
    },
};

export const Required: Story = {
    args: {
        id: 'email',
        label: 'メールアドレス',
        type: 'email',
        required: true,
    },
};
