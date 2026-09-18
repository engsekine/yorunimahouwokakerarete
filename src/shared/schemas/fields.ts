import * as yup from 'yup';

/**
 * 複数フォームで共有する yup フィールド定義。
 * バリデーションメッセージの表記ゆれを防ぐため、必ずここから import する。
 */

export const emailField = yup
    .string()
    .email('正しいメールアドレスを入力してください')
    .required('メールアドレスを入力してください');

/**
 * サインアップで使う新規パスワード。
 * 方針は「長さ重視（NIST SP 800-63B 準拠）」＋ 英大文字・英小文字・数字の必須化。
 * - 最小 12 文字: Google(Chrome) / iCloud の自動生成パスワード（15〜20 文字）は通過する
 * - 最大 72 文字: bcrypt 系のハッシュは 72 バイト超を切り捨てるため、その上限に揃える
 * - 英大小 + 数字を必須。Chrome / iCloud の生成パスワードはいずれも英大小と数字を含むため通過する。
 * 記号は必須にしない（Chrome 生成パスワードは記号を含まないことがあるため）。
 */
export const passwordField = yup
    .string()
    .min(12, 'パスワードは12文字以上で入力してください')
    .max(72, 'パスワードは72文字以内で入力してください')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'パスワードは英大文字・英小文字・数字をそれぞれ含めてください',
        excludeEmptyString: true,
    })
    .required('パスワードを入力してください');
