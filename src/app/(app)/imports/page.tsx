import { ImportsPageContent } from '@/features/follower-import';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { generatePageMetadata } from '@/shared/config/metadata';

export const metadata = generatePageMetadata(
    {
        slug: '/imports',
        title: 'フォロワーインポート',
        description: 'Instagram データエクスポートからフォロワー一覧を取り込みます',
    },
    { noIndex: true },
);

/** インポート画面（アップロード + 履歴 / screens/admin-shell.md） */
export default function ImportsPage() {
    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <PageHeader title="フォロワーインポート" />
            <ImportsPageContent />
        </div>
    );
}
