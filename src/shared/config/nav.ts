import { Home, type LucideIcon, Upload } from 'lucide-react';
import type { Route } from 'next';

export interface NavItem {
    label: string;
    href: Route;
    icon: LucideIcon;
    /** アクティブ判定。exact=完全一致 / prefix=前方一致（詳細ページで親をハイライト） */
    match: 'exact' | 'prefix';
}

/**
 * 管理画面サイドバーの固定メニュー（権限別出し分けなし・004 Clarification 2026-07-17）。
 * ホーム（ダッシュボード）はトップ `/` に置く。`/` は他のすべてのパスの前方一致になるため必ず exact にする
 */
export const NAV_ITEMS: readonly NavItem[] = [
    { label: 'ホーム', href: '/', icon: Home, match: 'exact' },
    { label: 'インポート', href: '/imports', icon: Upload, match: 'prefix' },
];

/**
 * 現在のパスからアクティブなメニュー href を返す。
 * prefix 項目は詳細ページ（例 /imports/xxx）でも親（/imports）を返す。
 * 複数該当時は最長一致（より具体的なメニュー）を優先する。
 */
export const resolveActiveHref = (pathname: string, items: readonly NavItem[] = NAV_ITEMS): string | null => {
    let matched: NavItem | null = null;
    for (const item of items) {
        const hit =
            item.match === 'exact'
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (hit && (matched === null || item.href.length > matched.href.length)) {
            matched = item;
        }
    }
    return matched?.href ?? null;
};
