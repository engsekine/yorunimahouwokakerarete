import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, resolveActiveHref } from './nav';

describe('NAV_ITEMS', () => {
    it('ホーム（トップ） / インポートの 2 項目を持つ', () => {
        expect(NAV_ITEMS.map((i) => i.href)).toEqual(['/', '/imports']);
    });
});

describe('resolveActiveHref', () => {
    it('exact 項目（ホーム）は完全一致のときだけアクティブ', () => {
        expect(resolveActiveHref('/')).toBe('/');
        expect(resolveActiveHref('/extra')).not.toBe('/');
    });

    it('ホームは exact のため、他ページで前方一致してしまわない', () => {
        expect(resolveActiveHref('/imports')).toBe('/imports');
        expect(resolveActiveHref('/imports/abc-123')).toBe('/imports');
    });

    it('prefix 項目は自身のパスでアクティブ', () => {
        expect(resolveActiveHref('/imports')).toBe('/imports');
    });

    it('prefix 項目は詳細ページ（子パス）で親をアクティブにする', () => {
        expect(resolveActiveHref('/imports/abc-123')).toBe('/imports');
    });

    it('どのメニューにも該当しないパスは null', () => {
        expect(resolveActiveHref('/settings')).toBeNull();
    });

    it('前方一致の誤爆を避ける（/importsX は /imports にマッチしない）', () => {
        expect(resolveActiveHref('/importsX')).toBeNull();
    });
});
