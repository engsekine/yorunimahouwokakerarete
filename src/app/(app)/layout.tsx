import { cookies } from 'next/headers';

import { AdminShell, SIDEBAR_COOKIE } from '@/shared/components/layout/AdminShell';

/**
 * 管理画面シェル。アプリ内の全ページを AdminShell（サイドバー + 上部バー）で包む（004 / FR-001）。
 * 認証は行わない（データは利用者のブラウザにのみ保存されるため、ログインなしで利用できる）。
 */
export default async function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    /** サイドバー折りたたみ状態を Cookie から復元（SSR 初期描画のちらつき防止 / research Decision 3） */
    const cookieStore = await cookies();
    const defaultCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === '1';

    return <AdminShell defaultCollapsed={defaultCollapsed}>{children}</AdminShell>;
}
