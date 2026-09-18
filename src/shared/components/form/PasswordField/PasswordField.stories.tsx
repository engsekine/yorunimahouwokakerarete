import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PasswordField } from './PasswordField';

const meta = {
    title: 'shared/form/PasswordField',
    component: PasswordField,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        id: 'password',
        label: 'パスワード',
    },
};

export const WithHint: Story = {
    args: {
        id: 'password-with-hint',
        label: 'パスワード',
        hint: '12文字以上・英大文字・英小文字・数字をそれぞれ含めてください',
    },
};

export const WithError: Story = {
    args: {
        id: 'password-with-error',
        label: 'パスワード',
        error: 'パスワードは12文字以上で入力してください',
    },
};
