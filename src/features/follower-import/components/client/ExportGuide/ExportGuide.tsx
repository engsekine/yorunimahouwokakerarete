'use client';

import {
    BROWSER_STORAGE_GUIDE,
    EXPORT_GUIDE_DEVICES,
    EXPORT_GUIDE_STEPS,
    EXPORT_GUIDE_TITLE,
    EXPORT_REFRESH_NOTE,
    SHARED_DEVICE_WARNING,
} from '@/features/follower-import/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/Tabs';

const DEFAULT_DEVICE = EXPORT_GUIDE_DEVICES[0]?.id ?? 'pc';

/**
 * エクスポート手順の案内（インポート画面）。
 * PC ブラウザとスマートフォンアプリで導線が異なるため、端末別の手順をタブで切り替えて表示する。
 * 手順と共用端末の注意は利用者が従う主要コンテンツなので本文色、補足（再作成の注意・ブラウザ保存の説明）だけを薄い文字にする
 */
export const ExportGuide = () => (
    <div className="flex flex-col gap-3 text-sm">
        <p className="font-medium text-foreground">{EXPORT_GUIDE_TITLE}</p>
        <Tabs defaultValue={DEFAULT_DEVICE}>
            {/* パネルはテキストのみで軽いため、矢印キーの移動と同時に切り替える（WAI-ARIA APG の自動アクティベーション） */}
            <TabsList aria-label="エクスポート手順の端末" activateOnFocus>
                {EXPORT_GUIDE_DEVICES.map((device) => (
                    <TabsTrigger key={device.id} value={device.id}>
                        {device.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            {EXPORT_GUIDE_DEVICES.map((device) => (
                <TabsContent key={device.id} value={device.id}>
                    <ol className="list-decimal space-y-1 pl-5 text-foreground">
                        {EXPORT_GUIDE_STEPS[device.id].map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </TabsContent>
            ))}
        </Tabs>
        {/* 共用端末での取り込みを避ける注意は見落とされないよう本文色・中太字で出す */}
        <p className="font-medium text-foreground">{SHARED_DEVICE_WARNING}</p>
        <p className="text-muted-foreground">{EXPORT_REFRESH_NOTE}</p>
        <p className="text-muted-foreground">{BROWSER_STORAGE_GUIDE}</p>
    </div>
);
