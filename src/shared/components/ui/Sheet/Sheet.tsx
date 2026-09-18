// shadcn / shadcn（src/components/ui） の Sheet ラッパー。アプリ側では shadcn（src/components/ui）を直接使わずここ経由で使う。
// 現状はスタイル変更なしの再 export。見た目を上書きしたくなったらこの窓口で行う（shadcn（src/components/ui） は無改変）。
export {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
