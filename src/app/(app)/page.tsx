import { DashboardWidgets } from '@/features/dashboard';
import { DeleteAllImportsButton } from '@/features/follower-import';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/surface/Card';
import { Notice } from '@/shared/components/surface/Notice';
import { generatePageMetadata } from '@/shared/config/metadata';
import { SITE_DESCRIPTION } from '@/shared/constants/site';

export const metadata = generatePageMetadata({
    slug: '/',
    title: 'ホーム',
    description: SITE_DESCRIPTION,
});

/**
 * ホーム（トップ `/`）。管理画面シェル配下のダッシュボードで、各機能の要約ウィジェットを並べる（004 / FR-005）。
 * ログイン不要でこの画面に直接到達する（006 / US1）ため、データがブラウザ内（localStorage）にのみ
 * 保存されることの注意をここで最初に伝える。
 * データはブラウザ保存から Client 側で読むため、ウィジェット群は Client Component に委ねる。
 * ウィジェットの下に取り込んだデータの全削除（確認ステップ付き）を置き、利用者が自分でデータを消せるようにする。
 * 末尾に「フォロワー数がわかる仕組み」（エクスポートの一覧を数える・前回一覧と照合する）の説明を置き、数字の出どころへの疑問に答える。
 */
export default function HomePage() {
    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <PageHeader title="ホーム" description={`${SITE_DESCRIPTION}。アカウント登録は不要です。`} />
            <Notice variant="info">
                <p className="font-bold">データの取り扱いについて</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>
                        取り込んだデータは、お使いのブラウザ内（localStorage）にのみ保存されます。サーバーには一切送信・保存されません。
                    </li>
                    <li>
                        運営側による利用者データの収集・解析・アクセス解析（トラッキング）は行っていません。運営側が取り込んだ内容を見ることもできません。
                    </li>
                    <li>
                        公共の施設・職場・学校などの共用パソコンや、他の人と共有しているブラウザでは、エクスポートの取り込みを行わないでください。取り込んだデータは自動では消えず、下の「取り込んだデータをすべて削除」で手動で削除するまでそのブラウザに残り続けます。
                    </li>
                    <li>別のブラウザ・端末には引き継がれず、ブラウザのサイトデータを消去すると失われます。</li>
                    <li>大切なデータは元のエクスポートファイルを手元に残しておいてください。</li>
                </ul>
            </Notice>
            <DashboardWidgets />
            <Card title="取り込んだデータの削除">
                <p className="text-muted-foreground text-sm">
                    このブラウザに保存されているフォロワーインポートのデータ（取り込み履歴とフォロワー一覧）をすべて削除します。
                    削除したデータは元に戻せません。再び利用する場合は、エクスポートファイルをもう一度取り込んでください。
                </p>
                <DeleteAllImportsButton />
            </Card>
            <Card title="フォロワー数がわかる仕組み">
                <ul className="list-disc space-y-2 pl-5 text-foreground text-sm">
                    <li>
                        このアプリは Instagram にログインしたり、Instagram の API
                        に接続したりはしていません。フォロワー数などの数字の元になるのは、あなた自身が Instagram
                        のアカウントセンターからエクスポートしたデータです。
                    </li>
                    <li>
                        エクスポートの ZIP
                        には、フォロワーとフォロー中の一覧（ユーザーネームの一覧）を記録したファイル（connections/followers_and_following
                        フォルダ内の followers_1.json・following.json
                        など）が含まれています。取り込むと、このファイルをブラウザ内で読み取って一覧を保存します。
                        フォロワー数・フォロー中の数は、この一覧に載っている人数をそのまま数えたものです。
                    </li>
                    <li>
                        同じアカウント ID で 2
                        回目以降のエクスポートを取り込むと、前回保存した一覧と今回の一覧をユーザーネーム単位で照らし合わせます。
                        今回だけにいる相手が「増えた相手」、前回だけにいた相手が「外した相手」で、その差がフォロワー数の増減です。
                    </li>
                    <li>
                        数字はエクスポートを作成した時点のものです。最新の状態を知りたいときは、Instagram
                        でエクスポートを作り直してから取り込んでください。
                    </li>
                </ul>
            </Card>
        </div>
    );
}
