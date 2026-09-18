import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DeleteImportButton } from './DeleteImportButton';

const meta = {
    title: 'features/follower-import/DeleteImportButton',
    component: DeleteImportButton,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
} satisfies Meta<typeof DeleteImportButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        importId: 'story-import-1',
    },
};
