'use client';

import { NO_PREVIOUS_NOTICE, USERNAME_CHANGE_NOTE } from '@/features/follower-import/constants';
import type { DiffEntry, ImportDiff, MutualAnalysis } from '@/features/follower-import/types';
import { Heading } from '@/shared/components/typography/Heading';
import { formatJstDateTime } from '@/shared/lib/date';

interface ImportDiffViewProps {
    diff: ImportDiff;
    analysis: MutualAnalysis | null;
}

const EntryList = ({ entries, emptyText }: { entries: DiffEntry[]; emptyText: string }) => {
    if (entries.length === 0) return <p className="text-muted-foreground text-sm">{emptyText}</p>;
    return (
        <ul className="max-h-80 overflow-y-auto rounded-md border border-border p-3">
            {entries.map((entry) => (
                <li key={entry.username}>
                    <a
                        href={entry.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline hover:text-foreground"
                    >
                        @{entry.username}
                    </a>
                </li>
            ))}
        </ul>
    );
};

/** 差分（新規/解除）+ フォロー関係分析の表示（screens/imports.md） */
export const ImportDiffView = ({ diff, analysis }: ImportDiffViewProps) => {
    const followerDelta = diff.previous ? diff.current.followersCount - diff.previous.followersCount : null;

    return (
        <div className="flex flex-col gap-6">
            <p className="text-muted-foreground text-sm">
                {formatJstDateTime(diff.current.importedAt)} 取り込み / @{diff.current.accountUsername} / フォロワー{' '}
                {diff.current.followersCount.toLocaleString('ja-JP')} 人
                {followerDelta !== null && (
                    <span className="ml-1 font-medium text-foreground">
                        （前回比 {followerDelta >= 0 ? '+' : ''}
                        {followerDelta.toLocaleString('ja-JP')}）
                    </span>
                )}
            </p>

            {diff.previous === null ? (
                <p className="text-muted-foreground text-sm">{NO_PREVIOUS_NOTICE}</p>
            ) : (
                <>
                    {diff.gained.length === 0 && diff.lost.length === 0 && (
                        <p className="text-sm" role="status">
                            前回から変化はありません（差分 0 件）。
                        </p>
                    )}
                    <section className="flex flex-col gap-2">
                        <Heading level={2}>新規フォロワー（{diff.gained.length} 人）</Heading>
                        <EntryList entries={diff.gained} emptyText="新しくフォローした相手はいません。" />
                    </section>
                    <section className="flex flex-col gap-2">
                        <Heading level={2}>フォロー解除した相手（{diff.lost.length} 人）</Heading>
                        <EntryList entries={diff.lost} emptyText="フォローを外した相手はいません。" />
                    </section>
                </>
            )}

            <p className="text-muted-foreground text-xs">{USERNAME_CHANGE_NOTE}</p>

            <section className="flex flex-col gap-2">
                <Heading level={2}>フォロー関係の分析</Heading>
                {analysis === null ? (
                    <p className="text-muted-foreground text-sm">
                        フォロー中一覧が含まれていない取り込みです。エクスポートに following.json
                        を含めると、相互フォローの分析が表示されます。
                    </p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <section className="flex flex-col gap-2">
                            <Heading level={3}>
                                フォローバックされていない相手（{analysis.notFollowingBack.length} 人）
                            </Heading>
                            <EntryList
                                entries={analysis.notFollowingBack}
                                emptyText="全員があなたをフォローしています。"
                            />
                        </section>
                        <section className="flex flex-col gap-2">
                            <Heading level={3}>
                                フォローバックしていない相手（{analysis.notFollowedBack.length} 人）
                            </Heading>
                            <EntryList entries={analysis.notFollowedBack} emptyText="全員をフォローしています。" />
                        </section>
                    </div>
                )}
            </section>
        </div>
    );
};
