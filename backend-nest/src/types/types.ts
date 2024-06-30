export type MetroLine = "A" | "B" | "C";

export type Timestamp = {
    predicted: string;
    scheduled: string;
};

export type Delay = {
    is_available?: unknown;
    minutes?: unknown;
    seconds?: unknown;
};

export type CacheManager<T> = {
    get: (key: string) => Promise<undefined | T>;
    set: (key: string, value: T, TTL?: number) => Promise<void>;
    del: (key: string) => Promise<void>;
};
