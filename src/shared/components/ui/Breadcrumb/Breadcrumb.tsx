// shadcn / shadcn（src/components/ui） の Breadcrumb ラッパー。アプリ側では shadcn（src/components/ui）を直接使わずここ経由で使う。
// 現状はスタイル変更なしの再 export。見た目を上書きしたくなったらこの窓口で行う（shadcn（src/components/ui） は無改変）。
export {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
