'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { DataTable, type DataTableColumn } from '@/shared/components/data/DataTable';
import { FormField } from '@/shared/components/form';

export interface FollowerListEntry {
    username: string;
    profileUrl: string;
}

interface FollowerListViewProps {
    followers: FollowerListEntry[];
    /** null = この取り込みにフォロー中一覧が含まれない（フォロワーのみ） */
    following: FollowerListEntry[] | null;
}

type TabKey = 'follower' | 'following';

const columns: DataTableColumn<FollowerListEntry>[] = [
    {
        header: 'ユーザー ID',
        cell: (row) => (
            <a
                href={row.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline hover:text-foreground"
            >
                @{row.username}
            </a>
        ),
    },
];

/**
 * 取り込みのフォロワー / フォロー中の ID 一覧（005）。
 * タブ切替 + ID 部分一致の絞り込み検索（大文字小文字非区別・デバウンス）。
 */
export const FollowerListView = ({ followers, following }: FollowerListViewProps) => {
    const [activeTab, setActiveTab] = useState<TabKey>('follower');
    const [searchInput, setSearchInput] = useState('');
    const [query, setQuery] = useState('');

    /** 入力のデバウンス（大量一覧で入力ごとの再フィルタを抑える） */
    useEffect(() => {
        const timer = setTimeout(() => setQuery(searchInput.trim().toLowerCase()), 150);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const activeList = activeTab === 'follower' ? followers : following;

    const filtered = useMemo(() => {
        if (!activeList) return [];
        if (query === '') return activeList;
        return activeList.filter((entry) => entry.username.includes(query));
    }, [activeList, query]);

    const followingUnavailable = following === null;

    const renderTab = (key: TabKey, label: string, count: number | null) => (
        <button
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            id={`follower-list-tab-${key}`}
            aria-controls={`follower-list-panel-${key}`}
            onClick={() => {
                setActiveTab(key);
                setSearchInput('');
            }}
            className={cn(
                'border-b-2 px-3 py-2 text-sm transition-colors',
                activeTab === key
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
        >
            {count === null ? label : `${label}（${count.toLocaleString('ja-JP')}）`}
        </button>
    );

    const countLabel =
        query === ''
            ? `全 ${filtered.length.toLocaleString('ja-JP')} 件`
            : `${filtered.length.toLocaleString('ja-JP')} 件表示中`;

    return (
        <div className="flex flex-col gap-4">
            <div role="tablist" aria-label="一覧の種別" className="flex gap-1 border-border border-b">
                {renderTab('follower', 'フォロワー', followers.length)}
                {renderTab('following', 'フォロー中', followingUnavailable ? null : (following?.length ?? 0))}
            </div>

            <div
                role="tabpanel"
                id={`follower-list-panel-${activeTab}`}
                aria-labelledby={`follower-list-tab-${activeTab}`}
                className="flex flex-col gap-3"
            >
                {activeTab === 'following' && followingUnavailable ? (
                    <p className="text-muted-foreground text-sm">
                        この取り込みにはフォロー中一覧が含まれていません。フォロー中を含めてエクスポートし直すと表示されます。
                    </p>
                ) : (
                    <>
                        <FormField
                            id="follower-list-search"
                            label="ID で絞り込む"
                            type="search"
                            autoComplete="off"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <p aria-live="polite" className="text-muted-foreground text-xs">
                            {countLabel}
                        </p>
                        <DataTable
                            columns={columns}
                            rows={filtered}
                            getRowKey={(row) => row.username}
                            emptyText={
                                query === ''
                                    ? activeTab === 'follower'
                                        ? 'フォロワーがいません。'
                                        : 'フォロー中がありません。'
                                    : '該当する ID がありません。'
                            }
                        />
                    </>
                )}
            </div>
        </div>
    );
};
