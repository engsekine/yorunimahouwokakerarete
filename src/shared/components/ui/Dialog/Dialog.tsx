// shadcn / shadcn（src/components/ui） の Dialog ラッパー。アプリ側では shadcn（src/components/ui）を直接使わずここ経由で使う。
// 現状はスタイル変更なしの再 export。見た目を上書きしたくなったらこの窓口で行う（shadcn（src/components/ui） は無改変）。
export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
