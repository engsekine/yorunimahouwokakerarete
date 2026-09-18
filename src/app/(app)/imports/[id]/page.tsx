import { ImportDetailContent } from '@/features/follower-import';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { generatePageMetadata } from '@/shared/config/metadata';

export const metadata = generatePageMetadata(
    {
        slug: '/imports',
        title: '取り込み結果',
        description: 'フォロワー一覧の差分・メンバー一覧を表示します',
    },
    { noIndex: true },
);

interface ImportDetailPageProps {
    params: Promise<{ id: string }>;
}

/** 差分 + 分析 + メンバー一覧画面。存在しない id は Client 側で notFound に委ねる（FR-011） */
export default async function ImportDetailPage({ params }: ImportDetailPageProps) {
    const { id } = await params;

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <PageHeader title="取り込み結果" />
            <ImportDetailContent importId={id} />
        </div>
    );
}
