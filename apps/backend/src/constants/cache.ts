const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>).sort(
        ([left], [right]) => left.localeCompare(right),
    );

    return `{${entries
        .map(
            ([key, nestedValue]) =>
                `${JSON.stringify(key)}:${stableStringify(nestedValue)}`,
        )
        .join(",")}}`;
};

const buildCacheKey = (prefix: string, value?: unknown): string => {
    if (value === undefined) {
        return prefix;
    }

    return `${prefix}.${stableStringify(value)}`;
};

const STOP_CACHE_PREFIX = "stop.v4";

export const uniqueStrings = <Value extends string>(
    values: readonly Value[],
): Value[] => {
    return [...new Set(values)];
};

export const uniqueSortedStrings = <Value extends string>(
    values: readonly Value[],
): Value[] => {
    return uniqueStrings(values).sort((left, right) =>
        left.localeCompare(right),
    );
};

export const CACHE_KEYS = {
    infotexts: {
        getAll: "infotexts.getAll",
    },
    golemio: {
        getGolemioData: (url: string) =>
            buildCacheKey("golemio.getGolemioData", url),
    },
    platform: {
        getAllGraphQL: (params: unknown) =>
            buildCacheKey("platform.getAllGraphQL", params),
        getGraphQLById: (id: string) =>
            buildCacheKey("platform.getGraphQLById", id),
        getOne: (params: unknown) => buildCacheKey("platform.getOne", params),
    },
    route: {
        getManyGraphQL: (params: unknown) =>
            buildCacheKey("route.getManyGraphQL", params),
        getManyGraphQLByPlatformId: (platformId: string) =>
            buildCacheKey("route.getManyGraphQLByPlatformId", platformId),
        getOneGraphQL: (id: string) => buildCacheKey("route.getOneGraphQL", id),
    },
    status: {
        getDbDataStatus: "status.getDbDataStatus",
        getGeoFunctionsStatus: "status.getGeoFunctionsStatus",
    },
    stop: {
        getAll: (params: unknown) =>
            buildCacheKey(`${STOP_CACHE_PREFIX}.getAll`, params),
        getAllGraphQL: (params: unknown) =>
            buildCacheKey(`${STOP_CACHE_PREFIX}.getAllGraphQL`, params),
        getGraphQLById: (id: string) =>
            buildCacheKey(`${STOP_CACHE_PREFIX}.getGraphQLById`, id),
        getOne: (params: unknown) =>
            buildCacheKey(`${STOP_CACHE_PREFIX}.getOne`, params),
    },
};

export const MAX_CACHE_TTL_MS = 36 * 3600 * 1000;

export const ttl = ({
    hours = 0,
    minutes = 0,
    seconds = 0,
}: {
    hours?: number;
    minutes?: number;
    seconds?: number;
}) => {
    if (hours + minutes + seconds === 0) {
        throw new Error("ttl: cannot be 0");
    }

    const ttlMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

    if (ttlMs > MAX_CACHE_TTL_MS) {
        throw new Error("ttl: cannot exceed 36 hours");
    }

    return ttlMs;
};

export const CACHE_TTL = {
    routeData: ttl({ hours: 36 }),
    stopData: ttl({ hours: 36 }),
    platformData: ttl({ hours: 36 }),
    infotexts: ttl({ minutes: 5 }),
    golemioDepartureBoards: ttl({ seconds: 10 }),
    golemioDefault: ttl({ seconds: 30 }),
    statusChecks: ttl({ seconds: 30 }),
};
