import {
    ReadableStream as NodeReadableStream,
    TransformStream as NodeTransformStream,
    WritableStream as NodeWritableStream,
} from 'node:stream/web';
import '@testing-library/jest-dom/vitest';

Object.defineProperty(globalThis, 'ReadableStream', {
    writable: true,
    configurable: true,
    value: NodeReadableStream,
});
Object.defineProperty(globalThis, 'WritableStream', {
    writable: true,
    configurable: true,
    value: NodeWritableStream,
});
Object.defineProperty(globalThis, 'TransformStream', {
    writable: true,
    configurable: true,
    value: NodeTransformStream,
});

/**
 * localStorage をテスト間で共有しない（jsdom の localStorage はファイル内で永続するため、
 * ブラウザ保存を扱うテストが前のテストのデータに影響されないようにする）
 */
beforeEach(() => {
    /** `@vitest-environment node` のテスト（サーバー側の検証）では Web Storage が無いためスキップする */
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
});
