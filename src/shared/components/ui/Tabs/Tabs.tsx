// shadcn（src/components/ui）の Tabs ラッパー。アプリ側では shadcn を直接使わずここ経由で使う。
// 現状はスタイル変更なしの再 export。見た目を上書きしたくなったらこの窓口で行う（shadcn 側は無改変）。
export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants } from '@/components/ui/tabs';
