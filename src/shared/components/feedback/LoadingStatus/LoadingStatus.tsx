interface LoadingStatusProps {
    /** 読み込み対象の説明（既定: 「読み込み中…」） */
    label?: string;
}

/**
 * ブラウザ保存からの読み出し中などに表示する読み込み表示。
 * role="status" で支援技術に読み込み中であることを伝える（aria-live="polite" 相当）。
 */
export const LoadingStatus = ({ label = '読み込み中…' }: LoadingStatusProps) => (
    <p role="status" className="text-muted-foreground text-sm">
        {label}
    </p>
);
