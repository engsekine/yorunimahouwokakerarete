import { ROMAJI_PATTERN } from './patterns';

describe('ROMAJI_PATTERN', () => {
    it.each(['Yamada', 'Taro', "O'Brien", 'Anne-Marie', 'Van der Berg'])('%s にマッチする', (value) => {
        expect(ROMAJI_PATTERN.test(value)).toBe(true);
    });

    it.each(['山田', 'Yamada1', '-Yamada', ' Yamada', ''])('%s にはマッチしない', (value) => {
        expect(ROMAJI_PATTERN.test(value)).toBe(false);
    });
});
