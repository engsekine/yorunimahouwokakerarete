/**
 * ブラウザ保存（localStorage）の薄いラッパー。
 *
 * 本アプリはサーバー側に DB を持たず、取り込みデータはすべて
 * 利用者のブラウザ（localStorage）に保存する。キーはアプリ名のプレフィックスで名前空間を分け、
 * JSON のシリアライズ・容量超過（QuotaExceededError）の判定・複数キーの原子的な書き込みをここに集約する。
 * SSR（window 無し）や localStorage 無効化環境では StorageUnavailableError を投げ、呼び出し側で案内に変換する。
 */

/** localStorage のキーに付けるアプリ固有のプレフィックス（他サイト・他アプリとの衝突防止） */
export const STORAGE_PREFIX = 'yorunimahouwokakerarete:';

/** localStorage に到達できない（SSR・プライベートモードでのブロック等） */
export class StorageUnavailableError extends Error {
    constructor(message = 'ブラウザの保存領域（localStorage）を利用できません') {
        super(message);
        this.name = 'StorageUnavailableError';
    }
}

/** 保存容量の上限に達した（QuotaExceededError） */
export class StorageQuotaError extends Error {
    constructor(message = 'ブラウザの保存容量の上限に達しました') {
        super(message);
        this.name = 'StorageQuotaError';
    }
}

/** 名前（プレフィックス無し）からフルキーを組み立てる */
export const storageKey = (name: string): string => `${STORAGE_PREFIX}${name}`;

const getStorage = (): Storage => {
    if (typeof window === 'undefined') throw new StorageUnavailableError();
    try {
        const storage = window.localStorage;
        if (!storage) throw new StorageUnavailableError();
        return storage;
    } catch (error) {
        if (error instanceof StorageUnavailableError) throw error;
        /** Safari のプライベートモード等では localStorage への参照自体が例外になる */
        throw new StorageUnavailableError();
    }
};

/**
 * 容量超過エラーか。ブラウザ間で name / code が異なる（Firefox は NS_ERROR_DOM_QUOTA_REACHED・code 1014）ため
 * 両方を見る
 */
export const isQuotaExceededError = (error: unknown): boolean => {
    if (!(error instanceof DOMException)) return false;
    return (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014
    );
};

/** JSON を読み出す。未保存・解析不能（破損）は null を返す */
export const readJson = <T>(name: string): T | null => {
    const raw = getStorage().getItem(storageKey(name));
    if (raw === null) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

/** JSON を保存する。容量超過は StorageQuotaError に変換する */
export const writeJson = (name: string, value: unknown): void => {
    try {
        getStorage().setItem(storageKey(name), JSON.stringify(value));
    } catch (error) {
        if (isQuotaExceededError(error)) throw new StorageQuotaError();
        throw error;
    }
};

export const removeItem = (name: string): void => {
    getStorage().removeItem(storageKey(name));
};

/** 指定の名前プレフィックスで始まるキーの名前（アプリプレフィックス無し）を列挙する */
export const listNames = (namePrefix = ''): string[] => {
    const storage = getStorage();
    const fullPrefix = storageKey(namePrefix);
    const names: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key?.startsWith(fullPrefix)) names.push(key.slice(STORAGE_PREFIX.length));
    }
    return names;
};

export interface StorageWrite {
    name: string;
    /** null は削除 */
    value: unknown | null;
}

/**
 * 複数キーへの書き込みを「全件成功 or 全件取り消し」にする（取り込みの原子性 / FR-009）。
 * 途中で失敗（容量超過等）した場合は、書き込み前の値へ戻してから再 throw する。
 * localStorage は同期 API のため、ロールバック中に他の書き込みが割り込むことはない。
 */
export const writeAtomically = (writes: StorageWrite[]): void => {
    const storage = getStorage();
    const previous = writes.map(({ name }) => ({ name, raw: storage.getItem(storageKey(name)) }));

    try {
        for (const { name, value } of writes) {
            if (value === null) {
                storage.removeItem(storageKey(name));
            } else {
                storage.setItem(storageKey(name), JSON.stringify(value));
            }
        }
    } catch (error) {
        for (const { name, raw } of previous) {
            if (raw === null) {
                storage.removeItem(storageKey(name));
            } else {
                storage.setItem(storageKey(name), raw);
            }
        }
        if (isQuotaExceededError(error)) throw new StorageQuotaError();
        throw error;
    }
};

/** アプリの保存データをすべて削除する（テスト・初期化用） */
export const clearAppStorage = (): void => {
    const storage = getStorage();
    for (const name of listNames()) storage.removeItem(storageKey(name));
};
