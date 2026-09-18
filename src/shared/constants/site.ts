import { normalizeSiteUrl } from '@/shared/lib/url';

export const SITE_NAME = 'yorunimahouwokakerarete';
export const SITE_DESCRIPTION = 'Instagram のフォロワーを管理・分析できるサービス';

/** ローカル開発・環境変数未設定時の既定 URL */
const DEFAULT_SITE_URL = 'http://localhost:3000';

/**
 * サイトのオリジン（metadataBase / sitemap / JSON-LD の起点）。
 * `NEXT_PUBLIC_SITE_URL` はドメインだけ・末尾スラッシュ付きでも受け付け、必ず有効な URL に正規化する
 * （不正な値のままだと `new URL()` がビルド時に例外を投げ、デプロイが失敗するため）
 */
export const SITE_URL = normalizeSiteUrl(process.env['NEXT_PUBLIC_SITE_URL'], DEFAULT_SITE_URL);
export const COPYRIGHT_HOLDER = 'yorunimahouwokakerarete';
