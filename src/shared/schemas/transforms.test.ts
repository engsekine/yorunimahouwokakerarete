import * as yup from 'yup';

import { optionalNumber, optionalString } from './transforms';

describe('optionalNumber', () => {
    const schema = yup.number().transform(optionalNumber).nullable();

    it('空文字を null に変換する', async () => {
        await expect(schema.validate('')).resolves.toBeNull();
    });

    it('null を null のまま受け付ける', async () => {
        await expect(schema.validate(null)).resolves.toBeNull();
    });

    it('数値文字列は数値に変換する', async () => {
        await expect(schema.validate('170.5')).resolves.toBe(170.5);
    });

    it('数値はそのまま返す', async () => {
        await expect(schema.validate(60)).resolves.toBe(60);
    });
});

describe('optionalString', () => {
    it('空文字を null に変換する', () => {
        expect(optionalString('')).toBeNull();
    });

    it('null / undefined を null に変換する', () => {
        expect(optionalString(null)).toBeNull();
        expect(optionalString(undefined)).toBeNull();
    });

    it('文字列はそのまま返す', () => {
        expect(optionalString('hello')).toBe('hello');
    });
});
