import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormTextarea } from './FormTextarea';

const meta = {
    title: 'shared/form/FormTextarea',
    component: FormTextarea,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
    },
} satisfies Meta<typeof FormTextarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        id: 'notes',
        label: 'メモ・印象',
        rows: 4,
    },
};

export const WithError: Story = {
    args: {
        id: 'notes',
        label: 'メモ・印象',
        rows: 4,
        error: 'メモは1000文字以内で入力してください',
    },
};

export const Required: Story = {
    args: {
        id: 'notes',
        label: 'メモ・印象',
        rows: 4,
        required: true,
    },
};
