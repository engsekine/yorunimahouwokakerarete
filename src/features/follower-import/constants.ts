/**
 * 取り込み対象ファイル（JSON / HTML）の上限（bytes）。ZIP は必要ファイルだけをブラウザ内で展開するため
 * ZIP 自体は上限の対象外（展開後サイズは MAX_UNCOMPRESSED_BYTES で制限する）
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * ZIP を展開する際の展開後サイズ上限（bytes・対象ファイルの合計）。
 * 高圧縮率の ZIP 爆弾（数 MB → 数 GB）でブラウザのメモリを枯渇させる入力を防ぐ。
 * 実データの JSON は圧縮率 5〜10 倍程度なので、上限（10MB）の 10 倍を許容する
 */
export const MAX_UNCOMPRESSED_BYTES = MAX_UPLOAD_BYTES * 10;

/** 対象アカウント名の最大長（Instagram のユーザーネーム上限と同じ） */
export const MAX_ACCOUNT_USERNAME_LENGTH = 30;

/**
 * 保存しておく取り込み記録の上限（最新 + 前回）。比較に必要なのは直近 2 件だけであり、
 * ブラウザ保存（localStorage・5MB 前後）を恒常的に収めるため、超えた分は保存時に古い順で置き換える（007 FR-004）
 */
export const MAX_RETAINED_IMPORTS = 2;

/** 一覧種別 */
export type ImportEntryKind = 'follower' | 'following';

/** 取り込み対象ファイルの案内（形式不正時・FR-008） */
export const UPLOAD_TARGET_GUIDE =
    'エクスポート ZIP をそのまま、または解凍した connections/followers_and_following フォルダ内のフォロワー / フォロー中ファイル（followers_1.json・following.json など）をアップロードしてください。';

/** アカウントセンターからデバイスへエクスポートする手順（インポート画面の案内） */
export const EXPORT_GUIDE_TITLE = 'アカウントセンターからデバイスに Instagram の情報をエクスポートする';

/** 手順の切り替え単位（PC ブラウザ / スマートフォンアプリ） */
export type ExportGuideDevice = 'pc' | 'sp';

/** 手順タブの並び順とラベル。先頭が既定タブ */
export const EXPORT_GUIDE_DEVICES: readonly { id: ExportGuideDevice; label: string }[] = [
    { id: 'pc', label: 'PC（ブラウザ）' },
    { id: 'sp', label: 'スマートフォン（アプリ）' },
];

/** 端末別のエクスポート手順。操作の呼び方（クリック / タップ）と導線が異なる部分だけ書き分ける */
export const EXPORT_GUIDE_STEPS: Record<ExportGuideDevice, readonly string[]> = {
    pc: [
        '左下の [その他] アイコン（ハンバーガーメニュー）をクリックし、[設定] をクリックします。',
        '[アカウントセンター] をクリックしてから、[あなたの情報とアクセス許可] をクリックします。',
        '[あなたの情報をエクスポート] をクリックします。',
        '[エクスポートを作成] をクリックします。',
        '情報をエクスポートするプロフィールを選択します。',
        '[次へ] をクリックします。',
        '[デバイスにエクスポート] を選択します。',
        '情報をカスタマイズでは「フォロワー」と「フォロー中」だけをチェックします。',
        '期間は「全期間」を選択します。',
        'フォーマットは「JSON」を選択します。',
        'メディアの画質は「低画質」を選択します。',
        'エクスポートをカスタマイズしたら、[エクスポートを開始] をクリックします。',
        '届いた ZIP ファイルをそのまま下のフォームから取り込みます（解凍して connections/followers_and_following フォルダ内の followers_1.json と following.json などを選んでも取り込めます）。',
    ],
    sp: [
        'Instagram アプリでプロフィール画面を開き、右上の [≡]（メニュー）をタップして [設定とアクティビティ] を開きます。',
        '一番上の [アカウントセンター] をタップし、[あなたの情報とアクセス許可] をタップします。',
        '[あなたの情報をエクスポート] をタップします。',
        '[エクスポートを作成] をタップします。',
        '情報をエクスポートするプロフィールを選択し、[次へ] をタップします。',
        '[デバイスにエクスポート] を選択します。',
        '情報をカスタマイズでは「フォロワー」と「フォロー中」だけをチェックします。',
        '期間は「全期間」、フォーマットは「JSON」、メディアの画質は「低画質」を選択します。',
        '[エクスポートを開始] をタップします。準備ができるとアプリの通知（またはメール）で知らされます。',
        '通知が届いたら、同じ [あなたの情報をエクスポート] の画面から [ダウンロード] をタップし、ZIP ファイルを端末に保存します（iPhone は「ファイル」アプリ、Android は「ダウンロード」フォルダに保存されます）。',
        'このページをスマートフォンのブラウザで開き、下のフォームから保存した ZIP ファイルを選んで取り込みます。解凍は不要です。',
    ],
};

/** エクスポートは作成時点の内容しか含まないため、最新化には再作成が必要である旨の注釈（インポート画面） */
export const EXPORT_REFRESH_NOTE =
    '最新のデータを取得するには、エクスポートを 1 からやり直してください。以前に作成したエクスポートには、その作成時点のフォロワー・フォロー中しか含まれません。';

/** 共用パソコンでの取り込みを避ける注意（インポート画面・ホームの注意文と同旨）。データは手動で削除するまで残るため */
export const SHARED_DEVICE_WARNING =
    '公共の施設・職場・学校などの共用パソコンや、他の人と共有しているブラウザでは取り込みを行わないでください。取り込んだデータは自動では消えず、ホームの「取り込んだデータをすべて削除」で手動で削除するまでそのブラウザに残り続けます。';

/** ファイルの内容はブラウザ内で解析・保存され、外部へ送信されない旨の案内（インポート画面） */
export const BROWSER_STORAGE_GUIDE =
    'ZIP からは必要なフォロワー・フォロー中の情報だけがブラウザ内で取り出されるため、サイズの大きいエクスポートでもそのまま取り込めます。ファイルの内容はどこにも送信されず、取り込んだ一覧はこのブラウザにのみ保存されます。取り込むと前回との差分（増えた相手・外した相手）が確認できます。フォロワー / フォロー中ファイルの上限は 10MB です。';

export const IMPORT_ERROR_MESSAGES = {
    too_large:
        'ファイルサイズが上限（10MB）を超えています。followers_and_following フォルダ内のフォロワー / フォロー中ファイルのみを選択してください。',
    invalid_export: `フォロワー一覧が見つかりませんでした。${UPLOAD_TARGET_GUIDE}`,
    zip_too_large:
        'ZIP の展開後サイズが大きすぎます。解凍して followers_and_following フォルダ内のフォロワー / フォロー中ファイルのみを選択してください。',
    account_username_too_long: `アカウント名は ${MAX_ACCOUNT_USERNAME_LENGTH} 文字以内で入力してください。`,
    account_mismatch:
        'エクスポートに含まれる本人のアカウント名と入力したアカウント ID が異なります。入力ミスでなければ、チェックを入れて再実行してください。',
    upload_failed: '取り込みに失敗しました。時間をおいて再度お試しください。',
    storage_full:
        'ブラウザの保存容量の上限に達したため取り込めませんでした。不要な取り込みを履歴から削除してから、もう一度お試しください。',
    storage_unavailable:
        'ブラウザの保存領域を利用できないため取り込めませんでした。プライベートブラウズを解除するか、サイトデータの保存を許可してください。',
} as const;

/**
 * 別アカウントの記録が保存されている状態での取り込み拒否（007 FR-007）。
 * 保存済みのアカウント ID を差し込むため関数にしている
 */
export const accountConflictMessage = (storedAccountUsername: string): string =>
    `このアプリで比較できるアカウントは 1 つです。保存済みの記録は別のアカウント（@${storedAccountUsername}）のものです。取り込むには既存の記録をすべて削除する必要があります。`;

/** 保存上限に達した状態での取り込み前の案内（007 FR-006）。最も古い記録の取込日時を差し込む */
export const retentionNotice = (oldestImportedAtLabel: string): string =>
    `保存できる記録は最新と前回の ${MAX_RETAINED_IMPORTS} 件です。取り込むと最も古い記録（${oldestImportedAtLabel}）が置き換わります。`;

/** 入力中のアカウント ID が保存済みの記録と異なるときの取り込み前の案内（007 Edge Case） */
export const accountSwitchNotice = (storedAccountUsername: string): string =>
    `保存済みの記録は @${storedAccountUsername} のものです。別のアカウントで取り込むには既存の記録の削除が必要です。`;

/** エクスポートからアカウント ID を自動入力したときの通知（007 FR-012） */
export const OWNER_AUTOFILL_NOTICE = 'エクスポートからアカウント ID を自動入力しました。内容を確認してください。';

/** 比較対象がまだ無いときの案内（007 FR-003） */
export const NO_PREVIOUS_NOTICE =
    '比較対象がまだありません。次回、同じアカウント ID でエクスポートを取り込むと、増えた相手・外した相手が表示されます。';

/** 差分画面に常時表示する制約の注記（Edge Case / SC-002 の除外条件） */
export const USERNAME_CHANGE_NOTE =
    '相手がユーザーネームを変更した場合は「フォロー解除 + 新規フォロー」として表示されます（エクスポートに不変の ID が含まれないため）。';
