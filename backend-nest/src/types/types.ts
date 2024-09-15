export type CacheManager<T> = {
    get: (key: string) => Promise<undefined | T>;
    set: (key: string, value: T, TTL?: number) => Promise<void>;
    del: (key: string) => Promise<void>;
};
