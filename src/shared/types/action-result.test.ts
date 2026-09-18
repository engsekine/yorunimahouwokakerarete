import type { ActionResult } from './action-result';
import { actionFailure, actionSuccess } from './action-result';

describe('actionSuccess', () => {
    it('ペイロードなしで { success: true } を返す', () => {
        expect(actionSuccess()).toEqual({ success: true });
    });

    it('ペイロードを success: true とマージして返す', () => {
        const result = actionSuccess({ needsEmailConfirmation: true });

        expect(result).toEqual({ success: true, needsEmailConfirmation: true });
    });
});

describe('actionFailure', () => {
    it('{ success: false, error } を返す', () => {
        expect(actionFailure('エラーが発生しました')).toEqual({
            success: false,
            error: 'エラーが発生しました',
        });
    });
});

describe('ActionResult', () => {
    it('success で判別して error / ペイロードへ型安全にアクセスできる', () => {
        const results: ActionResult<{ id: string }>[] = [actionSuccess({ id: 'abc' }), actionFailure('失敗しました')];

        const messages = results.map((result) => (result.success ? result.id : result.error));

        expect(messages).toEqual(['abc', '失敗しました']);
    });
});
