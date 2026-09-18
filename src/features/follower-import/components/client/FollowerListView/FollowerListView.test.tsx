import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FollowerListView } from './FollowerListView';

const followers = [
    { username: 'alice', profileUrl: 'https://www.instagram.com/alice' },
    { username: 'bob', profileUrl: 'https://www.instagram.com/bob' },
    { username: 'carol', profileUrl: 'https://www.instagram.com/carol' },
];
const following = [{ username: 'dave', profileUrl: 'https://www.instagram.com/dave' }];

describe('FollowerListView', () => {
    it('フォロワータブに全件と件数を表示し、各 ID は外部プロフィールリンク（US1）', () => {
        render(<FollowerListView followers={followers} following={following} />);

        expect(screen.getByRole('tab', { name: /フォロワー（3）/ })).toHaveAttribute('aria-selected', 'true');
        const alice = screen.getByRole('link', { name: '@alice' });
        expect(alice).toHaveAttribute('href', 'https://www.instagram.com/alice');
        expect(alice).toHaveAttribute('rel', 'noopener noreferrer');
        expect(screen.getByText('全 3 件')).toBeInTheDocument();
    });

    it('フォロワー 0 件で案内を表示する（US1）', () => {
        render(<FollowerListView followers={[]} following={following} />);
        expect(screen.getByText('フォロワーがいません。')).toBeInTheDocument();
    });

    it('フォロー中タブに切り替えると全件を表示し、aria-selected が移る（US2）', async () => {
        const user = userEvent.setup();
        render(<FollowerListView followers={followers} following={following} />);

        await user.click(screen.getByRole('tab', { name: /フォロー中（1）/ }));

        expect(screen.getByRole('tab', { name: /フォロー中（1）/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('link', { name: '@dave' })).toBeInTheDocument();
    });

    it('フォロー中が未同梱（null）ならタブに件数を出さず案内を表示する（US2）', async () => {
        const user = userEvent.setup();
        render(<FollowerListView followers={followers} following={null} />);

        const followingTab = screen.getByRole('tab', { name: 'フォロー中' });
        await user.click(followingTab);

        expect(screen.getByText(/フォロー中一覧が含まれていません/)).toBeInTheDocument();
        expect(screen.queryByLabelText('ID で絞り込む')).not.toBeInTheDocument();
    });

    it('ID の一部で絞り込むと該当のみ表示し件数が更新される（US3）', async () => {
        const user = userEvent.setup();
        render(<FollowerListView followers={followers} following={following} />);

        await user.type(screen.getByLabelText('ID で絞り込む'), 'al');

        expect(await screen.findByText('1 件表示中')).toBeInTheDocument();
        const table = screen.getByRole('table');
        expect(within(table).getByRole('link', { name: '@alice' })).toBeInTheDocument();
        expect(within(table).queryByRole('link', { name: '@bob' })).not.toBeInTheDocument();
    });

    it('大文字入力でも大文字小文字を区別せず一致する（US3）', async () => {
        const user = userEvent.setup();
        render(<FollowerListView followers={followers} following={following} />);

        await user.type(screen.getByLabelText('ID で絞り込む'), 'BOB');

        expect(await screen.findByRole('link', { name: '@bob' })).toBeInTheDocument();
    });

    it('該当なしの語では「該当する ID がありません」（US3）', async () => {
        const user = userEvent.setup();
        render(<FollowerListView followers={followers} following={following} />);

        await user.type(screen.getByLabelText('ID で絞り込む'), 'zzz');

        expect(await screen.findByText('該当する ID がありません。')).toBeInTheDocument();
    });

    it('検索語をクリアすると全件表示に戻る（US3）', async () => {
        const user = userEvent.setup();
        render(<FollowerListView followers={followers} following={following} />);

        const input = screen.getByLabelText('ID で絞り込む');
        await user.type(input, 'al');
        await screen.findByText('1 件表示中');
        await user.clear(input);

        expect(await screen.findByText('全 3 件')).toBeInTheDocument();
    });
});
